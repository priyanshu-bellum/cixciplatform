# Logs And Audit File Tracking Assumptions And Open Questions

This document is proposal-level architecture. It captures assumptions, scale placeholders, unresolved decisions, and risks for the Logs & Audit File Tracking module.

## Assumptions

- ADR-0012 is the governing bounded-context decision for Logs & Audit File Tracking.
- Logs & Audit owns traceability evidence only.
- Source modules remain owners of their business records and decisions.
- Audit records, file tracking records, API transmission logs, validation results, and processing results are append-only.
- Full payload storage is exception-based and controlled by privacy, contract, file size, retention, redaction, access class, approval, and reason rules.
- Masked payload references are the default for sensitive data.
- Manual vendor file flows will exist before all API integrations are available.
- Search and filtering must respect tenant, company/entity, role, retention class, redaction class, access class, and source-module boundaries.
- Logs & Audit may emit AI signals and future Notification hooks without owning AI decisions or notification delivery.
- Logs & Audit does not own Vendor Integration behavior such as credentials, transports, endpoints, schedules, file mappings, transforms, delivery mechanics, or setup/configuration.

## Scale Assumptions

Placeholder scale dimensions to validate before implementation:

- Audit records per source module per day.
- File tracking records per vendor per day.
- Manual vendor order exports per day.
- Manual vendor return exports per day.
- Vendor shipping imports per day.
- Vendor return outcome imports per day.
- API transmission logs per source module per day.
- Validation result rows per file.
- Accepted row count per file.
- Failed row count per file.
- Row-level validation error volume.
- Retry/failure history volume.
- Payload reference storage volume.
- Masked payload reference volume.
- Full payload exception volume.
- Search query volume by internal users.
- Buyer/vendor-visible audit query volume.
- Retention review volume.
- Reprocess/retry request volume.
- Event fanout volume to AI Agent Services, Analytics, and future Notification service.

## Scalability Controls

Proposal-level controls:

- Async log ingestion.
- Backpressure for source modules and high-volume API transmission logs.
- Tenant partitioning.
- Partition audit records by tenant/company/entity, source module, date range, and retention class.
- Partition file tracking records by vendor, buyer/entity scope, source module, file type, direction, and date range.
- Hot vs cold storage placeholder for recent versus retained evidence.
- Index cardinality controls for high-cardinality search fields.
- Cursor pagination for search results.
- Controlled async export/search for large audit result sets where future policy allows.
- File size limits and payload storage limits.
- Payload storage quotas by tenant, source module, retention class, and redaction class.
- Retention cleanup jobs governed by retention class, legal/contract hold, and purge eligibility.
- Replay windows for event consumers and source-module audit recovery.
- Bulk export throttles.
- Duplicate-detection cost controls using scoped comparisons and checksum-first matching.
- Retry budgets for API transmission logging and event fanout.
- Manual review queue priority for retention review, sensitive payload exceptions, duplicate files, repeated failures, audit gaps, and reprocess requests.
- High-volume API log sampling/aggregation placeholder where allowed by audit policy.
- Aggregate AI signals for repeated failures rather than exposing unrestricted raw payloads.

## Open Questions

### Payload And Privacy

- What file types require full backup?
- What payloads must be masked?
- Which failed API calls store full payloads versus masked payload references?
- What redaction classes are required for customer, pricing, invoice, warranty, tenant, media, licensing, and commercial data?
- Who can view sensitive audit records?
- Which full payload exceptions require Compliance or Security approval?
- What payload size limits apply by source module and file type?
- What encryption/access class placeholders are required?

### Retention

- What retention periods apply by file type?
- What retention periods apply by source module?
- What retention periods apply by redaction class?
- What default retention behavior applies by file/log type?
- Who is retention owner for each record family?
- What purge eligibility rules apply under legal/contract hold?
- Can files be reprocessed from backup?
- Which retention review workflows require Compliance or Security approval?

### Vendor File Workflows

- What duplicate detection strategy is used for manual vendor uploads?
- Which manual vendor files are required at launch?
- Which vendors require API integration before manual file flows are removed?
- Which correction/reupload histories must be immutable?
- Which vendor file errors should block processing versus route to review?
- Which vendor integration behaviors belong in a future Vendor Integration module?

### Source Module Contracts

- How should audit records link to invoice evidence, routing snapshots, fulfillment evidence, and pricing snapshots?
- Which source modules are required to emit audit events synchronously versus asynchronously?
- Which source modules own file processing versus only providing source data?
- Which source module failures should create audit gap signals?
- Which source modules must approve reprocess requests before execution?

### Search And Access

- Which audit records are internal-only versus buyer/vendor-visible?
- Which search filters are available to buyer users?
- Which search filters are available to vendor users?
- Which fields should be hidden by redaction class?
- Should audit search support export, and if so who owns export tracking?
- Which global searches are allowed for approved internal roles?
- Which sensitive search queries require separate approval?

## Risks

- Logs & Audit could become an unrestricted sensitive payload data lake.
- Logs & Audit could become a business correction workflow if reprocessing mutates source records directly.
- Logs & Audit could become Vendor Integration if it owns credentials, transports, schedules, mappings, transforms, delivery mechanics, or setup/configuration.
- Logs & Audit could become Analytics if search/filtering turns into metric ownership.
- Logs & Audit could become Notification if events begin managing recipients and delivery.
- Manual vendor file workflows could create duplicate or conflicting operational updates without source-module review.
- Overly broad audit access could leak buyer, vendor, pricing, invoice, warranty, or customer data.
- High-volume API logs could overwhelm ingestion, search indexes, or storage without backpressure and retention controls.
- Duplicate detection could become expensive without scoped comparisons.

## Decisions Needed Before Implementation

- Retention class taxonomy.
- Redaction class taxonomy.
- Access class taxonomy.
- Payload backup policy.
- Masked payload reference policy.
- Full payload exception policy.
- File type taxonomy.
- Duplicate detection rules.
- Vendor file workflow launch scope.
- Search visibility by role and company/entity scope.
- Synchronous versus asynchronous audit event contracts.
- Reprocessing and correction/reupload ownership rules.
- Hot/cold storage and index strategy placeholders.
- Bulk export and replay window policy.

## Scheduled System Admin Activity Summary Evidence Assumptions and Open Questions (Cross-Module PR)

This section captures Logs & Audit File Tracking-side assumptions, open questions, and risks for the cross-module summary email hardening pass. Notification Platform Service and Analytics / Reporting carry their own sections.

### Assumptions (confirmed in scoping)

- PR-C's Logs & Audit additions are scoped to summary-specific evidence surfaces; this is not the full Logs & Audit File Tracking module hardening pass.
- Two new evidence entities (Activity Summary Generated Evidence, No-Activity Summary Suppression Evidence) follow existing Logs & Audit immutability rules.
- Activity Summary Delivery Attempt retention is via the existing Audit Record entity pattern; no new entity duplicates the delivery attempt lifecycle.
- Activity Summary Configuration lifecycle retention is via the existing Audit Record entity pattern.
- Missed Window Carry-Forward retention is via the mirrored field on Activity Summary Generated Evidence.
- Existing retention class, redaction class, access class patterns apply unmodified.
- No new retention class, redaction class, or access class is introduced.
- Phase 1 evidence is internal-scope (CIXCI System Admin only); vendor users and buyer users are excluded from visibility.
- Source-module events for the summary domain are NOT consumed directly by Logs & Audit; consumption happens via Analytics / Reporting.
- Search and retention review for the new evidence types use existing patterns.

### Open questions (resolved per scoping; Logs & Audit-side perspective)

- PR-C OQ 7 (Logs & Audit touched now additively): resolved; the two new entities and one new workflow are introduced; full hardening is a separate later area.
- PR-C OQ 11 (Logs & Audit-side Delivery Attempt Evidence is reference, not separate entity): resolved; existing Audit Record pattern used.
- PR-C OQ 13 (touch permissions.md and api-contracts.md): resolved; both files exist in Logs & Audit File Tracking; both touched.

### Risks (Logs & Audit File Tracking side)

- **R-LA-1** - PR-C does not address full Logs & Audit retention duration specification for the new evidence types. Mitigation: existing retention class patterns apply; future Logs & Audit standalone hardening PR specifies.
- **R-LA-2** - Search across long retention horizon. Mitigation: existing search patterns with rate limits and pagination apply.
- **R-LA-3** - Volume of No-Activity Summary Suppression Evidence records over time for low-activity configurations. Mitigation: existing retention review covers volume controls; future operator-surface PR may introduce "N consecutive suppressions" summarization.
- **R-LA-4** - Reference resolution failure if canonical record is missing. Mitigation: evidence record stores the reference even if resolution fails at creation time; implementation may log exception.
- **R-LA-5** - Cross-module query patterns (Logs & Audit evidence to Analytics aggregation to source fact references) require multiple queries in Phase 1. Mitigation: future operator-surface PR may introduce join-friendly indexed surfaces.
- **R-LA-6** - Amendment workflow for new evidence types is the existing Audit Amendment Workflow; not customized. Mitigation: existing workflow accepted as sufficient for Phase 1.
- **R-LA-7** - Activity Summary Delivery Attempt retention via Audit Record entity pattern may produce high event-volume Audit Records for high-frequency configurations. Mitigation: existing Audit Record retention and partitioning controls apply.

### Future-phase considerations (Logs & Audit hardening sequencing item 2)

The future Logs & Audit File Tracking standalone hardening PR (sequencing item 2 after PR-C, per the established sequence) may address:

- Retention duration specification for all evidence types including PR-C-introduced ones.
- Search index optimization for high-volume evidence types.
- Cross-module query patterns and join-friendly indexed surfaces.
- Storage mechanics (hot vs. cold storage, partitioning, retention class migration).
- Payload reference rules for new evidence types if Phase 2 wants to attach payloads.
- Operator alert thresholds for repeated suppression or repeated failures.
- Retention review workflow customization for summary-specific evidence types.
- Cross-tenant search authority for support / investigation scenarios.

PR-C does not preempt any of these. PR-C's additions are additive and follow existing patterns; the future Logs & Audit hardening pass may revisit retention, search, and storage for all evidence types including PR-C-introduced ones.

### Boundary reaffirmation

- Logs & Audit File Tracking remains evidence-only.
- No mutation of canonical records owned by Notification Platform Service or Analytics / Reporting.
- No source-module modification.
- No direct source-module event consumption for the summary domain.
- No new retention, redaction, or access class.
- Existing append-only, amendment-via-amendment-record, no-silent-rewrite rules apply to the new evidence types.

## PR-A Assumptions and Open Questions - Core Evidence Spine

This section documents PR-A's locked decisions and retained open questions. Open question classification:

- **EB** = estimate-blocker (must resolve before estimating implementation)
- **BP** = business-product (requires business/product input)
- **IM** = implementation (deferred to implementation)
- **FP** = future phase (deferred to PR-B/PR-C/PR-D/PR-E or future PR)
- **CU** = cleanup-only (cosmetic/clarification, no behavioral impact)

### PR-A locked decisions (NOT open questions; documented for traceability)

The following are LOCKED in PR-A and are not subject to debate within this PR:

1. **Generic Evidence Record entity with `evidence_type` discriminator.** Not many specialized evidence entities. (Locked PR-A.)
2. **Audit Record and Evidence Record are distinct entities.** Audit Record can exist without Evidence Record; Evidence Record always references parent Audit Record. (Locked PR-A.)
3. **Evidence Amendment Record and Evidence Supersession Record are distinct entities and distinct lifecycles.** (Locked PR-A.)
4. **External Evidence Reference is a sub-structure on Evidence Record, NOT a standalone entity.** (Locked PR-A.)
5. **Source Module Reference, Source Record Reference, Source Snapshot Reference are reference TYPES, NOT stored entities.** (Locked PR-A.)
6. **Actor Reference, Service Trigger Reference, Company Scope Reference are reference TYPES to Tenant Company records, NOT stored Logs & Audit entities.** (Locked PR-A.)
7. **`retention_class`, `redaction_class`, `access_class` are fields with enumerations; class assignment occurs at evidence creation only.** (Locked PR-A.)
8. **`legal_hold_reference` is a placeholder field; actual hold workflow is PR-D.** (Locked PR-A.)
9. **Redaction creates `redacted_view_reference`; raw evidence is preserved via `raw_evidence_reference`.** (Locked PR-A.)
10. **Evidence is append-only; prior evidence is preserved on amendment or supersession.** (Locked PR-A.)
11. **Source snapshots are minimized; full operational record copies are exceptional and gated by Full Payload Exception Record.** (Locked PR-A.)
12. **External tools never become CIXCI source of truth.** (Locked PR-A.)
13. **Source modules emit evidence at every lifecycle step (validation, preview, commit, cancel, fail, supersession), not only on successful commit.** (Locked PR-A via Evidence-Per-Lifecycle-Step Rule.)
14. **4-event inventory for PR-A: `audit.record.created`, `audit.evidence.recorded`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`.** (Locked PR-A. No per-evidence-type events.)
15. **PR-A is single-module by file touch. Source modules are NOT modified.** (Locked PR-A.)
16. **PR-A defers AI Agent evidence placeholders entirely.** Generic Evidence Record supports AI agent evidence via evidence_type later. (Locked PR-A.)
17. **PR-A defers Media-specific evidence type definitions to PR-C.** Generic spine supports them. (Locked PR-A.)
18. **Failed exports, failed imports, canceled imports create evidence.** (Locked PR-A via Evidence-Per-Lifecycle-Step Rule.)
19. **Retry / reprocess attempts link back to original evidence via Evidence Supersession Record lineage.** (Locked PR-A.)
20. **Logs & Audit is not the operational source of truth.** (Locked PR-A; reaffirms baseline.)
21. **Audit Access Record is NOT hardened by PR-A.** Existing baseline preserved; access workflows are PR-D/PR-E. (Locked PR-A.)
22. **Evidence Amendment Record canonical name standardized in PR-A naming; baseline "Audit Evidence Amendment Record" language preserved.** (Locked PR-A via Promotion-of-Naming Rule.)
23. **OpenAPI hardening deferred entirely.** `openapi-contracts.md` is NOT modified by PR-A. (Locked PR-A.)
24. **No new Tenant Company role, capability flag, scope, or permission family introduced by PR-A.** Authority flows through existing patterns. (Locked PR-A.)
25. **Evidence Integrity Hash Recording is folded into PR-A Workflow 1, NOT a separate workflow.** Periodic integrity verification is future. (Locked PR-A.)
26. **7 PR-A metadata fields added to Evidence Record per Codex cleanup directive:** `evidence_schema_version`, `captured_at`, `source_event_reference`, `correlation_reference`, `trace_reference`, `idempotency_key`, `replay_safe_dedupe_reference`. (Locked PR-A.)
27. **Lifecycle states on Evidence Record:** `active`, `superseded`, `amended_with_amendments`, `legal_hold`. (Locked PR-A.)
28. **Existing baseline redaction class values preserved verbatim.** PR-A does NOT introduce new redaction class values. (Locked PR-A.)
29. **Proposal-level retention_class values introduced in PR-A:** `transient`, `standard`, `extended`, `regulatory`, `legal_hold`, `audit_critical`. Concrete durations are PR-D. (Locked PR-A.)
30. **Proposal-level access_class values introduced in PR-A:** `public_metadata`, `buyer_visible`, `vendor_visible`, `internal_operations`, `system_admin_only`, `compliance_only`. Concrete matrix is PR-D. (Locked PR-A.)

### PR-A open questions retained (classified)

| ID | Question | Class | PR-A default / disposition | Decision by |
|---|---|---|---|---|
| OQ-LA-1 | Should source snapshots store selected metadata + hashes + references, or include limited inline payload for specific evidence_types (e.g., row counts in import evidence)? | BP | Minimization rule documented; per-evidence_type sub-payload shape is open. | PR-C |
| OQ-LA-2 | Should source snapshots be immutable forever, or governed by retention policy that can remove them while keeping the Evidence Record? | FP | Immutable until retention policy applies; PR-D defines retention duration. | PR-D |
| OQ-LA-3 | Should the `evidence_type` enumeration in PR-A include a small starter set of values, or remain entirely deferred to PR-C? | CU | PR-A documents a small starter set (`module_action_evidence`, `file_evidence`, `api_transmission_evidence`, `import_evidence`, `export_evidence`, `summary_evidence`) as examples only. Comprehensive taxonomy is PR-C. | PR-C |
| OQ-LA-4 | Should the `source_record_reference` shape be free-text or structured (module + record_type + record_id)? | IM | PR-A documents the architectural surface; structured form recommended; concrete shape is implementation-level. | Implementation |
| OQ-LA-5 | Should the `source_snapshot_reference` be a stored blob ref, an inline structured object, or a hash-only reference? | BP | PR-A allows all three; per-evidence_type defaults are PR-C decisions. | PR-C |
| OQ-LA-6 | Should Manual Product Import Evidence and API Product Import Evidence share one evidence_type with `import_method`, or separate evidence_types? | BP | Recommended: one evidence_type with `import_method` discriminator. PR-C decides. | PR-C |
| OQ-LA-7 | Should import preview cancellation be an evidence_type or a lifecycle status value on a single Import Evidence record? | BP | Recommended: lifecycle status on a single Import Evidence record. PR-C decides. | PR-C |
| OQ-LA-8 | Should canceled imports retain uploaded file and validation evidence? | BP | Yes (Evidence-Per-Lifecycle-Step Rule). Retention duration on canceled imports is a PR-D decision. | PR-A locked yes for creation; PR-D for retention |
| OQ-LA-9 | Should buyer API product exports and product file downloads share one evidence_type with `export_method` discriminator? | BP | Recommended: one evidence_type with `export_method` discriminator. PR-C decides. | PR-C |
| OQ-LA-10 | Should export payloads be stored as minimized snapshots, hashes, or references only? | BP | Minimization rule applies; per-evidence_type default is PR-C. | PR-C |
| OQ-LA-11 | Should exported SKU/media/pricing references be snapshotted at the time of export for historical proof? | BP | Recommended: yes (snapshot the references, not the full content). PR-C decides. | PR-C |
| OQ-LA-12 | Should failed export attempts create evidence even if no buyer system receives the payload? | BP | Yes (Evidence-Per-Lifecycle-Step Rule). | PR-A locked yes |
| OQ-LA-13 | Should retry/replay export attempts link back to the original export evidence? | BP | Yes (via Evidence Supersession Record lineage). | PR-A locked yes |
| OQ-LA-14 | Should buyer-triggered exports and system-triggered exports share the same evidence_type? | BP | Recommended: yes (with actor type captured in actor_reference). PR-C decides. | PR-C |
| OQ-LA-15 | Should vendor order/return email export delivery evidence be Logs-owned or Notification-Platform-owned (with Logs references)? | BP | Open. Both options architecturally valid. PR-C decides in coordination with Notification Platform Service. | PR-C |
| OQ-LA-16 | Should generated email attachment files and uploaded vendor import files share File Tracking Record? | BP | PR-B decision. | PR-B |
| OQ-LA-17 | Should failed email delivery attempts create evidence even if the vendor never receives the file? | BP | Yes (Evidence-Per-Lifecycle-Step Rule). | PR-A locked yes |
| OQ-LA-18 | Should vendor shipping/delivery/return imports share one evidence_type with `import_type` discriminator? | BP | Recommended: yes. PR-C decides. | PR-C |
| OQ-LA-19 | Should row-level validation errors be stored directly on the Evidence Record, referenced via Row-Level Validation Error Record, or summarized with hash references? | BP | Reference via existing Row-Level Validation Error Record (existing baseline). PR-C may revisit. | PR-C may revisit |
| OQ-LA-20 | Should retry/reprocess attempts on imports create a new Evidence Record (supersession) or amend the existing one? | BP | Supersession (new Evidence Record with `evidence_status = active`; prior transitions to `superseded`). | PR-A locked supersession |
| OQ-LA-21 | Should manual import and API import lifecycle states (uploaded / validating / validation_failed / preview_ready / canceled_before_commit / committed / partially_committed / failed_commit / abandoned_after_preview) each create their own Evidence Record, or update a single Import Evidence record via lifecycle state? | BP | Recommended: single Import Evidence record with lifecycle_state field updates via amendment. PR-C decides whether amendment-for-state-change is the right model or each state needs its own Evidence Record. | PR-C |
| OQ-LA-22 | Should abandoned-after-preview be detected by timeout, explicit user action, or future workflow? | BP | Implementation-level detail in Product Catalog source-module PR; PR-C may revisit. | Product Catalog source-module PR |
| OQ-LA-23 | Should vendors/buyers ever access evidence directly (vs through curated views)? | FP | Open; PR-D decides. | PR-D |
| OQ-LA-24 | Should restricted evidence be viewable only by CIXCI System Admins? | FP | Recommended: yes for `restricted_evidence = true`. PR-D decides the full access matrix. | PR-D |
| OQ-LA-25 | Should legal hold workflow be included now or PR-D? | FP | PR-D. PR-A introduces placeholder field only. | PR-D |
| OQ-LA-26 | Should periodic integrity verification (re-hash and compare) be a workflow now or future? | FP | Future. PR-A captures the hash at creation; verification workflow is future (may be PR-E or beyond). | Future |
| OQ-LA-27 | Should the evidence_status enumeration include `legal_hold` as a state, or should legal hold be a separate flag/reference that overlays evidence_status? | CU | Recommended: legal_hold is BOTH (separate `legal_hold_reference` field that overlays evidence_status, AND evidence_status MAY transition to `legal_hold` value when overlay is active). | PR-A locked both |
| OQ-LA-28 | Should redaction produce a single redacted view, multiple per-audience redacted views, or hierarchical redacted views? | FP | PR-D decides. | PR-D |
| OQ-LA-29 | Should the Source Module Reference be a closed enumeration (only known CIXCI modules), or open string? | IM | Recommended: enumerated; allow open string with warning. Implementation-level. | Implementation |
| OQ-LA-30 | Should Logs & Audit emit events synchronously with evidence creation, or asynchronously? | IM | Implementation-level. PR-A documents the architectural surface; broker mechanics are deferred. | Implementation |

### Additional PR-A assumptions

The following are assumptions PR-A makes that are not strictly open questions but are documented for traceability:

- **Assumption A-1.** Source modules will populate `source_module_reference` and `company_scope_reference` consistently. Misuse is a source-module bug, not a Logs & Audit concern.
- **Assumption A-2.** Tenant Company `check_access` patterns and existing baseline permission families cover all PR-A authority needs. PR-A does NOT need new permission families; PR-D may.
- **Assumption A-3.** The existing baseline Audit Record entity field set is preserved without rename or removal. PR-A only adds formalized references and optional `evidence_record_reference` back-link.
- **Assumption A-4.** The existing baseline File Tracking Record, Validation Result Record, Processing Result Record, Row-Level Validation Error Record, Partial File Processing Record, API Transmission Log, and vendor operational flow records remain in place. PR-B will harden File Tracking; PR-C catalogs the evidence_types for vendor operational flows.
- **Assumption A-5.** The existing baseline Full Payload Exception Record workflow remains the exception path for non-minimized snapshots. PR-A does NOT introduce a new exception path.
- **Assumption A-6.** The existing baseline AI Audit Signal Reference and Notification Hook Reference signal entities remain in place. PR-A does NOT modify them.
- **Assumption A-7.** Source modules will choose between Evidence Amendment Record (small correction) and Evidence Supersession Record (replacement after source-record correction) based on their own business logic. Logs & Audit records lineage; source modules own decisions.
- **Assumption A-8.** Source-event references travel as opaque identifiers; resolution to broker events is implementation-level.
- **Assumption A-9.** Concurrency on Evidence Amendment and Evidence Supersession is handled by implementation (last-write semantics on `evidence_status`; append-only on amendment and supersession records).
- **Assumption A-10.** PR-B (File Tracking Foundation), PR-C (Cross-Module Evidence Catalog), PR-D (Retention / Redaction / Legal Hold / Access), and PR-E (Search / Query / Review) will sequence after PR-A in that order.
- **Assumption A-11.** The future API Governance Foundation PR will harden API contracts across modules; PR-A defers OpenAPI hardening entirely.

### Open question classification summary

- **EB (estimate-blocker):** 0. PR-A is unblocked.
- **BP (business-product):** 17.
- **IM (implementation):** 3.
- **FP (future phase):** 8.
- **CU (cleanup-only):** 2.

No question is an estimate-blocker for PR-A itself. Every retained question is bounded to PR-B, PR-C, PR-D, PR-E, or implementation. PR-A's spine is the foundation; subsequent PRs and source-module hardening PRs resolve the open questions as cross-module evidence emission ramps up.

### PR-A deferral structure

For clarity, the following are explicit deferrals:

- **PR-B: File Tracking Foundation.** Uploaded files, generated files, downloaded files, import/export evidence shape under the spine, hash/integrity full hardening, duplicate detection full hardening, retry/reprocess references full hardening, generated vendor email export files, uploaded vendor import files.
- **PR-C: Cross-Module Evidence Catalog.** Comprehensive `evidence_type` taxonomy including Product Catalog manual/API product import evidence (with `import_method`), buyer API product export evidence (batch and item, with `export_method`), Order Routing vendor order/return export evidence, Fulfillment / Returns vendor shipping/delivery/return import evidence (with `import_type`), Cross-Module Summary Emails evidence (activity summary generated, no-activity summary suppression), Media evidence subtypes (upload, validation, processing, assignment, readiness, version, restriction, alias, upload-recovery), AI Agent placeholders, SLA / exception / handoff evidence references.
- **PR-D: Retention / Redaction / Legal Hold / Access.** Retention duration matrix, redaction transformation workflow, legal hold lifecycle and Legal Hold entity, access matrix (tenant / parent / child), restricted evidence view rendering, retention review workflow with audit trail.
- **PR-E: Search / Query / Review.** Admin investigation workflows, evidence retrieval, exportable audit reports, indexing / search assumptions (architectural).
- **Future phase: Periodic Integrity Verification.** Re-hash and compare workflows for stored evidence. PR-A captures the at-creation hash only.
- **Future API Governance Foundation PR + Logs-and-Audit-specific OpenAPI hardening PR.** OpenAPI hardening for `modules/logs-audit-file-tracking/openapi-contracts.md` and the Logs & Audit API surface.
- **Source-module evidence-emission PRs.** Each source module (Product Catalog, Order Routing, Fulfillment / Returns, Media / Image Asset Management, Integration Management, Notification Platform Service, AI Agent Services when built) will harden its own evidence emission in follow-up PRs, consuming the PR-A spine and the PR-C catalog.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/assumptions-open-questions.md`

> **Target file:** `modules/logs-audit-file-tracking/assumptions-open-questions.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline assumptions or PR-A assumptions).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Assumptions and Open Questions - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Assumptions and Open Questions - File Tracking Foundation

This section documents PR-B's locked decisions and retained open questions. Open question classification:

- **EB** = estimate-blocker (must resolve before estimating implementation)
- **BP** = business-product (requires business/product input)
- **IM** = implementation (deferred to implementation)
- **FP** = future phase (deferred to PR-C/PR-D/PR-E or future PR)
- **CU** = cleanup-only (cosmetic/clarification, no behavioral impact)

### PR-B locked decisions (NOT open questions; documented for traceability)

The following are LOCKED in PR-B and are not subject to debate within this PR:

1. **One hardened File Tracking Record with `file_direction` / `file_purpose` / `file_lifecycle_status` discriminators.** NOT separate Uploaded / Generated / Downloaded entities. **Locked PR-B.**
2. **`file_direction = uploaded / generated / downloaded`.** Operational direction. Three values. **Locked PR-B.**
3. **`file_purpose` proposal-level starter set (12 values):** `product_import`, `product_export`, `vendor_order_export`, `vendor_return_export`, `vendor_shipping_import`, `vendor_delivery_import`, `vendor_return_import`, `media_upload`, `invoice_export`, `report_export`, `audit_export`, `unknown_other`. **Foundation-locked PR-B; PR-C catalogs comprehensively.**
4. **`file_lifecycle_status` proposal-level starter set (17 values):** `received`, `generated`, `stored`, `queued_for_validation`, `validating`, `validation_failed`, `validation_passed`, `processing`, `processing_failed`, `processed`, `partially_processed`, `duplicate_detected`, `superseded`, `replaced`, `canceled`, `expired`, `archived`. **Foundation-locked PR-B; PR-C may revise.**
5. **File Tracking Record connects to PR-A spine via `evidence_record_reference`, `audit_record_reference`, source references, `evidence_attachment_reference`, optional `external_evidence_reference` sub-structure, actor/service/scope references, `file_storage_reference`, `file_hash_reference`, optional `file_integrity_reference`.** **Locked PR-B.**
6. **Every File Tracking Record creation invokes PR-A Workflow 1 (Generic Evidence Record Creation) with `evidence_type = file_evidence` (or a more specific PR-C-cataloged value).** **Locked PR-B.**
7. **Audit Record CAN exist without File Tracking Record. Evidence Record CAN exist without File Tracking Record. File Tracking Record ALWAYS references both Audit Record and Evidence Record.** **Locked PR-B.**
8. **Duplicate detection is tenant-scoped by default.** Cross-tenant denied. **Locked PR-B.**
9. **Duplicate detection is scoped to the same source module within tenant.** Cross-module duplicate detection NOT in PR-B scope. PR-C may revisit. **Locked PR-B.**
10. **Duplicate detection creates evidence; does NOT block source-module decisions.** Source modules decide ignore / reject / reprocess / accept / warn / block. **Locked PR-B.**
11. **Reupload creates a new File Tracking Record.** Prior record transitions to `replaced`. Original file preserved (append-only). **Locked PR-B.**
12. **Retry / reprocess that produces new evidence invokes PR-A Workflow 6 (Evidence Supersession).** Retry / reprocess that produces no new evidence appends a Reprocess / Retry Outcome Record with `outcome_status = no_new_evidence`; no Evidence Supersession. **Locked PR-B.**
13. **`file.reprocess.completed` is terminal-outcome (NOT success-only) with required `outcome_status` field.** Five values: `completed`, `failed`, `canceled`, `blocked`, `no_new_evidence`. (Codex cleanup directive.) **Locked PR-B.**
14. **Existing 11 baseline file events preserved.** PR-B adds exactly 2 new events: `file.reprocess.requested` and `file.reprocess.completed`. No per-evidence-type events. **Locked PR-B.**
15. **PR-B is single-module by file touch.** Source modules not modified. **Locked PR-B.**
16. **`openapi-contracts.md` NOT modified.** **Locked PR-B.**
17. **No new Tenant Company role, capability flag, scope, or permission family.** Existing baseline families cover PR-B authority. **Locked PR-B.**
18. **At-Creation Classification Rule (PR-A) extended to file evidence.** retention_class, redaction_class, access_class, restricted_evidence assigned at File Tracking Record creation. **Locked PR-B.**
19. **Download is foundation-only in PR-B.** Full download workflows (buyer media, Product Catalog export UX, report download UX, audit export) are PR-E or future. Download is `file_direction = downloaded` on a new File Tracking Record, NOT a lifecycle status of the source file. **Locked PR-B.**
20. **Periodic file integrity verification is future phase.** `file_hash_reference` captured at creation only; `file_integrity_reference` optional. **Locked PR-B.**
21. **Existing baseline immutability rules preserved.** All hardened entities remain append-only. **Locked PR-B.**
22. **Existing baseline Full Payload Exception Record preserved.** PR-B Workflow 10 clarifies relationship; entity NOT modified. **Locked PR-B.**
23. **Existing baseline Audit Access Record preserved.** NOT hardened in PR-B (PR-A scope; PR-D / PR-E will). **Locked PR-B.**
24. **Legacy/baseline `file_direction: import or export` wording preserved verbatim.** PR-B's normalized `file_direction` is operational direction. Implementation-level naming reconciliation is deferred. (Codex cleanup directive.) **Locked PR-B.**
25. **File-level lineage and evidence-level lineage are distinct but may coexist.** Source modules decide whether reupload also triggers Evidence Supersession. **Locked PR-B.**
26. **Standalone Uploaded / Generated / Downloaded entities NOT introduced.** file_direction discriminator handles them. **Locked PR-B.**
27. **Standalone Product Import / Product Export / Vendor Email Export / Vendor Import / AI Agent File evidence entities NOT introduced.** file_purpose + PR-C catalog handles them. **Locked PR-B.**
28. **Reprocess / Retry Outcome Record formalized as narrow child/outcome record** tied to a Reprocess / Retry Request Record with explicit `outcome_status` enumeration. **Locked PR-B.**

### PR-B open questions retained (classified)

| ID | Question | Class | PR-B default / disposition | Decision by |
|---|---|---|---|---|
| OQ-FB-1 | Should `imported` and `exported` be file_direction values or stay as file_purpose semantics? | BP | PR-B keeps file_direction = uploaded/generated/downloaded; "import" and "export" semantics live in file_purpose. Existing baseline import/export language preserved as legacy. | PR-B locked file_purpose; PR-C may revisit |
| OQ-FB-2 | Should `downloaded` be a file_lifecycle_status value, an event type, or only a file_direction value? | BP | PR-B treats download as audit-worthy action (file_direction = downloaded on a new File Tracking Record). | PR-B locked; PR-E may revisit for buyer download UX |
| OQ-FB-3 | What exact file_lifecycle_status values should PR-B standardize? | BP | PR-B locks an initial proposal-level set of 17 values. PR-C may add or revise values as source-module hardening surfaces gaps. | PR-B foundation locked; PR-C may extend |
| OQ-FB-4 | Should retry outcome remain a Reprocess / Retry Outcome Record (existing baseline, formalized in PR-B) or be promoted to a richer entity? | FP | Existing baseline preserved and formalized as narrow child/outcome record. PR-C may evaluate richer outcome semantics. | PR-C may revisit |
| OQ-FB-5 | How much file integrity checking is PR-B versus future periodic integrity verification? | FP | PR-B captures hash at creation only. Periodic re-hash and compare is future (likely PR-E or beyond). | Future phase |
| OQ-FB-6 | Should uploaded / generated / downloaded be separate entities later if reporting needs demand it? | BP | PR-B does NOT split. Discriminator pattern is sufficient. If reporting needs surface, Analytics module would build dashboards from File Tracking Record queries. | PR-C may revisit if proven inadequate |
| OQ-FB-7 | Should duplicate detection ever be cross-module (across source modules within a tenant)? | BP | PR-B keeps duplicate detection scoped to the same source module. Cross-module duplicate detection is unusual and risky. | PR-C may revisit |
| OQ-FB-8 | Should duplicate detection block, warn, or link? | BP | PR-B locks: duplicate detection creates evidence (links). Source modules decide whether to block, warn, or accept. | PR-B locked |
| OQ-FB-9 | Should reupload always create a new File Tracking Record? | BP | Yes (PR-B locked). Append-only discipline. | PR-B locked |
| OQ-FB-10 | Should old files transition to `replaced`, `superseded`, or `archived` after reupload? | CU | PR-B locks: `replaced` for file-level lineage (Correction / Reupload History Record); `superseded` for evidence-level lineage (Evidence Supersession Record); both may coexist. `archived` is a separate terminal state (retention-driven). | PR-B locked |
| OQ-FB-11 | Should file replacement also create Evidence Supersession Record automatically? | BP | No automatic creation. Source modules decide. PR-B Workflow 7 documents the relationship; source modules choose to invoke PR-A Workflow 6 when the underlying operational record was also corrected. | PR-B locked |
| OQ-FB-12 | Should retry / reprocess create a new File Tracking Record or update lifecycle status on the existing one? | BP | PR-B locks: where the retry produces a new file artifact, new File Tracking Record is created; where the retry only re-processes the same file, lifecycle status updates on the existing record (e.g., processing -> processing_failed -> processing -> processed). | PR-B locked |
| OQ-FB-13 | Should downloaded file tracking be tied to Evidence Access Record, PR-E, or remain File Tracking only? | FP | PR-B keeps it as File Tracking Record (`file_direction = downloaded`). Evidence Access Record relationship is PR-D / PR-E. | PR-D / PR-E |
| OQ-FB-14 | Should generated vendor email export file delivery evidence belong to Notification Platform Service / Integration Management (with Logs references) or Logs & Audit File Tracking? | BP | Open. PR-B supports both via External Evidence Reference sub-structure on File Tracking Record. PR-C decides in coordination with Notification Platform Service. | PR-C |
| OQ-FB-15 | Should product export / download files be cataloged in PR-C rather than PR-B? | BP | Yes. PR-B provides foundation (file_purpose = product_export); PR-C catalogs evidence_type values with `export_method` discriminator (API, file_download, etc.). | PR-C |
| OQ-FB-16 | Should `file.downloaded` (existing baseline placeholder) be promoted to a full event or remain a placeholder? | CU | PR-B keeps it as the existing baseline placeholder. Full download event semantics are PR-E. | PR-E may revisit |
| OQ-FB-17 | Should `file.reprocess.requested` and `file.reprocess.completed` (PR-B additive events) replace `file.processing.retry_scheduled` (existing baseline) or coexist? | CU | Coexist. `file.processing.retry_scheduled` covers automatic processing retries; PR-B's `file.reprocess.requested` / `.completed` cover explicit reprocess request lifecycle. | PR-B locked coexist |
| OQ-FB-18 | Should File Tracking Record carry `file_integrity_reference` at creation (PR-B) or only after a future integrity check workflow exists? | IM | PR-B introduces the optional field. Populated only when integrity metadata is available at creation. Periodic integrity check is future. | Implementation |
| OQ-FB-19 | Should existing baseline Vendor Manual Order Export Record etc. be deprecated in favor of file_direction / file_purpose discipline? | CU | No deprecation in PR-B. Existing baseline entities preserved verbatim. PR-C may consolidate or refine. | PR-C may revisit |
| OQ-FB-20 | Should `evidence_attachment_reference` (PR-A) on Evidence Record be paired with File Tracking Record via the new spine integration, or remain independent? | IM | PR-B documents the relationship: an Evidence Record's `evidence_attachment_reference` may reference a File Tracking Record's `file_storage_reference`. Concrete linkage shape is implementation-level. | Implementation |
| OQ-FB-21 | Should source modules be required to emit `source_event_reference` (PR-A) on file-related Evidence Records? | IM | Recommended yes when the file activity is triggered by another broker event; null otherwise. PR-B documents the architectural recommendation. | Implementation |
| OQ-FB-22 | Should buyer-triggered downloads share the same file_purpose as system-triggered downloads? | BP | Recommended: yes, file_purpose stays the same; actor_reference (buyer user vs system service) carries the trigger semantics. | PR-C may revisit |
| OQ-FB-23 | Should the existing baseline `file.downloaded` placeholder event be promoted to two events (e.g., `file.download.requested`, `file.download.completed`)? | FP | No in PR-B. Full download semantics are PR-E. | PR-E |
| OQ-FB-24 | Should File Tracking Record's `file_lifecycle_status = canceled` cover all cancellation paths (cancelled-before-validation, cancelled-during-processing, cancelled-after-partial-commit)? | BP | PR-B uses a single `canceled` status as foundation; PR-C may refine into sub-states per source-module needs. | PR-C |
| OQ-FB-25 | Should Reprocess / Retry Outcome Record carry `prior_evidence_record_reference` and `new_evidence_record_reference` when supersession applies? | IM | Yes. PR-B documents the architectural fields. | Implementation (and confirmed in PR-B data model) |
| OQ-FB-26 | Should the existing baseline Validation Result Record and Processing Result Record themselves conform to the PR-A Evidence Record spine (i.e., be Evidence Records with `evidence_type = validation_result` and `evidence_type = processing_result`)? | BP | Open. PR-B does NOT modify Validation Result Record or Processing Result Record. PR-C may catalog as evidence_type values; PR-B leaves them as existing baseline. | PR-C |
| OQ-FB-27 | Should download events be subject to additional access auditing (Audit Access Record creation per download)? | FP | Audit Access Record is not hardened in PR-B (PR-A scope). PR-D / PR-E will decide. | PR-D / PR-E |
| OQ-FB-28 | Should `file.duplicate.detected` event carry the comparison fields (checksum, file name, vendor, buyer/entity scope, date range, file type, source module match indicators) explicitly? | IM | Yes recommended. PR-B documents architectural payload; concrete schema is implementation-level. | Implementation |
| OQ-FB-29 | Should the `file_integrity_reference` field on File Tracking Record be an enumeration of integrity status (`verified`, `pending`, `failed`) or a reference to a future Integrity Check Record entity? | FP | PR-B introduces it as an opaque reference. Concrete shape is future. | Future phase |
| OQ-FB-30 | Should the new normalized `file_direction` field name conflict with the existing baseline `file_direction` (import/export) be resolved by renaming, dual-field naming, or value mapping? | IM | Implementation-level. PR-B documents the architectural surface (two distinct semantics: data-flow direction and operational direction). Implementation may use different field names or value mapping. PR-B does NOT force a premature rename per Legacy-File-Direction-Preservation Rule. | Implementation |
| OQ-FB-31 | Should the `outcome_status` enumeration on Reprocess / Retry Outcome Record be extensible (allowing source modules to add custom outcome statuses)? | BP | No. PR-B locks the five values. Subscribers must handle all five. Extensions would require PR-C or future PR. | PR-B locked |
| OQ-FB-32 | Should reprocess outcome `outcome_status = failed` produce a new failure Evidence Record (triggering Evidence Supersession) or only the Outcome Record? | BP | Source modules decide. PR-B's Outcome Record supports either pattern via `new_evidence_record_reference` (populated or null). | PR-B locked source-module decision |
| OQ-FB-33 | Should historical existing baseline File Tracking Records (created before PR-B) be backfilled with the new spine integration references? | IM | Implementation-level migration strategy (backfill, lazy-population, deferred-evaluation). PR-B is forward-looking architecture; historical record migration is implementation-level. | Implementation |

### Additional PR-B assumptions

The following are assumptions PR-B makes that are not strictly open questions but are documented for traceability:

- **Assumption A-1.** Source modules will populate `file_direction`, `file_purpose`, `file_lifecycle_status` consistently. Misuse (wrong value for the file activity) is a source-module bug, not a Logs & Audit concern.
- **Assumption A-2.** Tenant Company `check_access` patterns and existing baseline permission families cover all PR-B authority needs. PR-B does NOT need new permission families; PR-D may.
- **Assumption A-3.** The existing baseline File Tracking Record field set is preserved without rename or removal. PR-B only adds spine integration references and discriminator fields.
- **Assumption A-4.** The existing baseline Duplicate File Detection Record, Correction / Reupload History Record, Reprocess / Retry Request Record, and Reprocess / Retry Outcome Record are preserved without rename or removal. PR-B adds spine integration references and clarifies discipline.
- **Assumption A-5.** The existing baseline Full Payload Exception Record workflow remains the exception path for non-minimized file payloads. PR-B does NOT introduce a new exception path.
- **Assumption A-6.** The existing baseline Validation Result Record, Processing Result Record, Row-Level Validation Error Record, and Partial File Processing Record remain in place. PR-C may catalog as evidence_type values; PR-B leaves them as existing baseline.
- **Assumption A-7.** Source modules will choose between Evidence Amendment Record (small clarification), Evidence Supersession Record (replacement after source-record correction), and Correction / Reupload History Record (file-level reupload). Logs & Audit records the lineage(s).
- **Assumption A-8.** Source-event references travel as opaque identifiers; resolution is implementation-level.
- **Assumption A-9.** Concurrency on reupload, reprocess, and duplicate detection is handled by implementation (last-write semantics on lifecycle status; append-only on records).
- **Assumption A-10.** PR-C (Cross-Module Evidence Catalog), PR-D (Retention / Redaction / Legal Hold / Access), and PR-E (Search / Query / Review) will sequence after PR-B in that order.
- **Assumption A-11.** The future API Governance Foundation PR will harden API contracts across modules; PR-B defers OpenAPI hardening entirely.
- **Assumption A-12.** Subscribers to `file.reprocess.completed` will handle all five `outcome_status` values. Subscribers wanting only specific outcomes filter explicitly.
- **Assumption A-13.** Implementation-level naming reconciliation for the dual `file_direction` semantics is acceptable; PR-B does NOT force a premature rename.

### Open question classification summary

- **EB (estimate-blocker):** 0. PR-B is unblocked.
- **BP (business-product):** 14.
- **IM (implementation):** 8.
- **FP (future phase):** 7.
- **CU (cleanup-only):** 4.

No question is an estimate-blocker for PR-B. Every retained question is bounded to PR-C, PR-D, PR-E, or implementation.

### PR-B deferral structure

For clarity, the following are explicit deferrals:

- **PR-C: Cross-Module Evidence Catalog.** Comprehensive `evidence_type` taxonomy including Product Catalog manual/API product import evidence (with `import_method`), buyer API product export evidence (batch and item, with `export_method`), Order Routing vendor order/return export evidence, Fulfillment / Returns vendor shipping/delivery/return import evidence (with `import_type`), Cross-Module Summary Emails evidence (activity summary generated, no-activity summary suppression), Media evidence subtypes, AI Agent placeholders, SLA / exception / handoff evidence references. Also: Logs-vs-Notification ownership of vendor email export delivery evidence. Also: whether existing baseline Validation Result Record and Processing Result Record become evidence_type values.
- **PR-D: Retention / Redaction / Legal Hold / Access.** Retention duration matrix, redaction transformation workflow, legal hold lifecycle and Legal Hold entity, access matrix (tenant / parent / child), restricted file evidence view rendering, retention review workflow for files, file-specific redaction application, file-specific legal hold application, file-specific access enforcement, Audit Access Record hardening for file events.
- **PR-E: Search / Query / Review.** Admin investigation workflows for files, file evidence retrieval, exportable file audit reports, indexing / search assumptions for files, buyer media download package workflow, Product Catalog export download UX, report download workflow, audit export download workflow.
- **Future phase: Periodic file integrity verification.** Re-hash and compare workflows for stored files.
- **Future API Governance Foundation PR + Logs-and-Audit-specific OpenAPI hardening PR.** OpenAPI hardening for `modules/logs-audit-file-tracking/openapi-contracts.md` and the Logs & Audit API surface (including file-tracking endpoints).
- **Source-module evidence-emission PRs.** Each source module (Product Catalog file evidence emission; Order Routing vendor export file emission; Fulfillment / Returns vendor import file emission; Media file evidence emission; AI Agent Services file evidence emission when built) will harden its own file evidence emission in follow-up PRs, consuming PR-A, PR-B, and PR-C.
- **Implementation-level naming reconciliation for legacy file_direction vs PR-B file_direction.** Concrete schema-level handling deferred per Legacy-File-Direction-Preservation Rule.
- **Implementation-level migration strategy for historical File Tracking Records.** Backfill / lazy-population / deferred-evaluation is implementation-level.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/assumptions-open-questions.md`

> **Target file:** `modules/logs-audit-file-tracking/assumptions-open-questions.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Assumptions and Open Questions - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Assumptions and Open Questions - Cross-Module Evidence Catalog

This section documents PR-C-locked decisions (for traceability) and PR-C open questions (classified for future PR resolution). All open questions are non-blocking; no estimate blockers remain.

### PR-C-locked decisions (documented for traceability; not open questions)

1. **PR-C is documentation-only.** No new operational entities. No schema-level structures. No new events. Source modules NOT modified.
2. **No new events introduced.** All evidence emission flows through PR-A's `audit.evidence.recorded` event with `evidence_type` discriminator. Zero additive events.
3. **No renames of PR-A or PR-B entities, references, or events.** Existing baseline / PR-A / PR-B content preserved verbatim.
4. **15 evidence families catalogued** (13 active + 2 reserved placeholder family slots for AI Agent Services and Warranty Registration). Evidence Family Closed-Set Rule (PR-C scope) applies.
5. **~87 evidence_type values catalogued** across 13 active families. 57 starter + 30 placeholder. **Zero final.** Zero enumerated values in the two reserved placeholder family slots.
6. **Status discipline: final / starter / placeholder / future.** PR-C uses only starter and placeholder for evidence_type values. PR-C uses `future` only for the two reserved family slots (zero evidence_type values).
7. **PR-C uses zero "final" identifiers.** Promotion of any identifier from starter to final requires explicit future PR. Subscribers may NOT depend on starter or placeholder identifiers as stable subscriber contracts.
8. **AI Agent Services family slot reserved with NO enumerated values.** `modules/ai-agent-services/` does not exist on origin/main.
9. **Warranty Registration family slot reserved with NO enumerated values.** `modules/warranty-registration/` does not exist on origin/main.
10. **Default class guidance is suggestion-only.** PR-D locks retention duration matrix, full access matrix, legal hold workflows, redaction transformation workflows. PR-A's At-Creation Classification Rule remains in force.
11. **Source modules retain canonical ownership of all operational records, business decisions, lifecycle state, validation rules, and evidence emission timing.** Logs & Audit catalogs taxonomy; source modules decide.
12. **Evidence Backing Classification is non-exclusive** (8 classifications: file_backed, api_backed, notification_backed, external_backed, ai_backed, operational_state, decision, transport_delivery). A single evidence_type may carry multiple backing classifications.
13. **Transport-delivery evidence is explicitly distinct from business-outcome evidence.** Subscribers distinguish via backing classification.
14. **PR-A's External-Tool-Not-Source-of-Truth Rule applies** to all `external_backed` evidence_type values. External provider responses are coordination evidence only.
15. **PR-C identifiers MAY share strings with PR-B `file_purpose` values where applicable.** Subscribers reading both dimensions get consistent semantics. Concrete alignment is implementation-level.
16. **Existing baseline activity summary evidence preserved verbatim** AND mapped into generic taxonomy as starter values (`activity_summary_generated`, `no_activity_summary_suppressed`). Coexistence is by design.
17. **`media_version_supersession` (clearer name)** is used (rather than `media_supersession`) to directly map to Media PR-B Version Supersession Evidence and avoid ambiguity with PR-A's generic Evidence Supersession Record.
18. **PR-C is single-module by file touch.** All 12 target files are under `modules/logs-audit-file-tracking/`. Source modules NOT modified.
19. **`openapi-contracts.md` NOT modified.** Deferred to future API Governance Foundation PR.
20. **No new Tenant Company role, capability flag, scope, or permission family.** PR-C is documentation-only; no authority surfaces introduced.
21. **Compatibility, device deactivation, stop-selling, buyer activation, eligibility preview, export batch (Product), all device_catalog values, vendor_export_review, buyer_update_ready_signal, circuit_breaker_trip, rate_limit_throttle, all invoice / pricing / analytics / procurement / launch values marked PLACEHOLDER** pending source-module hardening. Subscribers MUST NOT depend on these identifiers.
22. **Media, Order Routing (mostly), Fulfillment / Returns (mostly), Notification Platform, Tenant Company, Integration Management (mostly) catalogued as starter** based on existing baseline maturity.
23. **All PR-A canonical rules (9) and PR-B canonical rules (9) apply to PR-C evidence_type values.**
24. **PR-C canonical rules introduced (4):** Evidence Type Status Discipline Rule (incl. Subscriber Contract Rule, Promotion Rule, Retirement Rule), Default Class Guidance Suggestion-Only Rule, Evidence Family Closed-Set Rule (PR-C scope), Catalog Additive-Only Rule.
25. **Bundle structure follows PR-A and PR-B pattern.** 14 bundle files (PR_BODY + APPLY + 12 append-blocks); 12 target files modified; APPLY.md stops before commit/push/PR; prohibitive-only references to destructive commands.

### PR-C open questions retained (classified; non-blocking)

Classification: **BP** business-product, **IM** implementation, **FP** future phase, **CU** cleanup-only. No question is classified EB (estimate-blocker).

| ID | Question | Class | PR-C disposition | Decision by |
|---|---|---|---|---|
| OQ-FC-1 | Should PR-C evidence_type names be stable canonical identifiers or starter architecture labels? | BP | Locked: starter architecture labels with explicit status discipline. Final identifiers require future promotion PR after source-module hardening. PR-C uses zero final identifiers. | PR-C locked starter; future promotion PRs |
| OQ-FC-2 | Which Product export / bulk job evidence types should be placeholder until Product Catalog export throttling is scoped? | BP | Locked: `buyer_product_export_batch`, `export_eligibility_preview`, `buyer_product_activation`, `stop_selling`, `product_compatibility_sync` marked PLACEHOLDER. | PR-C locked; future Product Catalog source-module hardening |
| OQ-FC-3 | Should buyer-scoped compatibility projection evidence be final now or placeholder pending Product / Device PR? | BP | Locked: placeholder. `product_compatibility_sync`, `device_feature_capability_change`, `compatibility_impacting_review_signal` marked PLACEHOLDER. | PR-C locked placeholder; future Product / Device hardening |
| OQ-FC-4 | Should AI Agent evidence be a reserved family only? | BP | Locked: yes. Family slot reserved with NO enumerated values. | PR-C locked |
| OQ-FC-5 | Should Warranty evidence be omitted or placeholder since no module folder exists? | BP | Locked: placeholder family slot with NO enumerated values. | PR-C locked |
| OQ-FC-6 | Should activity summary evidence remain as existing specific Logs-owned evidence while also mapped into the generic taxonomy? | CU | Locked: yes. Existing baseline preserved verbatim AND mapped to generic taxonomy. | PR-C locked coexist |
| OQ-FC-7 | Should `evidence_family` be a top-level field on Evidence Record (PR-A) or derived from `evidence_type`? | IM | PR-C documents the family-to-evidence_type mapping; concrete schema (separate field vs derived view) is implementation-level. PR-A's Evidence Record schema NOT modified. | Implementation |
| OQ-FC-8 | Should vendor email export delivery evidence (`vendor_export_delivery`, `vendor_export_failure`) be owned by Logs & Audit or by Notification Platform Service? | BP | PR-C documents both patterns via PR-A's External Evidence Reference sub-structure; concrete ownership decision deferred to future Notification Platform Service source-module hardening PR. | Future Notification Platform Service hardening PR |
| OQ-FC-9 | Should `vendor_shipping_import` evidence_type be split by `import_type` (full / delta / correction / outcome) within PR-C, or should `import_type` be a discriminator on the Evidence Record content? | BP | PR-C documents single starter evidence_type; sub-discriminator deferred to Fulfillment / Returns source-module hardening. | Future Fulfillment / Returns hardening PR |
| OQ-FC-10 | Should `product_import_received` be split by `import_method` (manual / api) within PR-C? | BP | PR-C documents single starter evidence_type; sub-discriminator deferred to Product Catalog hardening. | Future Product Catalog hardening PR |
| OQ-FC-11 | Should `buyer_product_export_batch` be split by `export_method` (api / file_download) within PR-C? | BP | PR-C documents single placeholder evidence_type; sub-discriminator deferred to Product Catalog hardening. | Future Product Catalog hardening PR |
| OQ-FC-12 | Should buyer media download evidence be cataloged in PR-C or deferred to Media PR-C / PR-E? | BP | Deferred. No buyer-facing media download evidence_type in PR-C. Reserved for Media PR-C or PR-E. | Media PR-C or PR-E |
| OQ-FC-13 | Should `evidence_type` values share string identifiers with PR-B's `file_purpose` values where they align? | CU | PR-C recommends alignment as discipline; concrete naming is implementation-level. | Implementation (PR-C documents the recommendation) |
| OQ-FC-14 | Should Tenant Company role / permission / capability change evidence be marked restricted_evidence = true by default? | BP | Default guidance: likely yes (restricted_pii redaction; restricted access; restricted_evidence likely true). PR-D locks policy. | PR-D |
| OQ-FC-15 | Should Invoice / Pricing evidence be marked restricted_evidence = true by default? | BP | Default guidance: likely yes (financial; restricted redaction; restricted access; restricted_evidence likely true). PR-D locks policy. | PR-D |
| OQ-FC-16 | Should transport_delivery evidence default to shorter retention than operational_state / decision evidence? | BP | Default guidance: shorter retention is reasonable suggestion. PR-D locks duration. | PR-D |
| OQ-FC-17 | Should `circuit_breaker_trip` and `rate_limit_throttle` be PR-C placeholder or starter? | BP | Locked: placeholder. Operationally meaningful but less mature in Integration Management baseline. | PR-C locked placeholder; future Integration Management hardening |
| OQ-FC-18 | Should `routing_decision` evidence carry the full decision rationale or only a decision reference? | IM | Decision reference + minimized source_snapshot_reference. PR-A's Source Snapshot Minimization Rule applies. | Implementation |
| OQ-FC-19 | Should `handoff_source_snapshot` evidence be a distinct evidence_type or covered by `routing_decision` with a source_snapshot_reference? | BP | Locked: distinct. PR-C documents `handoff_source_snapshot` as a separate starter evidence_type. | PR-C locked separate |
| OQ-FC-20 | Should `media_version_supersession` evidence_type be separate from PR-A's Evidence Supersession Record? | BP | Locked: separate but related. PR-A's Evidence Supersession Record handles the lineage; PR-C's `media_version_supersession` captures the media-specific business decision. The two coexist. | PR-C locked separate |
| OQ-FC-21 | Should `correction_reupload` evidence_type be separate from PR-B's Correction / Reupload History Record? | BP | Locked: separate but related. PR-B's Correction / Reupload History Record handles file-level lineage; PR-C's `correction_reupload` evidence_type captures the source-module business decision evidence. | PR-C locked separate |
| OQ-FC-22 | Should `import_partial_commit` and `import_canceled` be separate evidence_type values or sub-discriminators on `import_commit`? | BP | Locked: separate. PR-C documents three distinct evidence_type values to align with PR-B's lifecycle status transitions (`processed`, `canceled`, `partially_processed`). | PR-C locked separate |
| OQ-FC-23 | Should AI Agent Services placeholder family include guidance for future evidence_type identifiers (e.g., `agent_execution`, `agent_recommendation`)? | FP | Yes - PR-C documents anticipated future identifiers as non-enumerated guidance only. When AI Agent Services module is built, a follow-up PR populates. | Future AI Agent Services hardening PR |
| OQ-FC-24 | Should Warranty Registration placeholder family include guidance for future evidence_type identifiers (e.g., `warranty_registration`, `warranty_claim`)? | FP | Yes - same as AI Agent Services. Non-enumerated guidance only. | Future Warranty Registration hardening PR |
| OQ-FC-25 | Should PR-C document evidence_type identifier renaming / consolidation policy (when starter -> final promotion happens)? | CU | Locked: yes. PR-C documents that starter -> final promotion is an explicit future PR with subscriber-notification discipline. | PR-C locked policy |
| OQ-FC-26 | Should PR-C document evidence_type identifier retirement / deprecation policy? | CU | Locked: yes. PR-C documents that placeholder identifiers may be retired during source-module hardening; final identifiers retire only with deprecation PR. | PR-C locked policy |
| OQ-FC-27 | Should historical Evidence Records (created before PR-C) be backfilled with `evidence_type` values from the new catalog? | IM | Implementation-level. PR-C is forward-looking documentation; historical record migration is implementation-level (backfill / lazy-population / deferred-evaluation). | Implementation |
| OQ-FC-28 | Should `evidence_type` carry a version suffix (e.g., `product_import_received.v1`) to support future schema evolution? | IM | Not in PR-C. PR-A's `evidence_schema_version` field on Evidence Record carries schema versioning; PR-C's evidence_type values are unversioned identifiers. | Implementation may layer versioning |
| OQ-FC-29 | Should `evidence_family` be an enumeration / closed set or extensible? | BP | Locked: closed set in PR-C (15 families). Future families may be added by future PRs. | PR-C locked closed set at 15 |
| OQ-FC-30 | Should `accounting_sync` evidence be owned by Invoice Management or by Integration Management (as transport)? | BP | Locked: dual ownership. Invoice Management owns operational evidence; Integration Management owns transport evidence. PR-C catalogs `accounting_sync` under invoice_management family AND uses `api_response` / `provider_response` under integration_management family for the transport side. | PR-C locked dual ownership |
| OQ-FC-31 | Should `report_file_generation` evidence be owned by Analytics / Reporting or by the originating source module? | BP | Locked: Analytics / Reporting owns. PR-C catalogs under analytics_reporting family. Future Analytics hardening may refine. | PR-C locked Analytics ownership |
| OQ-FC-32 | Should `audit_export` evidence be cataloged in PR-C or remain a PR-B-only concept? | CU | PR-C does NOT catalog `audit_export` as a Logs-owned evidence_type in PR-C; final classification deferred to PR-E (audit export workflow). | PR-E |
| OQ-FC-33 | Should PR-C document a discipline for source-module evidence-emission PRs to consume the catalog? | CU | Locked: yes. PR-C documents the discipline as guidance for future source-module hardening PRs (cite the evidence_type, status, references). | PR-C locked guidance |

### Open question classification summary

- **EB (estimate-blocker):** 0. PR-C is unblocked.
- **BP (business-product):** 20.
- **IM (implementation):** 5.
- **FP (future phase):** 2.
- **CU (cleanup-only):** 6.

**Total PR-C open questions retained:** 33 (with several locked decisions also documented above for traceability).

No question is an estimate-blocker for PR-C. Every retained question is bounded to a future source-module hardening PR, PR-D, PR-E, or implementation.

### PR-C assumptions (working assumptions for PR-C drafting)

1. **PR-A baseline is present at `a14b05c` on main.** Audit Record, Evidence Record, formalized references, retention/redaction/access foundation, 4 PR-A events, 8 PR-A workflows, 9 PR-A canonical rules. Codex confirmed.
2. **PR-B baseline is present at `910cd09` on main.** File Tracking Record hardened, normalized discriminators, Duplicate / Correction-Reupload / Reprocess records, 2 PR-B events, 10 PR-B workflows, 9 PR-B canonical rules. Codex confirmed.
3. **`openapi-contracts.md` is present but unmodified by PR-A and PR-B.** PR-C does NOT modify.
4. **AI Agent Services and Warranty Registration module folders do NOT exist on origin/main.** PR-C treats both as reserved family slots only.
5. **Product Catalog has baseline maturity for import lifecycle, export confirmation, export lines, Latest Accessories, buyer export baseline.** Starter values appropriate; placeholder for less mature concepts (export batch, eligibility preview, activation, stop-selling, compatibility sync).
6. **Device Catalog has source-module records but evidence-level discipline is less mature.** All device_catalog values placeholder.
7. **Media has Media PR-A and PR-B baseline with strong evidence-level discipline.** All media values starter.
8. **Order Routing has substantial baseline (routing decision, vendor export, batch / item / content, delivery, retry).** Most values starter; one placeholder (vendor_export_review).
9. **Fulfillment / Returns has substantial baseline (vendor shipping / delivery / return import, validation, commit, shipment / delivery / return update, correction, SLA).** Most values starter; one placeholder (buyer_update_ready_signal).
10. **Integration Management has substantial transport baseline.** Most values starter; circuit_breaker_trip and rate_limit_throttle placeholder.
11. **Notification Platform has substantial delivery baseline plus existing baseline activity summary evidence concepts.** All values starter; activity_summary_generated and no_activity_summary_suppressed mapped to existing baseline.
12. **Tenant Company governance is foundational and evidence concepts well-established.** All values starter.
13. **Invoice / Pricing / Analytics / Procurement / Launch source-module evidence hardening is less mature.** All values placeholder.
```

## PR-D Assumptions and Open Questions - Retention / Redaction / Legal Hold / Access Governance

This section documents PR-D's locked decisions for traceability, PR-D's open questions classified for future resolution, and PR-D's working assumptions. All baseline + PR-A + PR-B + PR-C assumptions and open questions are preserved without modification.

### Locked PR-D decisions (24; documented for traceability)

The following decisions are LOCKED by PR-D and documented here for reviewer traceability:

1. **3 new entities introduced** (Legal Hold Record, Retention Disposition Record, Redaction Transformation Record).
2. **1 existing entity hardened** (Audit Access Record); NOT split into multiple entities; Evidence Access Record / Access Denial Record / Restricted Evidence Access Record / Break-Glass Access Record NOT introduced.
3. **3 new policy matrices introduced** (Retention Policy Matrix, Redaction Policy Matrix, Access Policy Matrix). Evidence Governance Policy Matrix is umbrella view / reference concept; NOT a fourth matrix (per Codex cleanup directive 5).
4. **6 additive events introduced** (`audit.retention-review.required`, `audit.retention-disposition.recorded`, `audit.redaction.applied`, `audit.legal-hold.applied`, `audit.legal-hold.released`, `audit.evidence-access.recorded`). NO `audit.evidence-access.denied` event (per Codex cleanup directive 4).
5. **13 new numbered workflows introduced.**
6. **19 PR-D canonical rules introduced** (5 retention + 5 redaction + 3 legal hold + 4 access + 2 governance / policy). All PR-A (9), PR-B (9), PR-C (4) canonical rules preserved.
7. **Named retention policy references used; NOT exact duration values** (per Codex cleanup directive 3). Concrete durations deferred to CPA / legal / DevOps.
8. **Per-audience redacted views supported** (Redacted-Views-Per-Audience Rule). Single canonical view rejected as too coarse.
9. **Break-glass access included as `break_glass_flag` on hardened Audit Access Record**; NOT a separate entity.
10. **Retention disposition stores both payload deletion proof AND metadata-only proof depending on disposition state.** `proof_class` discriminator: `payload_deletion_proof` / `metadata_only_proof` / `both`.
11. **No new Tenant Company role, capability flag, scope, or permission family introduced** (per No-New-Tenant-Roles-In-PR-D Rule and Codex cleanup discipline). Future Tenant Company coordination PR may create roles if needed.
12. **Audit Access Record covers `attempted` / `granted` / `denied` in one record** with `access_result` discriminator. Per Codex cleanup directive 4: `attempted` non-terminal; `granted` terminal; `denied` terminal.
13. **Legal Hold scope is multi-dimensional** (`evidence_type_scope`, `evidence_family_scope`, `company_scope_reference`, `file_scope`, `source_module_scope`). Each hold scoped to ONE `company_scope_reference`.
14. **Raw evidence access requires `access_reason_reference`** per Raw-Evidence-Access-Exceptional Rule.
15. **Redaction transformations versioned** via `redaction_version` field; re-redaction creates new Redaction Transformation Record per Redaction-Transformation-Append-Only Rule.
16. **File-backed purge preserves hash AND storage reference tombstone** per File-Metadata-Outlives-Payload Rule.
17. **External evidence reference validation deferred** to PR-E or future. CIXCI retains its own evidence per External-Tool-Not-Source-of-Truth Rule.
18. **Service identity access logged identically to human access** per Service-Identity-Access-Logged Rule.
19. **PR-D is one PR** (not split). 12 target files; 14 bundle files; documentation-and-architecture pass.
20. **Evidence type sensitivity mapping is locked policy guidance** per Governance-Policy-Locked-By-PR-D Rule. PR-C suggestion-only guidance is now PR-D-locked. PR-A At-Creation Classification Rule remains in force for source-module overrides.
21. **9 redaction class values locked** INCLUDING preserved baseline `public_metadata_placeholder` per Codex cleanup directive 2.
22. **6 retention class meanings locked** (PR-A established the 6 values; PR-D locks meanings).
23. **PR-A's 6 access_class values PRESERVED VERBATIM** per Codex cleanup directive 1. `access_policy_tier` is a separate concept (4 values: `standard_tier`, `restricted_tier`, `audit_only_tier`, `system_internal_tier`) introduced ONLY within Access Policy Matrix; does NOT replace access_class.
24. **PR-D is single-module by file touch.** 12 files in `modules/logs-audit-file-tracking/`. `openapi-contracts.md` NOT modified. Source modules NOT modified.

### PR-D open questions retained (32; classified; zero estimate-blockers)

Classification: **EB** estimate-blocker, **BP** business-product, **IM** implementation, **FP** future phase, **CU** cleanup-only.

#### Business-product class (BP)

- **OQ-GV-1.** Concrete retention duration values for each named retention policy reference (`retention_policy_transient_short`, `retention_policy_standard`, `retention_policy_extended`, `retention_policy_financial_long_term`, `retention_policy_audit_critical_indefinite`, `retention_policy_legal_hold_indefinite`). Decision by CPA / legal / DevOps. **Class: BP.**
- **OQ-GV-5.** Concrete role definition for Compliance / Audit Reviewer in Tenant Company hardening. **Class: BP.** Future Tenant Company coordination.
- **OQ-GV-8.** Should hold scope include additional dimensions beyond the 5 documented (evidence_type, family, company, file, source module) - e.g., per-evidence_record-identifier scope? **Class: BP.** Future PR if needed.
- **OQ-GV-9.** Should `access_reason_reference` codes be standardized across CIXCI (closed enumeration) or free-text references? **Class: BP.** Future Tenant Company / compliance coordination.
- **OQ-GV-15.** Per-tenant override of PR-D's evidence type sensitivity mapping. **Class: BP.** Future Tenant Company coordination.
- **OQ-GV-16.** Should Legal Hold Record include max-duration / auto-lapse mechanism? PR-D documents `lapsed` status; concrete max-duration policy. **Class: BP.** Future compliance / legal lock.
- **OQ-GV-18.** Extensible audience enumeration: should additional `redaction_audience` values be added (e.g., `regulator`, `partner_specific`, `auditor_external`)? **Class: BP.** Future PR if needed.
- **OQ-GV-20.** Concrete role definition for Raw Access Authorizer in Tenant Company hardening. **Class: BP.**
- **OQ-GV-22.** Per-tenant Retention Policy Matrix override (e.g., specific buyer requires extended retention for all evidence). **Class: BP.** Future Tenant Company coordination.
- **OQ-GV-23.** Should Legal Hold Record support a "watch but no block" mode (notify on access without blocking purge)? Not in PR-D. **Class: BP.** Future PR.
- **OQ-GV-24.** Should `restricted_evidence = true` records default-deny redacted view or default-redacted-served? PR-D locks default-redacted-served; future Tenant Company coordination may adjust per-tenant. **Class: BP.**
- **OQ-GV-28.** Should `redaction_audience` enumeration be open / extensible at runtime, or closed? PR-D locks 4 default audiences (buyer / vendor / internal / audit_only); extensibility via future PR. **Class: BP.**
- **OQ-GV-29.** Should access denials trigger notification to the requester or only audit logging? PR-D requires logging; UX notification deferred. **Class: BP.** PR-E or future UX.
- **OQ-GV-30.** Should retention disposition reversal (un-archive, restore-from-purge_eligible) be auto-approved or require authority match? PR-D documents append-only semantics; concrete reversal authority deferred. **Class: BP.**
- **OQ-GV-33.** Should Compliance / Audit Reviewer role be tenant-scoped or CIXCI-platform-scoped? PR-D documents the role expectation; concrete tenant scoping deferred to future Tenant Company coordination. **Class: BP.**
- **OQ-GV-34.** Should Legal Hold Authority role be tenant-scoped (per-tenant compliance authority) or CIXCI-platform-scoped (single compliance team)? Future Tenant Company coordination. **Class: BP.**

#### Implementation class (IM)

- **OQ-GV-4.** Concrete shape of `proof_reference` (payload deletion proof / metadata-only proof). Implementation-level field shape. **Class: IM.**
- **OQ-GV-6.** Subscriber discipline for high-volume `audit.retention-review.required` events: per-Evidence-Record OR batch. PR-D documents both patterns; concrete batching is implementation. **Class: IM.**
- **OQ-GV-10.** Concrete redaction transformation algorithm per redaction class. Implementation-level. **Class: IM.**
- **OQ-GV-11.** Concrete tombstone state shape for `file_storage_reference` after payload purge. Implementation-level. **Class: IM.**
- **OQ-GV-13.** Concrete service identity catalog for source-module services. Implementation-level. **Class: IM.**
- **OQ-GV-17.** Concrete archive storage tier metadata in Retention Disposition Record. Implementation-level (DevOps). **Class: IM.**
- **OQ-GV-19.** Concrete payload deletion certificate shape for `purged_reference_only` state. Implementation-level. **Class: IM.**
- **OQ-GV-21.** Concrete event-publication batching / aggregation strategy for high-volume access events. Implementation-level. **Class: IM.**
- **OQ-GV-25.** Concrete `policy_matrix_reference` shape on Redaction Transformation Record. Implementation-level. **Class: IM.**
- **OQ-GV-26.** Concrete batch vs per-Evidence-Record granularity for `audit.retention-review.required`. Implementation-level. **Class: IM.**
- **OQ-GV-31.** Concrete population strategy for `legal_hold_reference` field (at apply time vs at evaluation time). Implementation-level. **Class: IM.**

#### Future phase class (FP)

- **OQ-GV-12.** External evidence reference periodic validation. **Class: FP.** PR-E or future.
- **OQ-GV-32.** AI Agent Services / Warranty Registration enumeration of evidence_type values + PR-D sensitivity mapping extension. **Class: FP.** Future PR after module exists.
- **OQ-GV-35.** Search / query / review workflows over PR-D records (Retention Disposition / Redaction Transformation / Legal Hold / Audit Access). **Class: FP.** PR-E.

#### Cleanup-only class (CU)

- **OQ-GV-14.** Documentation refinement for Evidence Governance Policy Matrix umbrella wording across files (PR-D bundle is consistent; future doc passes may polish). **Class: CU.**
- **OQ-GV-27.** Full Payload Exception Access Review workflow refinement when source module evolves (PR-B Workflow 10 remains baseline; PR-D Workflow 11 layered on top). **Class: CU.**
- **OQ-GV-36.** Documentation cross-reference between PR-D's evidence type sensitivity mapping and PR-C catalog identifiers (consistent; cleanup-only refinement). **Class: CU.**

#### Estimate-blocker class (EB)

**ZERO open questions classified as EB.** PR-D is unblocked.

### Open question classification summary

- **EB (estimate-blocker):** 0.
- **BP (business-product):** 16.
- **IM (implementation):** 10.
- **FP (future phase):** 3.
- **CU (cleanup-only):** 3.
- **Total:** 32 retained open questions; ZERO estimate-blockers.

All 32 open questions are bounded to:

- PR-E (search / query / review).
- Future API Governance Foundation PR / OpenAPI hardening.
- Future source-module hardening PRs.
- Future Tenant Company coordination PRs.
- CPA / legal / DevOps retention duration review.
- Implementation-level decisions.

None blocks PR-D bundle application.

### PR-D working assumptions (13)

The following are PR-D working assumptions; if any is violated, PR-D should be re-scoped.

1. **PR-A baseline preserved.** PR #98 merged at `a14b05c` (or equivalent); Audit Record hardening, Evidence Record spine, 7 formalized references, class field foundation, 4 events, 8 workflows, 9 canonical rules all present.
2. **PR-B baseline preserved.** PR #99 merged at `910cd09` (or equivalent); File Tracking Record, 3 discriminators, Duplicate File Detection Record, Correction / Reupload History Record, Reprocess / Retry Request / Outcome Records, Full Payload Exception relationship, 2 PR-B events, 10 workflows, 9 canonical rules all present.
3. **PR-C baseline preserved.** PR #100 merged at HEAD; Evidence Family Catalog (15 families), Evidence Type Catalog (87 values), Reference Requirements table, Backing Classification rubric, Status Discipline rubric, Default Class Guidance Discipline (suggestion-only; PR-D now locks), 4 PR-C canonical rules, 7 architectural usage patterns all present.
4. **Existing baseline preserved.** All existing baseline entities, rules, defaults, and language remain unchanged.
5. **Source modules unchanged.** No source-module files modified by PR-D.
6. **AI Agent Services module does NOT exist.** `modules/ai-agent-services/` not on origin/main; reserved family slot in PR-C; PR-D does NOT create or modify the directory.
7. **Warranty Registration module does NOT exist.** `modules/warranty-registration/` not on origin/main; reserved family slot in PR-C; PR-D does NOT create or modify the directory.
8. **Tenant Company `check_access` exists and is canonical.** PR-D documents access expectations; Tenant Company evaluates authority.
9. **CPA / legal / DevOps will perform follow-up retention duration review.** PR-D uses named policy references; concrete duration locking is future review pass.
10. **Compliance / legal exists as authority for legal hold apply / release.** PR-D documents the expectation; Compliance / legal applies / releases via Legal Hold Apply / Release workflows.
11. **`openapi-contracts.md` will be modified by a future API Governance Foundation PR.** PR-D does NOT modify it.
12. **No new evidence_type values are required by PR-D.** PR-C catalog (87 values) is referenced for governance policy only.
13. **No new evidence_family values are required by PR-D.** PR-C catalog (15 families) is referenced.

### Existing baseline + PR-A + PR-B + PR-C assumptions and open questions preserved

All assumptions and open questions from existing baseline, PR-A, PR-B, and PR-C remain in this file unchanged. PR-D adds the section above; does NOT modify any prior content.

## PR-E Assumptions and Open Questions - Search / Query / Review / Investigation / Audit Report Export

This section documents PR-E working assumptions, PR-E locked decisions, and PR-E open questions. Open questions are classified per scoping discipline: **EB** estimate-blocker, **BP** business-product, **IM** implementation, **FP** future phase, **CU** cleanup-only.

### PR-E working assumptions (baselines confirmed)

PR-E proceeds under the following assumptions:

1. **PR-A baseline present.** Audit Record + Evidence Record + 7 reference types + Evidence Amendment Record + Evidence Supersession Record + class fields + 4 PR-A events + 8 PR-A workflows + 9 PR-A canonical rules.
2. **PR-B baseline present.** File Tracking Record + duplicate / correction / reprocess records + 3 discriminators + 2 PR-B events + 10 PR-B workflows + 9 PR-B canonical rules.
3. **PR-C baseline present.** 15 evidence families (13 active + 2 reserved placeholder) + 87 evidence_type values + Reference Requirements + Backing Classification + Status Discipline + 4 PR-C canonical rules + 7 architectural usage patterns.
4. **PR-D baseline present.** Legal Hold Record + Retention Disposition Record + Redaction Transformation Record + hardened Audit Access Record + 3 policy matrices + Evidence Governance Policy Matrix umbrella + 6 PR-D events + 13 PR-D workflows + 19 PR-D canonical rules.
5. **Existing search / investigation baseline preserved.** Baseline Search / Investigation Workflow notes preserved; PR-E adds 13 numbered workflows on top.
6. **`openapi-contracts.md` not modified.** Concrete OpenAPI hardening deferred to future API Governance Foundation PR + Logs-and-Audit-specific OpenAPI hardening PR.
7. **Source modules not modified.** All 13 active PR-C source modules + 2 reserved placeholder family slots are reference-only.
8. **Tenant Company role hardening not introduced.** No new role, capability flag, scope, or permission family. Tenant Company `check_access` canonical.
9. **CPA / legal / DevOps retention duration locking deferred.** PR-D's 6 named retention policy references preserved; concrete durations TBD.
10. **AI Agent Services and Warranty Registration modules do not exist.** Reserved family slots; PR-E does NOT enumerate evidence_type values.
11. **Investigation Case Management module does not exist.** Investigation Case Reference is a placeholder field; PR-E does NOT introduce an Investigation Case Record entity.
12. **Search index implementation is future.** PR-E documents Search Index Projection as architecture concept only.
13. **Download UX is future.** PR-E documents Audit Report Export Record + PR-B File Tracking Record + PR-D Audit Access Record as the architectural shape; concrete UX is future UI / API.

### PR-E locked decisions (13 decisions; documented for traceability)

PR-E locks the following decisions; future PRs should reference these as PR-E-decided:

1. **5 new entities introduced.** Evidence Search Session, Evidence Review Session, Evidence Collection Record (canonical name), Review Note / Annotation (append-only), Audit Report Export Record.
2. **11 entities NOT introduced.** Evidence Search Result Record, Search Access Record, Search Denial Record, Evidence Review Queue Record (future), Review Assignment Record (future), Reviewer Access Record, Audit Export Download Record, Search Index Rebuild Evidence (future), Saved Search Record (future), Search Index Projection (architecture concept; not entity), Investigation Case Record (future PR if needed).
3. **4 additive events.** `audit.search.executed`, `audit.review-session.recorded`, `audit.review-note.recorded`, `audit.evidence-export.recorded`. NO `audit.evidence-export.generated`. NO `audit.search.denied`. NO `audit.evidence-export.downloaded`. NO `audit.evidence-collection.recorded`. NO per-evidence-type / per-family events.
4. **13 new numbered workflows.** Evidence Search Session Creation, Evidence Search Query Evaluation, Search Scope / Filter Evaluation, Search Result Access Evaluation, Redacted Search Result Rendering, Raw Evidence Retrieval Request, File-Backed Evidence Retrieval, Legal Hold Search Behavior, Retention-Aware Search Result Handling, Evidence Review Session Creation, Review Note / Annotation Recording, Evidence Collection Record Creation, Audit Report / Evidence Export Recording.
5. **25 PR-E canonical rules introduced.** (5 search safety + 6 result rendering + 2 sensitivity flag visibility + 3 review + 3 export + 4 indexing + 2 boundary.)
6. **PR-A / PR-B / PR-C / PR-D baselines preserved verbatim.** No renames; no removals; no rewrites.
7. **PR-A access_class values preserved verbatim.** All 6 values (`public_metadata`, `buyer_visible`, `vendor_visible`, `internal_operations`, `system_admin_only`, `compliance_only`).
8. **PR-D `public_metadata_placeholder` redaction class preserved.** All 9 redaction class values preserved.
9. **PR-D named retention policy references preserved.** No exact durations introduced; concrete locking deferred to CPA / legal / DevOps.
10. **PR-D `access_result` terminality discipline preserved.** `attempted` non-terminal; `granted` terminal; `denied` terminal.
11. **PR-D Evidence Governance Policy Matrix umbrella discipline preserved.** No fourth policy matrix introduced.
12. **Audit Report Export Record links to PR-B File Tracking Record ONLY when generated artifact exists.** Codified as Export-File-Tracking-Only-When-Artifact-Exists Rule. Metadata-only / failed / canceled exports do NOT create File Tracking Records.
13. **Single-module PR.** 12 target files in `modules/logs-audit-file-tracking/`. `openapi-contracts.md` NOT modified. Source modules NOT modified. ADRs / standards / `modules/README.md` NOT modified.

### PR-E open questions retained (approximately 30; ZERO estimate blockers)

#### Search and result (OQ-SR-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-SR-1 | Should Saved Search implementation re-evaluate authority at execution time, not at definition time? | BP | Locked guidance: yes. Future Saved Search PR implements. |
| OQ-SR-2 | Should Evidence Search Session carry a query language version? | IM | Future API Governance Foundation PR. |
| OQ-SR-3 | Should Search Result Cursor be opaque, time-based, or position-based? | IM | Future API Governance Foundation PR. |
| OQ-SR-4 | Should sensitive search `search_initiated_purpose_reference` be a closed enumeration or free-text reference? | BP | Future Tenant Company / compliance coordination. |
| OQ-SR-5 | Should result count exposure be exact, ranged, or hidden entirely for sensitive filters? | BP | PR-E recommends ranged for sensitive filters; future UI / API. |
| OQ-SR-6 | Should search result rendering include freshness indicator (eventual consistency awareness)? | IM | Implementation-level; PR-E documents Index-Stale-Acceptable Rule. |
| OQ-SR-7 | Should `audit.search.executed` aggregate batched searches by service identity? | IM | Implementation; PR-E documents semantic-per-search expectation. |

#### Review / investigation (OQ-RV-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-RV-1 | Should Review Session have a max-duration / auto-close mechanism? | BP | Future Tenant Company coordination; `suspended` status escape documented. |
| OQ-RV-2 | Should Evidence Collection Record support nested collections (collections of collections)? | BP | Not in PR-E; future PR if needed. |
| OQ-RV-3 | Should Review Note support attachments (additional files attached to the note)? | BP | Not in PR-E; could be added via PR-B File Tracking Record reference; future. |
| OQ-RV-4 | Should Review Disposition values be tenant-scoped or platform-scoped? | BP | Future Tenant Company coordination. |
| OQ-RV-5 | Should Investigation Case Reference be a free-text reference or structured ID? | BP | Future Investigation Case Management module. |
| OQ-RV-6 | Should Chain-of-Custody View be exportable as a standalone artifact? | BP | PR-E locked: yes, via Audit Report Export Record. |
| OQ-RV-7 | Should Review Notes targeted at restricted_evidence be auto-redacted via PR-D Redaction Transformation Record? | IM | Implementation; PR-E documents `review_note_redaction_class` elevation discipline. |

#### Export (OQ-EX-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-EX-1 | Should Audit Report Export Records have a max-age before re-generation is required? | BP | Future compliance / legal coordination. |
| OQ-EX-2 | Should export include Chain-of-Custody View by default? | BP | PR-E recommends yes for compliance-purpose exports; future UX. |
| OQ-EX-3 | Should export file format be locked (PDF / CSV / JSON / ZIP)? | IM | Future UI / API. |
| OQ-EX-4 | Should Audit Report Export Record support partial re-export of an Evidence Collection Record? | BP | Future PR. |
| OQ-EX-5 | Should export be aware of evidence under legal hold (export but mark) or refuse export entirely? | BP | PR-E locked: export with hold-state marker if requester authorized. |

#### Indexing (OQ-IX-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-IX-1 | Should Search Index Projection be eventually consistent or strongly consistent? | IM | PR-E documents Index-Stale-Acceptable Rule (eventually consistent acceptable). Implementation. |
| OQ-IX-2 | Should index rebuild be triggered automatically or by reviewer request? | IM | Future implementation. |
| OQ-IX-3 | Should index storage be tenant-scoped (per-tenant index) or single global index? | IM | Future implementation; PR-E documents tenant-scope-aware index expectation. |
| OQ-IX-4 | Should index include audit-aware index versioning (rebuild evidence)? | IM | Future implementation. |

#### Boundary (OQ-BD-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-BD-1 | Should Logs & Audit search be the only search surface, or should Analytics module run its own searches? | BP | PR-E locked: separate. Analytics owns BI; Logs & Audit owns investigation. |
| OQ-BD-2 | Should Investigation Case Management be its own module or part of Logs & Audit? | BP | Future PR if needed. PR-E uses Investigation Case Reference as placeholder. |

#### Events (OQ-EV-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-EV-1 | Should `audit.search.executed` carry the full filter set or only filter dimension presence flags? | IM | PR-E locked: reference-first; full filter set on Evidence Search Session entity, NOT event payload. |
| OQ-EV-2 | Should `audit.review-note.recorded` carry note content reference or just identifier? | IM | PR-E locked: reference-first per PR-A discipline. |
| OQ-EV-3 | Should `audit.evidence-export.recorded` carry the full export manifest or just identifier + discriminators? | IM | PR-E locked: reference-first; full manifest via observe surface. |

#### Catalog and modules (OQ-CT-*)

| ID | Question | Class | Disposition / decision by |
|---|---|---|---|
| OQ-CT-1 | Should AI Agent Services / Warranty Registration evidence be searchable under PR-E? | FP | Yes when modules exist; future PR extends filter dimensions if needed. |
| OQ-CT-2 | Should retroactive search of evidence emitted before PR-E merge be supported? | IM | Yes; PR-E search operates over existing Evidence Records. Implementation. |

### Open question classification summary

- **EB (estimate-blocker):** 0.
- **BP (business-product):** ~13.
- **IM (implementation):** ~12.
- **FP (future phase):** ~1.
- **CU (cleanup-only):** ~0.

Approximately 30 PR-E open questions retained; **ZERO estimate blockers.** PR-E is unblocked.

### Prior PR open question handling (PR-A / PR-B / PR-C / PR-D)

PR-E does NOT modify open questions documented in PR-A, PR-B, PR-C, or PR-D `assumptions-open-questions.md` sections. PR-E's open questions are additive.

### Sequence completion claim documented

**PR-E explicitly closes the planned Logs & Audit File Tracking A-through-E documentation hardening sequence.**

After PR-E merges, the Logs & Audit File Tracking module documentation hardening is complete. Subsequent PRs operate on:

1. **Tenant Company hardening PR.** Introduces Compliance / Audit Reviewer, Raw Access Authorizer, Legal Hold Authority, Break-Glass Approver, Reviewer / Investigator roles + capability families.
2. **CPA / legal / DevOps retention duration review.** Locks concrete duration values for PR-D's 6 named retention policy references.
3. **Source-module evidence-emission hardening PRs.** Each source module's PR consumes PR-A + PR-B + PR-C + PR-D + PR-E discipline. Suggested order: Tenant Company evidence, Pricing, Invoice Management, Order Routing, Fulfillment / Returns, Product Catalog, Device Catalog, Media, Integration Management, Notification Platform, Analytics / Reporting, Procurement / Purchase Orders, Launch / Event Management.
4. **API Governance Foundation PR.** Establishes API conventions across modules.
5. **Logs-and-Audit-specific OpenAPI hardening PR.** Modifies `modules/logs-audit-file-tracking/openapi-contracts.md`; introduces concrete HTTP routes / payload schemas / pagination cursors / error codes for the 30 net events post-PR-E and for search / review / export endpoints.
6. **Search index implementation PR.** Concrete index storage / engine choice / rebuild mechanics; consumes PR-E indexing assumptions.
7. **Investigation Case Management module (if needed).** Introduces Investigation Case Record entity if Investigation Case Reference placeholder graduates to a real entity.
8. **AI Agent Services module + AI Agent Services evidence PR** (when module exists). Populates `ai_agent_services_placeholder` family; extends PR-D evidence type sensitivity mapping; extends PR-E filter dimensions if needed.
9. **Warranty Registration module + Warranty Registration evidence PR** (when module exists). Populates `warranty_registration_placeholder` family; extends PR-D evidence type sensitivity mapping; extends PR-E filter dimensions if needed.

No PR-F is anticipated under the existing forward plan.
