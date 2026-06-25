# Logs And Audit File Tracking Boundary Contracts

This document is proposal-level architecture. It clarifies Logs & Audit boundaries without moving Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Notification, Analytics, or Vendor Integration responsibilities into Logs & Audit.

## What Logs & Audit May Answer

- What audit record exists for a platform action.
- Which source module emitted or triggered an audit record.
- Which file was imported, exported, uploaded, downloaded, corrected, or reuploaded.
- Which API transmission was attempted, retried, failed, or completed.
- Which validation and processing results were recorded.
- Which row count, accepted row count, and failed row count were recorded.
- Which row-level validation errors were recorded where permitted.
- Which actor/user/service triggered an action.
- Which source file reference, payload reference, or masked payload reference exists.
- Which retention owner, retention class, redaction class, and access class applies.
- Whether a legal/contract hold, purge eligibility, expiration behavior, or review status exists.
- Whether a duplicate file was detected.
- Which correction/reupload history exists.
- Which reprocess/retry request and source-module outcome were recorded.
- Which audit event, AI signal, or notification hook was emitted.

## What Logs & Audit Must Not Answer

- What Product Catalog product record should be created or corrected.
- What Device Catalog canonical Device identity should be.
- What price, commission, snapshot, or pricing exception should be calculated.
- Which order route, vendor assignment, or suborder should be selected.
- Whether a shipment is delivered or a return is operationally complete.
- Whether an invoice should be generated, finalized, corrected, or reconciled.
- Whether a warranty claim is eligible, approved, denied, or fulfilled.
- Whether a tenant, buyer, child entity, user, region, relationship, Product Type, or licensed property is eligible.
- What AI recommendation should be accepted, rejected, or executed.
- Who receives a notification or how notification delivery works.
- What Analytics reporting definitions, rollups, or metrics mean.
- Which vendor credentials, transports, endpoints, schedules, file mappings, vendor-specific transforms, delivery mechanics, or vendor integration setup/configuration should be used.

## Boundary Splits

### Source Modules vs Logs & Audit

Source modules own their business records, validation semantics, operational workflows, and decisions.

Logs & Audit owns traceability evidence about actions and processing outcomes. It must not mutate source records or become a correction engine.

Logs & Audit may record reprocess/retry requests, request status, source-module responses, and outcomes. Source modules own execution and any business-state mutation.

### Product Catalog / Device Catalog vs Logs & Audit

Logs & Audit may track catalog/device imports, exports, downloads, validation results, source files, and processing history.

Product Catalog and Device Catalog remain source-of-truth for product and device records.

### Pricing vs Logs & Audit

Logs & Audit may track Pricing transmissions, calculation request references, snapshot publication audit references, failures, and retries.

Pricing owns calculations, snapshots, exceptions, and commercial interpretation.

### Order Routing vs Logs & Audit

Logs & Audit may track routing transmissions, routed order exports, handoff attempts, retry/failure history, and routing snapshot references.

Order Routing owns routing decisions, routed order/suborder structure, and exceptions.

### Fulfillment / Returns vs Logs & Audit

Logs & Audit may track shipping imports, return outcome imports, vendor/carrier/manufacturer files, processing results, and API transmissions.

Fulfillment/Returns owns shipment, delivery, return, replacement, and operational exception state.

### Invoice Management vs Logs & Audit

Logs & Audit may track invoice generation actions, invoice CSV exports, reconciliation uploads, file downloads, validation outcomes, and API transmissions.

Invoice Management owns invoice records, invoice status, invoice reports, reconciliation decisions, and invoice lifecycle.

### Warranty Support vs Logs & Audit

Logs & Audit may track warranty registration transmissions, API attempts, manual exports, confirmations, failures, and retries.

Warranty support or a future Warranty Management context owns warranty claim state and approval behavior.

### Tenant Company vs Logs & Audit

Logs & Audit may track admin exception events, role/action references, actor history, and before/after summaries where permitted.

Tenant Company owns tenant hierarchy, eligibility, roles, permissions, and admin exception business rules.

### AI Agent Services vs Logs & Audit

Logs & Audit may track AI recommendation/action audit references and provide repeated failure or audit gap signals.

AI Agent Services owns recommendations, confidence, feedback, and action outcome records. AI must not delete audit logs, overwrite source files, bypass retention rules, or mutate source records through Logs & Audit.

### Notification / Analytics vs Logs & Audit

Logs & Audit may emit events that future Notification services consume and audit signals that Analytics consumes.

Notification owns delivery. Analytics owns reporting models and rollups.

### Vendor Integration vs Logs & Audit

Logs & Audit tracks evidence of vendor operational file/API activity only.

Logs & Audit does not own vendor credentials, vendor transports, vendor API endpoints, schedules, file mappings, vendor-specific transforms, delivery mechanics, or vendor integration setup/configuration.

## Immutability Boundary

Audit records, file tracking records, API transmission logs, validation results, and processing results should be append-only. Corrections should use amendment records, supersession references, correction references, or reupload history. No silent rewrite of audit evidence is allowed.

## Payload Boundary

Masked payload reference is the default. Full payload reference is exception-based and should require approval, reason, retention class, redaction class, access class, and payload size controls.

Sensitive customer, pricing, invoice, warranty, tenant, media, licensing, and commercial data must not appear in events unless explicitly allowed.

Logs & Audit must not become an unrestricted sensitive payload data lake.

## Search Boundary

Cross-tenant search is denied by default. Buyer/vendor projections must be scoped. Global search is limited to approved internal roles. Sensitive search queries and payload access should themselves be auditable. Result exports require controls. Search rate limits are required. No unrestricted audit browsing is allowed.

## Boundary Risks

- Logs & Audit could become a correction workflow if reprocessing or reupload history mutates source records directly.
- Logs & Audit could become an unrestricted sensitive data lake if payload backups are stored without redaction and retention controls.
- Logs & Audit could become Vendor Integration if it starts owning credentials, transports, schedules, mappings, transforms, or delivery mechanics.
- Logs & Audit could become Analytics if audit search turns into business reporting and metric ownership.
- Logs & Audit could become Notification if audit events directly manage recipients, templates, and delivery retries.
- Logs & Audit could weaken source-module boundaries if operators treat audit records as authoritative business records.

## Open Questions

- Which source modules must emit audit records synchronously?
- Which audit records are internal-only versus buyer/vendor-visible?
- Which payloads may be stored in full versus masked references only?
- Which reprocess actions require source-module approval?
- Which audit events trigger future notifications?
- Which vendor integration behaviors require a future Vendor Integration module?

## Scheduled System Admin Activity Summary Evidence Boundaries (Cross-Module PR)

This section declares the Logs & Audit File Tracking side of the cross-module boundary surface for the scheduled summary email hardening pass. Each of the three target modules (Notification Platform Service, Analytics / Reporting, Logs & Audit File Tracking) carries a reciprocal boundary section. Source modules and supporting modules are not modified by this PR. This PR's Logs & Audit additions are scoped to the summary-specific evidence surfaces required by the Cross-Module Summary Emails PR; full Logs & Audit File Tracking module hardening remains a separate later hardening area.

### Logs & Audit File Tracking owns (PR-C additions)

- Activity Summary Generated Evidence entity, immutability, retention.
- No-Activity Summary Suppression Evidence entity, immutability, retention.
- One PR-C workflow: Summary Audit Evidence Recording (Logs & Audit Workflow 10).
- Two PR-C events: `audit.activity-summary-evidence.recorded`, `audit.activity-summary-suppression-evidence.recorded`.
- Retention of Activity Summary Delivery Attempt by reference (via the existing Audit Record entity pattern; no new entity duplicates the delivery attempt lifecycle).
- Retention of Activity Summary Configuration lifecycle transitions by reference (via the existing Audit Record entity pattern).
- Retention of Missed Window Carry-Forward references by mirroring the Reporting Window's `carry_forward_window_reference_collection` field onto the Activity Summary Generated Evidence record.

### Logs & Audit File Tracking does not own (PR-C reaffirmations)

- Activity Summary Configuration entity and Activity Summary Delivery Attempt entity lifecycle. Notification Platform Service owns these; Logs & Audit File Tracking retains them by reference.
- Activity Summary Reporting Window entity, Activity Summary Aggregation Record entity, source-fact aggregation. Analytics / Reporting owns these.
- Source-module records, source-module events, source-module workflow state. Source modules (Order Routing, Fulfillment / Returns) own these.
- Email transport mechanics. Integration Management or the provider layer owns these.
- CIXCI System Admin role definition, `check_access` resolution. Tenant Company owns these.
- Cursor advancement logic. The cursor lives on the Notification Platform Service Activity Summary Configuration and is advanced exclusively by NPS Workflow 9. NPS Workflow 9 has two trigger paths: Trigger A (delivery acknowledged) and Trigger B (consumed no-activity-suppression-outcome). Logs & Audit File Tracking retains the cursor-advancement audit record via the existing Audit Record entity pattern; it does not perform the cursor mutation.
- New retention class, redaction class, or access class introduction. The new evidence types use existing patterns.

### Cross-module dependency on Notification Platform Service

- Logs & Audit File Tracking receives triggers from Notification Platform Service on:
  - Configuration lifecycle transitions (NPS Workflow 1): created, updated, paused, retired.
  - Delivery attempt dispatched (NPS Workflow 7).
  - Delivery attempt succeeded (NPS Workflow 9).
  - Delivery attempt failed (NPS Workflow 8).
- For these triggers, Logs & Audit creates audit records via the existing Audit Record entity pattern. No new Logs & Audit entity is required for these triggers.

### Cross-module dependency on Analytics / Reporting

- Logs & Audit File Tracking receives triggers from Analytics / Reporting on:
  - Workflow 5 success (non-empty aggregation): creates Activity Summary Generated Evidence.
  - Workflow 6 suppression (no-activity): creates No-Activity Summary Suppression Evidence.
- These are the two PR-C-introduced Logs & Audit entities.

### Tenant Company boundary

- Tenant Company owns role definition and `check_access` resolution. Logs & Audit File Tracking uses existing role and access patterns to enforce search and retention policy for the new evidence types.
- Activity Summary Generated Evidence and No-Activity Summary Suppression Evidence are internal-scope (CIXCI System Admin only). The existing Logs & Audit access patterns enforce this.
- Logs & Audit File Tracking does not modify any Tenant Company file.

### Integration Management boundary

- Integration Management owns transport-layer records; Logs & Audit File Tracking does not interact with transport.
- The Activity Summary Delivery Attempt's `transport_reference`, `delivery_acknowledgement_reference`, and `delivery_failure_reference` fields are owned by Notification Platform Service; Logs & Audit retains the audit records that mention these references via existing Audit Record entity patterns.
- Logs & Audit File Tracking does not modify any Integration Management file.

### Source-module boundary

- Logs & Audit File Tracking does not consume source-module events directly for the PR-C summary domain. The summary-related source events (PR #91, PR #92, PR #94) are consumed by Analytics / Reporting; Logs & Audit File Tracking is involved only when Analytics or Notification Platform signals it.
- Logs & Audit File Tracking continues to consume source-module events for its existing baseline workflows (audit records, file tracking, API transmission logs, validation results, processing results); those patterns are not modified by this PR.
- PR #91, PR #92, PR #93, PR #94 entities, events, contracts: not modified.

### Logs & Audit File Tracking deferrals (Phase 1)

PR-C does not introduce:

- Full Logs & Audit File Tracking module hardening; that remains a separate later hardening area.
- New retention classes, redaction classes, or access classes; existing patterns apply to the new entities.
- Search-index or search-API changes beyond existing patterns.
- Storage mechanics, query plans, or implementation-level retention duration.
- Payload reference rule changes.
- Direct source-module event consumption for the summary domain.
- Mutation of canonical records owned by Notification Platform Service or Analytics / Reporting.

### Files this PR does NOT touch (Logs & Audit File Tracking side)

- `modules/logs-audit-file-tracking/openapi-contracts.md` (forbidden in PR-C).
- Any file under source modules (Order Routing, Fulfillment / Returns).
- Any file under Tenant Company, Integration Management.
- Any file under Notification Platform Service or Analytics / Reporting other than the PR-C targeted files (the boundary statements here are about respect of the partner modules, not modifications to them; PR-C does modify counterpart files in those two modules per the cross-module scope).
- Any file under Invoice Management, Pricing, Product Catalog, Device Catalog, Media / Image Asset Management, AI Agent Services modules.
- `modules/README.md`.
- Any ADR or platform standard.
- Any code, schema, migration, build, or lockfile.

### Phase 1 conservative defaults summary

- Two new evidence entities; both internal-scope.
- Existing retention, redaction, and access class patterns apply unchanged.
- Activity Summary Delivery Attempt retained by reference via existing Audit Record entity pattern.
- Missed Window Carry-Forward retained via mirrored field on Activity Summary Generated Evidence.
- One new workflow; not a full Logs & Audit hardening pass.
- No mutation of canonical records owned by other modules.
- No source-module modification.

## PR-A Boundary Contracts - Core Evidence Spine

This section reaffirms cross-module boundary discipline for PR-A. All existing baseline boundary contracts are preserved without modification.

### Logs & Audit File Tracking ownership (additional under PR-A)

Logs & Audit File Tracking owns:

- The Audit Record entity (existing baseline; hardened by PR-A with formalized source / actor / scope reference triad and optional `evidence_record_reference` back-link).
- The Evidence Record entity (new in PR-A; generic with `evidence_type` discriminator; carries source / external / actor / scope references, hash and attachment references, retention/redaction/access classes, metadata fields, and lineage references).
- The Evidence Amendment Record entity (formalized canonical name in PR-A; existing baseline "Audit Evidence Amendment Record" preserved; append-only small correction to existing Evidence Record).
- The Evidence Supersession Record entity (new in PR-A; append-only record that a new Evidence Record supersedes a prior one).
- The formalized reference types: Source Module Reference, Source Record Reference, Source Snapshot Reference, External Evidence Reference (sub-structure on Evidence Record, NOT standalone entity), Actor Reference, Service Trigger Reference, Company Scope Reference.
- The Evidence Record metadata field set: `evidence_schema_version`, `captured_at`, `source_event_reference`, `correlation_reference`, `trace_reference`, `idempotency_key`, `replay_safe_dedupe_reference`.
- The class enumerations: `retention_class`, `redaction_class`, `access_class`.
- The lifecycle states on Evidence Record: `active`, `superseded`, `amended_with_amendments`, `legal_hold`.
- The fields `restricted_evidence`, `raw_evidence_reference`, `redacted_view_reference`, `legal_hold_reference` (placeholder).
- The canonical rules: Source-of-Truth Boundary Rule (reaffirms baseline), External-Tool-Not-Source-of-Truth Rule (new in PR-A), Immutable Evidence Rule (reaffirms baseline), Source Snapshot Minimization Rule (new in PR-A), Evidence-Per-Lifecycle-Step Rule (new in PR-A), Audit-Record-and-Evidence-Record Separation Rule (new in PR-A), Amendment vs Supersession Distinction Rule (new in PR-A), Promotion-of-Naming Rule (one-time clarification; new in PR-A), At-Creation Classification Rule (new in PR-A).

### Logs & Audit File Tracking references but does NOT harden (PR-A)

The following existing baseline entity is referenced as existing baseline only. PR-A does NOT modify or harden it:

- **Audit Access Record.** PR-A does NOT add fields, modify lifecycle, or modify workflows. Access / search / review workflows are deferred to PR-D (access matrix) and PR-E (search and investigation).

### Source modules boundary (PR-A reaffirmation)

Source modules own (PR-A does NOT modify any source module file):

- Operational records.
- Business decisions.
- Validation rules.
- Correction decisions.
- State transitions.
- Source-module APIs and contracts.
- When to emit evidence.
- The semantic content of the evidence they emit (the source snapshot content, the row-level error detail, the evidence type meaning).
- The choice between amendment (small correction) and supersession (new evidence after source-record correction).

Logs & Audit observes; source modules decide. Logs & Audit does NOT validate source-module business logic, decide business outcomes, or mutate source-module records.

### Product Catalog boundary (PR-A reaffirmation)

Product Catalog continues to own (PR-A does NOT modify Product Catalog files):

- Product import / export workflow.
- Import / export operational state.
- Product records.
- Validation decisions.
- Buyer export decisions.
- Buyer Product Export Record, Export Confirmation Record, Buyer Accessory Export Baseline, Per-Buyer Accessory Relationship State, and all related Product Catalog source records.

Product Catalog's future manual vendor product import evidence (uploaded / validating / validation_failed / preview_ready / canceled_before_commit / committed / partially_committed / failed_commit / abandoned_after_preview), API vendor product import evidence, buyer API product export evidence (batch and item), exported SKU/media/pricing readiness references at export time, and export payload hash or minimized snapshot reference will conform to the Evidence Record spine via PR-C evidence_type catalog entries. PR-A does NOT define those evidence_type values.

### Order Routing boundary (PR-A reaffirmation)

Order Routing continues to own (PR-A does NOT modify Order Routing files):

- Order export operational state.
- Vendor order export lifecycle.
- Vendor export eligibility.
- Export delivery operational records.

Order Routing's future vendor order export evidence, vendor return export evidence, export schedule/window evidence, export delivery evidence, export review evidence, export failure evidence, handoff source snapshot references, export batch references, generated export file references, and email delivery attempt / success / failure references will conform to the Evidence Record spine via PR-C.

### Fulfillment / Returns boundary (PR-A reaffirmation)

Fulfillment / Returns continues to own (PR-A does NOT modify Fulfillment / Returns files):

- Shipping, delivery, return, correction, and SLA operational records.
- Vendor import lifecycle.
- Delivery date correction decisions.
- Return validation decisions.

Fulfillment / Returns's future vendor shipping import evidence, vendor delivery import evidence, vendor return import evidence, row-level validation evidence, accepted / rejected import row evidence, import committed / partially committed / failed / canceled evidence, vendor response receipt evidence, SLA evaluation evidence, SLA exception evidence, delivery date evidence, buyer update-ready evidence, correction evidence, and handoff consumption references will conform to the Evidence Record spine via PR-C.

### Media / Image Asset Management boundary (PR-A reaffirmation)

Media / Image Asset Management continues to own (PR-A does NOT modify Media files):

- Media lifecycle records.
- Source URL re-ingestion records.
- Media version records.
- Restriction records.
- SKU alias records.
- Upload recovery records.

Media's existing PR-A and PR-B evidence records (media upload session/job evidence, validation/processing evidence, assignment/readiness evidence, Media Asset Version evidence, restriction/revocation/expiry evidence, source URL re-ingestion / revalidation / change detection evidence, Version Supersession Evidence, SKU Alias Mapping approval evidence, Upload Failure Recovery Evidence) already emit `audit_reference`; they implicitly conform to the spine. PR-C catalogs Media evidence_type values.

### Integration Management boundary (PR-A reaffirmation)

Integration Management continues to own (PR-A does NOT modify Integration Management files):

- External transport.
- Provider calls.
- Webhook receipt.
- External IDs.
- Provider response.
- Retry / failure transport evidence.
- API and email transport mechanics where placed there.

The External Evidence Reference sub-structure on Evidence Record is the surface where Integration Management transport evidence attaches to Logs & Audit. Integration Management is reference-only in PR-A.

**External-Tool-Not-Source-of-Truth Rule (canonical, new in PR-A):**

- External evidence references are coordination and proof only.
- External systems must NEVER become CIXCI operational source of truth.
- Investigators and source-module logic must trace back to CIXCI source-module records, not to external system records, for canonical business state.
- Logs & Audit records external coordination evidence; Integration Management owns the transport that produces it.

### Notification Platform Service boundary (PR-A reference-only)

Notification Platform Service is reference-only under PR-A. PR-A does NOT modify Notification Platform Service files. PR-A does NOT introduce notification templates, routes, transport behavior, or notification delivery contracts.

**PR-C decision retained as open question:** whether vendor email export delivery evidence is owned by Logs & Audit OR by Notification Platform Service (with Logs references). Both options are architecturally valid; PR-A's Evidence Record supports either. PR-C decides in coordination with Notification Platform Service.

### Tenant Company boundary (PR-A reaffirmation)

Tenant Company continues to own (PR-A does NOT modify Tenant Company files):

- Users.
- Roles.
- Permissions.
- Company scope.
- Parent / child scope.
- Capability checks.
- `check_access` evaluation.

PR-A's Actor Reference, Service Trigger Reference, and Company Scope Reference are reference types to Tenant Company records. PR-A introduces NO new Tenant Company role, capability flag, or scope. PR-A authority-bearing actions (evidence creation, amendment submission, supersession authorization) flow through existing `check_access` patterns and existing baseline permission families.

### Analytics / Reporting boundary (PR-A reference-only)

Analytics / Reporting is reference-only under PR-A. PR-A does NOT modify Analytics / Reporting files. PR-A's emitted events (`audit.record.created`, `audit.evidence.recorded`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`) may be consumed by Analytics in a future PR; PR-A does NOT introduce Analytics-side consumption.

### Device Catalog, Pricing, Invoice Management, Procurement / Purchase Orders, Launch / Event Management, Warranty Registration, AI Agent Services (PR-A reference-only, untouched)

These modules are NOT touched by PR-A. Their future evidence emission conforms to the Evidence Record spine; evidence_type values are PR-C (or AI Agent Services PR-A for AI agent evidence when that module is built).

### Inherited deferral wording cleanup (PR-A boundary clarification)

The existing Logs & Audit baseline does not extensively reference future PRs by letter; PR-A does NOT need to do PR-A-to-PR-X wording cleanup of the kind Media PR-B needed. New PR-A-added language uses "PR-B" (File Tracking Foundation), "PR-C" (Cross-Module Evidence Catalog), "PR-D" (Retention / Redaction / Legal Hold / Access), "PR-E" (Search / Query / Review), and "future PR" / "future phase" directly.

### Forbidden file modifications under PR-A

PR-A must NOT modify any of the following:

- `modules/logs-audit-file-tracking/openapi-contracts.md`
- Any Order Routing file (`modules/order-routing/*`)
- Any Fulfillment / Returns file (`modules/fulfillment-returns/*`)
- Any Media / Image Asset Management file (`modules/media-image-asset-management/*`)
- Any Product Catalog file (`modules/product-catalog/*`)
- Any Integration Management file (`modules/integration-management/*`)
- Any Tenant Company file (`modules/tenant-company-model/*`)
- Any Analytics / Reporting file (`modules/analytics-reporting/*`)
- Any Notification Platform Service file (`modules/notification-platform-service/*`)
- Any AI Agent Services file (`modules/ai-agent-services/*`)
- Any Device Catalog file (`modules/device-catalog/*`)
- Any Invoice Management file (`modules/invoice-management/*`)
- Any Pricing file (`modules/pricing/*`)
- Any Procurement / Purchase Orders file (`modules/procurement-purchase-orders/*`)
- Any Launch / Event Management file (`modules/launch-event-management/*`)
- Any Warranty Registration file (`modules/warranty-registration/*`)
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`

### Critical rules summary (PR-A canonical)

- **Logs & Audit must NOT become operational source of truth.** Source modules remain canonical for operational records.
- **Logs & Audit must NOT mutate source module records.** Logs & Audit observes; source modules decide.
- **Logs & Audit records proof, lineage, references, and immutable evidence only.**
- **External tools must NEVER become CIXCI source of truth.** External evidence references are coordination/proof only.
- **Evidence records must NOT duplicate full operational records by default.** Source Snapshot Minimization Rule enforces selected metadata + hashes + references shape; full operational record copies are exceptional and gated by Full Payload Exception Record.
- **Evidence is append-only.** Amendments and supersessions create new records; original evidence is never mutated or deleted.
- **Every Audit-worthy action that produces an artifact creates an Evidence Record.** The Evidence-Per-Lifecycle-Step Rule ensures evidence coverage even on canceled / failed / partial outcomes.
- **Audit Record and Evidence Record are distinct entities.** Audit Record can exist without Evidence Record. Evidence Record always references its parent Audit Record.
- **Amendment and Supersession are distinct lifecycles.** Source modules choose the mechanism based on whether the source-module record was corrected (supersession) or the evidence itself needs clarification (amendment).
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/boundary-contracts.md`

> **Target file:** `modules/logs-audit-file-tracking/boundary-contracts.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline boundary contracts or PR-A boundary contracts).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Boundary Contracts - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Boundary Contracts - File Tracking Foundation

This section reaffirms cross-module boundary discipline for PR-B. All existing baseline and PR-A boundary contracts are preserved without modification.

### Logs & Audit File Tracking ownership (additional under PR-B)

Logs & Audit File Tracking owns:

- The hardened File Tracking Record entity (existing baseline preserved; PR-B adds spine integration references and discriminator fields).
- The hardened Duplicate File Detection Record entity (existing baseline preserved; PR-B adds spine integration references and clarifies tenant-scope-by-default and record-evidence-not-block discipline).
- The hardened Correction / Reupload History Record entity (existing baseline preserved; PR-B adds spine integration references and clarifies file-level vs evidence-level lineage).
- The hardened Reprocess / Retry Request Record entity (existing baseline preserved; PR-B adds spine integration references).
- The formalized Reprocess / Retry Outcome Record entity (existing baseline preserved; PR-B formalizes as narrow child/outcome record of Reprocess / Retry Request Record with explicit `outcome_status` enumeration).
- The new discriminator fields on File Tracking Record: `file_direction`, `file_purpose`, `file_lifecycle_status`.
- The new spine integration references on File Tracking Record: `evidence_record_reference`, `audit_record_reference`, `source_module_reference`, `source_record_reference`, `source_snapshot_reference`, `evidence_attachment_reference`, `external_evidence_reference` (sub-structure inherited from PR-A), `actor_reference`, `service_trigger_reference`, `company_scope_reference`.
- The new file-specific references on File Tracking Record: `file_storage_reference`, `file_hash_reference`, `file_integrity_reference`.
- Optional download foundation fields on File Tracking Record: `downloaded_at`, `source_file_tracking_record_reference`.
- The canonical rules introduced by PR-B: File-Level vs Evidence-Level Lineage Rule, File-Tracking-Tenant-Scope Rule, Duplicate-Detection-Cost-Control Rule (reaffirms baseline), Duplicate-Detection-Records-Evidence Rule, Reupload-Creates-New-File-Tracking-Record Rule, Retry-Creates-New-Evidence Rule, File-Lifecycle-Status-At-Creation Rule, Legacy-File-Direction-Preservation Rule, Reprocess-Terminal-Outcome Rule.

### Logs & Audit File Tracking references but does NOT harden (PR-B)

The following existing baseline entities are referenced only by PR-B. PR-B does NOT modify them:

- **Audit Access Record.** Existing baseline; PR-A scope; PR-D / PR-E will harden access workflows.
- **Full Payload Exception Record.** Existing baseline; PR-B Workflow 10 clarifies relationship; entity not modified.
- **Validation Result Record, Processing Result Record, Row-Level Validation Error Record, Partial File Processing Record, Row Count Summary, Accepted Row Count Summary, Failed Row Count Summary, Error Summary, Retry/Failure History.** Existing baseline preserved. PR-B Workflow 9 documents linkage; entities not modified.
- **API Transmission Log, Transmission Attempt Record, Request Reference, Response Reference, Masked Request/Response Reference, Retry Count, Error Code/Message, Correlation Id, Idempotency Key.** Existing baseline preserved.
- **Vendor Manual Order Export Record, Vendor Manual Return Export Record, Vendor Shipping Import Record, Vendor Return Outcome Import Record, Vendor File Workflow Reference, Vendor Operational Activity Evidence Record.** Existing baseline preserved. PR-B documents how these flows map onto the new file_direction / file_purpose / file_lifecycle_status discipline; PR-C catalogs evidence_type values.

### PR-A spine entities referenced only by PR-B (NOT modified)

- **Audit Record** (PR-A hardened).
- **Evidence Record** (PR-A new generic entity with `evidence_type` discriminator). PR-B references via the new File Tracking Record `evidence_record_reference` field; PR-A schema is NOT modified.
- **Evidence Amendment Record** (PR-A formalized canonical name).
- **Evidence Supersession Record** (PR-A new entity). PR-B invokes via Workflow 7 (Correction / Reupload Lineage) and Workflow 8 (Reprocess / Retry).
- **PR-A reference types** (Source Module / Source Record / Source Snapshot Reference, External Evidence Reference sub-structure, Actor / Service Trigger / Company Scope Reference). Used throughout PR-B.

### Source modules boundary (PR-B reaffirmation)

Source modules own (PR-B does NOT modify any source module file):

- Operational records, business decisions, validation rules, correction decisions, state transitions, source-module APIs and contracts.
- When to emit file evidence.
- The semantic content of files (the data inside).
- Validation rules and business outcomes (validation decides accept/reject; Logs & Audit records the decision).
- Processing outcomes (commit/cancel/partial-commit/fail decisions).
- Correction outcomes (whether to mark an evidence record as needing amendment, supersession, or new file lineage).
- Reupload decisions (when a reupload is warranted; Logs & Audit creates the new File Tracking Record).
- Retry / reprocess execution decisions (whether to run a retry; Logs & Audit records request and outcome).
- Download authorization (who can download what; Logs & Audit records the download event).
- Generated file content decisions (what data goes in an export; Logs & Audit records the file artifact).
- Whether a duplicate detected by Logs & Audit should be blocked, warned, accepted, rejected, ignored, or reprocessed.

Logs & Audit observes; source modules decide.

### Product Catalog boundary (PR-B reaffirmation)

Product Catalog continues to own (PR-B does NOT modify Product Catalog files):

- Product import / export workflow.
- Import / export operational state.
- Product records.
- Buyer export decisions.
- Product payload / projection rules.
- Buyer Product Export Record and related Product Catalog source records.

Product Catalog's file activity conforms to PR-B's File Tracking Record:

- Product import files: `file_direction = uploaded`, `file_purpose = product_import`.
- Product export files (system-generated): `file_direction = generated`, `file_purpose = product_export`.
- Product export files (buyer-downloaded): `file_direction = downloaded`, `file_purpose = product_export`.

PR-C catalogs evidence_type values with `import_method` and `export_method` discriminators.

### Order Routing boundary (PR-B reaffirmation)

Order Routing continues to own (PR-B does NOT modify Order Routing files):

- Vendor order / return export workflow.
- Export operational state.
- Export batch eligibility.
- Order / suborder references.

Order Routing's file activity conforms to PR-B's File Tracking Record:

- Generated vendor order export CSV: `file_direction = generated`, `file_purpose = vendor_order_export`.
- Generated vendor return export CSV: `file_direction = generated`, `file_purpose = vendor_return_export`.
- Email delivery attempt: optional `external_evidence_reference` sub-structure on File Tracking Record.

PR-C catalogs evidence_type values.

### Fulfillment / Returns boundary (PR-B reaffirmation)

Fulfillment / Returns continues to own (PR-B does NOT modify Fulfillment / Returns files):

- Vendor shipping / delivery / return import workflow.
- Delivery / return / correction / SLA operational records.
- Row validation rules (the rules; Logs & Audit records outcomes).
- Import commit / cancel business outcomes.

Fulfillment / Returns's file activity conforms to PR-B's File Tracking Record:

- Vendor shipping import file: `file_direction = uploaded`, `file_purpose = vendor_shipping_import`.
- Vendor delivery import file: `file_direction = uploaded`, `file_purpose = vendor_delivery_import`.
- Vendor return import file: `file_direction = uploaded`, `file_purpose = vendor_return_import`.

PR-C catalogs evidence_type values.

### Media / Image Asset Management boundary (PR-B reaffirmation)

Media / Image Asset Management continues to own (PR-B does NOT modify Media files):

- Media lifecycle records.
- Source URL re-ingestion records.
- Media version records.
- Restriction records.
- SKU alias records.
- Upload recovery records.

Media's file activity conforms to PR-B's File Tracking Record:

- Media file upload: `file_direction = uploaded`, `file_purpose = media_upload`.
- Source URL re-ingestion file: same pattern.

Media's existing PR-A and PR-B evidence records (which emit `audit_reference` and conform to the PR-A Evidence Record spine) link to File Tracking Records via `evidence_attachment_reference` where file artifacts are tracked.

### Integration Management boundary (PR-B reaffirmation)

Integration Management continues to own (PR-B does NOT modify Integration Management files):

- External transport.
- Provider calls.
- API / file / email transport where applicable.
- External IDs / provider responses.
- Retry / failure transport evidence.

The External Evidence Reference sub-structure (PR-A) on File Tracking Record is the surface where Integration Management transport-layer evidence attaches. PR-B reuses the PR-A sub-structure verbatim. Integration Management is reference-only in PR-B.

### Notification Platform Service boundary (PR-B reference-only)

Notification Platform Service is reference-only under PR-B. PR-B does NOT modify Notification Platform Service files. PR-B does NOT introduce notification templates, routes, transport behavior, or notification delivery contracts.

**PR-C decision retained:** whether vendor email export file delivery evidence is owned by Logs & Audit (File Tracking Record carrying delivery attempt fields via External Evidence Reference sub-structure) or by Notification Platform Service (with File Tracking Record references). Both options are architecturally valid; PR-B's File Tracking Record supports either. PR-C decides in coordination with Notification Platform Service.

### Tenant Company boundary (PR-B reaffirmation)

Tenant Company continues to own (PR-B does NOT modify Tenant Company files):

- Users, roles, permissions, company scope, parent / child scope, capability checks.
- `check_access` evaluation.

PR-B's Actor Reference, Service Trigger Reference, and Company Scope Reference (inherited from PR-A) resolve through Tenant Company. PR-B introduces NO new Tenant Company role, capability flag, or scope. PR-B authority-bearing actions (File Tracking Record creation, Duplicate File Detection Record creation, Correction/Reupload History Record creation, Reprocess/Retry Request Record creation, Reprocess/Retry Outcome Record creation) flow through existing `check_access` patterns and existing baseline permission families.

### Analytics / Reporting boundary (PR-B reference-only)

Analytics / Reporting is reference-only under PR-B. PR-B does NOT modify Analytics / Reporting files. PR-B's events may be consumed by Analytics in a future PR; PR-B does NOT introduce Analytics-side consumption.

### Device Catalog, Pricing, Invoice Management, Procurement / Purchase Orders, Launch / Event Management, Warranty Registration, AI Agent Services (PR-B reference-only, untouched)

Not touched by PR-B. Their future file evidence emission conforms to the File Tracking Record foundation; evidence_type values are PR-C (or AI Agent Services PR-A for AI agent file evidence when that module is built).

### Inherited deferral wording cleanup (PR-B boundary clarification)

PR-B uses the inherited deferral wording established by PR-A: "PR-B" (File Tracking Foundation - this PR), "PR-C" (Cross-Module Evidence Catalog), "PR-D" (Retention / Redaction / Legal Hold / Access), "PR-E" (Search / Query / Review), and "future PR" / "future phase".

### Forbidden file modifications under PR-B

PR-B must NOT modify any of the following:

- `modules/logs-audit-file-tracking/openapi-contracts.md`
- Any Order Routing file (`modules/order-routing/*`)
- Any Fulfillment / Returns file (`modules/fulfillment-returns/*`)
- Any Media / Image Asset Management file (`modules/media-image-asset-management/*`)
- Any Product Catalog file (`modules/product-catalog/*`)
- Any Integration Management file (`modules/integration-management/*`)
- Any Tenant Company file (`modules/tenant-company-model/*`)
- Any Analytics / Reporting file (`modules/analytics-reporting/*`)
- Any Notification Platform Service file (`modules/notification-platform-service/*`)
- Any AI Agent Services file (`modules/ai-agent-services/*`)
- Any Device Catalog file (`modules/device-catalog/*`)
- Any Invoice Management file (`modules/invoice-management/*`)
- Any Pricing file (`modules/pricing/*`)
- Any Procurement / Purchase Orders file (`modules/procurement-purchase-orders/*`)
- Any Launch / Event Management file (`modules/launch-event-management/*`)
- Any Warranty Registration file (`modules/warranty-registration/*`)
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`

### Critical rules summary (PR-B canonical)

- **Logs & Audit must NOT become operational source of truth for files.** File Tracking Record is evidence and lineage; source modules remain canonical for operational file state.
- **Logs & Audit must NOT mutate source-module records.** File Tracking observes; source modules decide outcomes.
- **External tools must NEVER become CIXCI source of truth.** External file references are coordination/proof only.
- **File evidence is append-only.** File Tracking Records, Duplicate File Detection Records, Correction/Reupload History Records, Reprocess/Retry Request Records, Reprocess/Retry Outcome Records are all append-only.
- **Duplicate detection is tenant-scoped by default.** Cross-tenant duplicate comparison is denied. Duplicate detection creates evidence; source modules decide outcome.
- **Reupload creates a new File Tracking Record.** Prior record transitions to `replaced`. Original file preserved (append-only).
- **Retry / reprocess that produces new evidence invokes PR-A Evidence Supersession.** Retry / reprocess that produces no new evidence appends only the Reprocess / Retry Outcome Record (with `outcome_status = no_new_evidence`).
- **The `file.reprocess.completed` event is terminal-outcome (NOT success-only).** Carries required `outcome_status` enum with values `completed`, `failed`, `canceled`, `blocked`, `no_new_evidence`.
- **Legacy/baseline `file_direction: import or export` wording is preserved verbatim.** PR-B's normalized `file_direction` is operational direction (uploaded / generated / downloaded). Implementation-level naming reconciliation is deferred.
- **File evidence retention / redaction / access classes are assigned at File Tracking Record creation.** PR-D will define the full hardening.
- **Source snapshots attached to file evidence are minimized.** Full operational record copies are exceptional and require Full Payload Exception Record approval.
- **All PR-A canonical rules apply to file evidence.**
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/boundary-contracts.md`

> **Target file:** `modules/logs-audit-file-tracking/boundary-contracts.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Boundary Contracts - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Boundary Contracts - Cross-Module Evidence Catalog

This section reaffirms cross-module boundary discipline for PR-C. All existing baseline, PR-A, and PR-B boundary contracts are preserved without modification.

### Logs & Audit File Tracking ownership (additional under PR-C)

Logs & Audit File Tracking owns:

- The Evidence Family Catalog (15 families).
- The Evidence Type Catalog (87 starter / placeholder values; zero final identifiers; zero enumerated AI / Warranty values).
- The Evidence Type Reference Requirements table.
- The Evidence Backing Classification rubric.
- The Evidence Type Status Discipline rubric (4 status values; starter / placeholder / future / final).
- The Default Class Guidance Discipline rubric (suggestion-only; PR-D locks policy).
- The 4 PR-C canonical rules: Evidence Type Status Discipline Rule, Default Class Guidance Suggestion-Only Rule, Evidence Family Closed-Set Rule (PR-C scope), Catalog Additive-Only Rule.

### Logs & Audit File Tracking does NOT own (PR-C reaffirmation)

- Any operational record in any source module.
- Any business decision in any source module.
- Any lifecycle state in any source module.
- Any validation rule in any source module.
- The decision of when a source module emits evidence.
- The semantic content of evidence (what is in the evidence; source modules decide).
- Retention duration matrix (PR-D).
- Full access matrix (PR-D).
- Legal hold workflows or Legal Hold entity (PR-D).
- Redaction transformation workflows (PR-D).
- Search / query / review workflows (PR-E).
- OpenAPI hardening (future API Governance Foundation PR).
- AI Agent Services evidence taxonomy (future PR after module exists).
- Warranty Registration evidence taxonomy (future PR after module exists).
- Audit Access Record hardening (existing baseline; PR-A scope; PR-D / PR-E will harden).
- Full Payload Exception Record entity (existing baseline; PR-B Workflow 10 referenced only).

### Source module per-family boundary discipline (PR-C reaffirmation)

For each of the 15 families:

#### product_catalog boundary

Product Catalog continues to own (PR-C does NOT modify Product Catalog files):

- Product import / export workflow.
- Import / export operational state.
- Product records.
- Buyer export decisions.
- Product payload / projection rules.
- Buyer Product Export Record, Export Confirmation Record, Buyer Accessory Export Baseline, Per-Buyer Accessory Relationship State.
- Buyer-scoped projection rules.
- Compatibility sync logic (NOT Logs-owned).
- Stop-selling decisions.
- Buyer product activation decisions.

PR-C catalogs evidence_type values for product_catalog; Product Catalog decides what evidence is emitted and when.

#### device_catalog boundary

Device Catalog continues to own (PR-C does NOT modify Device Catalog files):

- Device import operational state.
- Feature / capability state.
- Compatibility-impacting decisions.
- My Devices reference projections.
- Device deactivation / retirement decisions.

PR-C catalogs evidence_type values for device_catalog as PLACEHOLDER; Device Catalog source-module hardening promotes during future PR.

#### media boundary

Media / Image Asset Management continues to own (PR-C does NOT modify Media files):

- Media lifecycle records.
- Source URL re-ingestion records.
- Media version records.
- Restriction records.
- SKU alias records.
- Upload recovery records.
- Version supersession decisions.

PR-C catalogs evidence_type values for media; Media source-module retains decision authority.

#### order_routing boundary

Order Routing continues to own (PR-C does NOT modify Order Routing files):

- Vendor order / return export workflow.
- Export operational state.
- Export batch eligibility.
- Order / suborder references.
- Routing decisions.
- Handoff source snapshots.
- Export review decisions.

PR-C catalogs evidence_type values; Order Routing decides emission.

#### fulfillment_returns boundary

Fulfillment / Returns continues to own (PR-C does NOT modify Fulfillment / Returns files):

- Vendor shipping / delivery / return import workflow.
- Delivery / return / correction / SLA operational records.
- Row validation rules.
- Import commit / cancel business outcomes.
- Buyer update-ready signal decisions.

PR-C catalogs evidence_type values; Fulfillment / Returns decides emission.

#### integration_management boundary

Integration Management continues to own (PR-C does NOT modify Integration Management files):

- External transport.
- Provider calls.
- API / file / email transport.
- External IDs / provider responses.
- Retry / failure transport evidence.
- Circuit breaker state.
- Rate limit state.

PR-C catalogs evidence_type values; Integration Management decides emission. External-Tool-Not-Source-of-Truth Rule applies.

#### notification_platform boundary

Notification Platform Service continues to own (PR-C does NOT modify Notification Platform Service files):

- Notification delivery state.
- Email delivery state.
- Suppression decisions.
- Activity summary content decisions.

PR-C catalogs evidence_type values. The Logs-vs-Notification ownership question for `vendor_export_delivery` and related transport evidence remains an open question; PR-C supports both options via External Evidence Reference sub-structure.

#### invoice_management boundary

Invoice Management continues to own (PR-C does NOT modify Invoice Management files):

- Invoice records.
- Invoice generation lifecycle.
- Invoice adjustment decisions.
- Accounting sync.
- Invoice payload content decisions.

PR-C catalogs evidence_type values as PLACEHOLDER.

#### pricing boundary

Pricing continues to own (PR-C does NOT modify Pricing files):

- Pricing records.
- Pricing snapshot lifecycle.
- Pricing validation rules.
- Pricing exception decisions.
- Commission / revshare calculations.

PR-C catalogs evidence_type values as PLACEHOLDER.

#### analytics_reporting boundary

Analytics / Reporting continues to own (PR-C does NOT modify Analytics / Reporting files):

- Reporting / aggregation logic.
- Metrics / dashboard definitions.
- Report file generation.

PR-C catalogs evidence_type values as PLACEHOLDER.

#### tenant_company boundary

Tenant Company continues to own (PR-C does NOT modify Tenant Company files):

- Users, roles, permissions, company scope, parent / child scope, capability checks.
- `check_access` evaluation.
- Role / permission change decisions.
- Capability assignment decisions.
- Company status change decisions.

PR-C catalogs evidence_type values for tenant_company; Tenant Company retains decision authority. PR-C does NOT introduce new roles, capability flags, scopes, or permission families.

#### procurement_purchase_orders boundary

Procurement / Purchase Orders continues to own (PR-C does NOT modify Procurement / Purchase Orders files):

- PO records.
- PO lifecycle decisions.
- PO exception decisions.

PR-C catalogs evidence_type values as PLACEHOLDER.

#### launch_event_management boundary

Launch / Event Management continues to own (PR-C does NOT modify Launch / Event Management files):

- Launch records.
- Event lifecycle decisions.
- Release activation decisions.

PR-C catalogs evidence_type values as PLACEHOLDER.

#### ai_agent_services_placeholder boundary

AI Agent Services module does NOT exist on origin/main.

PR-C reserves the family slot only. PR-C does NOT enumerate evidence_type values. PR-C does NOT make source-module assumptions. When the AI Agent Services module is built, a future PR will populate the family with starter values.

#### warranty_registration_placeholder boundary

Warranty Registration module does NOT exist on origin/main.

PR-C reserves the family slot only. PR-C does NOT enumerate evidence_type values. PR-C does NOT make source-module assumptions. When the Warranty Registration module is built, a future PR will populate the family with starter values.

### External tools and CIXCI source-of-truth boundary (reaffirmation)

PR-A's External-Tool-Not-Source-of-Truth Rule applies to all `external_backed` evidence_type values in PR-C. External provider responses, webhook receipts, email delivery acknowledgements, and external system actions are coordination evidence; CIXCI source modules remain the source of truth for the underlying operational state.

### File Tracking Record relationship (PR-B + PR-C)

For evidence_type values that are `file_backed`:

- The Evidence Record's `evidence_type` carries the PR-C taxonomic identifier.
- The File Tracking Record's `file_purpose` carries the PR-B file-tracking discriminator value.
- The two are complementary dimensions.
- PR-C recommends aligning string identifiers where possible (e.g., `evidence_type = vendor_shipping_import` paired with `file_purpose = vendor_shipping_import`).
- PR-B's spine integration references (`evidence_record_reference`, `audit_record_reference`, `file_storage_reference`, `file_hash_reference`) connect the two dimensions.

### Audit Access Record (PR-C reaffirmation)

The existing baseline Audit Access Record entity remains unchanged by PR-C. PR-D / PR-E will harden access workflows. PR-C does NOT introduce access workflows.

### Forbidden file modifications under PR-C

PR-C must NOT modify any of the following:

- `modules/logs-audit-file-tracking/openapi-contracts.md`
- Any file under `modules/product-catalog/`
- Any file under `modules/device-catalog/`
- Any file under `modules/media-image-asset-management/`
- Any file under `modules/order-routing/`
- Any file under `modules/fulfillment-returns/`
- Any file under `modules/integration-management/`
- Any file under `modules/notification-platform-service/`
- Any file under `modules/invoice-management/`
- Any file under `modules/pricing/`
- Any file under `modules/analytics-reporting/`
- Any file under `modules/tenant-company-model/`
- Any file under `modules/procurement-purchase-orders/`
- Any file under `modules/launch-event-management/`
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`

Note: `modules/ai-agent-services/` and `modules/warranty-registration/` directories do NOT exist on origin/main; PR-C does not attempt to modify them.

### PR-C canonical rules summary

- **Evidence Type Status Discipline Rule.** Starter values are usable architecture labels but NOT stable subscriber contracts. Placeholder values are NOT stable subscriber contracts. Future is reserved for family slots only. Promotion from starter to final requires an explicit future PR.
- **Default Class Guidance Suggestion-Only Rule.** Default retention_class / redaction_class / access_class / restricted_evidence guidance is suggestion-only; PR-D owns locked policy.
- **Evidence Family Closed-Set Rule (PR-C scope).** PR-C catalogs 15 families. Future families may be added by future PRs.
- **Catalog Additive-Only Rule.** PR-C does NOT rename, remove, or rewrite any PR-A / PR-B / existing baseline content.

### Critical rules summary (PR-C reaffirmation)

- Logs & Audit must NOT become operational source of truth for any source module.
- Source modules retain canonical ownership of operational records, business decisions, lifecycle state, validation rules, and evidence emission timing.
- External tools must NEVER become CIXCI source of truth.
- All evidence is append-only.
- The `audit.evidence.recorded` event with `evidence_type` discriminator is the canonical evidence emission surface; per-evidence-type and per-family events are NOT introduced.
- Default class guidance is suggestion-only; PR-D locks policy.
- Starter identifiers are NOT stable subscriber contracts; promotion to final requires future PR.
- Placeholder identifiers are NOT stable subscriber contracts; subject to refinement / consolidation / removal.
- AI Agent Services and Warranty Registration are reserved family slots ONLY with zero enumerated values until source modules exist.
- PR-A canonical rules (9) and PR-B canonical rules (9) all apply to PR-C evidence_type values.
- PR-C is documentation-only; no operational entities, no schema-level structures, no new events, no source-module behavior changes.
```

## PR-D Boundary Contracts - Retention / Redaction / Legal Hold / Access Governance

This section reaffirms cross-module boundary discipline for PR-D. All existing baseline, PR-A, PR-B, and PR-C boundary contracts are preserved without modification.

### Logs & Audit File Tracking ownership (additional under PR-D)

Logs & Audit File Tracking owns:

- The Retention Policy Matrix, Redaction Policy Matrix, Access Policy Matrix.
- The Evidence Governance Policy Matrix umbrella reference (NOT a fourth matrix).
- The Legal Hold Record entity (NEW).
- The Retention Disposition Record entity (NEW append-only).
- The Redaction Transformation Record entity (NEW append-only).
- The hardened Audit Access Record (existing baseline; PR-D adds discriminators).
- Retention class meanings (6 classes; locked).
- Redaction class enumeration (9 values; locked; includes preserved `public_metadata_placeholder`).
- Access class meanings (6 PR-A values; preserved verbatim).
- Access policy tier (4 values; separate concept from access_class; Access Policy Matrix only).
- Retention disposition states (6).
- Legal Hold statuses (3).
- access_result discriminator (`attempted` non-terminal; `granted` terminal; `denied` terminal).
- view_type discriminator (raw / redacted).
- Named retention policy references (6).
- The 6 PR-D additive events.
- The 13 PR-D numbered workflows.
- The 19 PR-D canonical rules.

### Logs & Audit File Tracking does NOT own (PR-D reaffirmation)

- Tenant Company users, roles, permissions, parent / child scope, capability checks, service identities. **Tenant Company.**
- Source-module operational records, business decisions, validation rules, generated content, lifecycle state, evidence emission timing. **Per source module.**
- Concrete retention duration values. **CPA / legal / DevOps.**
- Legal hold authority decisions. **Compliance / legal.** PR-D documents the expectation; Logs & Audit logs the application via Legal Hold Record.
- Break-glass approval authority. **Security / Compliance role.** PR-D documents the expectation; Logs & Audit logs the access via `break_glass_flag`.
- New Tenant Company permission families. **Future Tenant Company coordination PR.**
- Search / query / review workflows. **PR-E.**
- OpenAPI hardening. **Future API Governance Foundation PR.**
- Buyer / vendor download UX. **PR-E or future.**
- Audit export download UX. **PR-E.**
- External evidence reference validation. **PR-E or future.**
- Concrete redaction transformation algorithm per redaction class. **Implementation.**
- Concrete archive storage tier definition. **DevOps.**
- Concrete purge execution mechanism. **DevOps.**

### Tenant Company boundary (PR-D reaffirmation)

Tenant Company continues to own:

- Users, roles, permissions, parent / child scope, capability checks (`check_access`).
- Service identities.
- Role grant / revoke workflows.
- Tenant authority for elevated access (Compliance / Audit Reviewer, Raw Access Authorizer, break-glass approver - PR-D documents expectations; future Tenant Company coordination PR creates the actual role / capability families).

Tenant Company does NOT own:

- Evidence retention / redaction / legal hold / access RECORD ENTITIES (Logs & Audit owns).
- Evidence governance POLICY (Logs & Audit owns; PR-D locks).

**Coordination boundary.** Logs & Audit evaluates Access Policy Matrix; Tenant Company evaluates `check_access`. Both run during access governance; both must succeed for access grant. PR-D documents the coordination; future Tenant Company coordination PR formalizes if needed.

### Source module per-family boundary discipline (PR-D reaffirmation)

For all 15 PR-C families (13 active + 2 reserved placeholder), PR-D documents how their evidence is GOVERNED under retention / redaction / legal hold / access policy. PR-D does NOT modify source-module operational records, decisions, lifecycle, validation, or emission timing. Source modules retain canonical operational source-of-truth ownership.

For each family, PR-D's evidence type sensitivity mapping is the LOCKED default governance guidance (vs PR-C's suggestion-only). Source modules MAY override at-creation classification per PR-A's At-Creation Classification Rule when their own sensitivity assessment requires.

PR-D does NOT change PR-C catalog identifiers; only governance policy guidance.

### External tool boundary (PR-D reaffirmation)

PR-A's External-Tool-Not-Source-of-Truth Rule applies to all `external_backed` PR-C evidence_type values and to external evidence reference retention / access:

- External system removal does NOT trigger CIXCI retention disposition.
- External provider responses are coordination evidence; CIXCI source modules remain canonical for the underlying operational state.
- External evidence reference validation is deferred to PR-E or future.

### File Tracking Record relationship (PR-B + PR-D)

File-backed evidence governance flows through PR-B File Tracking Record (NOT modified by PR-D):

- File-backed Evidence Records use PR-B's File Tracking Record via `file_tracking_record_reference` (per PR-C reference requirements).
- PR-D's Retention Disposition workflow applies disposition states to file-backed evidence; payload purge preserves hash + tombstone storage reference per File-Metadata-Outlives-Payload Rule.
- PR-D's Redaction Transformation Record links to PR-B's `masked_payload_reference` for file-backed redacted views.
- PR-D's Legal Hold Record `file_scope` field references one or more File Tracking Records; legal hold blocks file payload purge.

### CPA / legal / DevOps boundary (PR-D reaffirmation)

- CPA / legal / DevOps own concrete retention duration values.
- PR-D uses named retention policy references (`retention_policy_standard`, `retention_policy_financial_long_term`, etc.).
- Concrete duration locking is a follow-up review pass after PR-D merges.

### Compliance / legal boundary (PR-D reaffirmation)

- Compliance / legal own legal hold authority decisions.
- PR-D's Legal Hold Record records the authority reference; PR-D does NOT decide whether to apply a hold.
- Compliance / legal apply / release holds via Legal Hold Apply / Release workflows.

### Forbidden file modifications under PR-D

PR-D must NOT modify any of the following:

- `modules/logs-audit-file-tracking/openapi-contracts.md`
- Any file under `modules/product-catalog/`
- Any file under `modules/device-catalog/`
- Any file under `modules/media-image-asset-management/`
- Any file under `modules/order-routing/`
- Any file under `modules/fulfillment-returns/`
- Any file under `modules/integration-management/`
- Any file under `modules/notification-platform-service/`
- Any file under `modules/invoice-management/`
- Any file under `modules/pricing/`
- Any file under `modules/analytics-reporting/`
- Any file under `modules/tenant-company-model/`
- Any file under `modules/procurement-purchase-orders/`
- Any file under `modules/launch-event-management/`
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`

Note: `modules/ai-agent-services/` and `modules/warranty-registration/` directories do NOT exist on origin/main; PR-D does not attempt to modify them.

### PR-D canonical rules summary

**Retention (5):**

- Legal-Hold-Overrides-Purge Rule.
- Immutable-Evidence-Retention Rule.
- Retention-Disposition-Append-Only Rule.
- File-Metadata-Outlives-Payload Rule.
- Source-Module-Deletion-Independence Rule.

**Redaction (5):**

- Redaction-Never-Overwrites-Raw Rule.
- Redacted-View-Default Rule.
- Redaction-Transformation-Append-Only Rule.
- Redacted-Views-Per-Audience Rule.
- Amendment-vs-Redaction-Distinction Rule.

**Legal Hold (3):**

- Legal-Hold-Does-Not-Mutate-Evidence Rule.
- Append-Only-During-Hold Rule.
- Legal-Hold-Apply-Append-Only Rule.

**Access (4):**

- Raw-Evidence-Access-Exceptional Rule.
- All-Access-Logged Rule.
- Service-Identity-Access-Logged Rule.
- Tenant-Company-Owns-Authority Rule.

**Governance / policy (2):**

- Governance-Policy-Locked-By-PR-D Rule (PR-A / PR-B / PR-C suggestion-only; PR-D locks; PR-A At-Creation Classification Rule remains in force).
- No-New-Tenant-Roles-In-PR-D Rule.

### Critical rules summary (PR-D reaffirmation)

- Logs & Audit must NOT become operational source of truth for any source module.
- Logs & Audit must NOT become Tenant Company permission authority.
- Source modules retain canonical ownership of operational records, business decisions, lifecycle state, validation rules, and evidence emission timing.
- Tenant Company retains canonical ownership of users, roles, permissions, parent / child scope, capability checks, service identities.
- External tools must NEVER become CIXCI source of truth.
- All evidence is append-only (per PR-A); retention disposition / redaction transformation / legal hold are append-only (per PR-D).
- The `audit.evidence.recorded` event (PR-A) with `evidence_type` discriminator (PR-C) remains the canonical evidence emission surface; PR-D adds 6 governance-lifecycle events with discriminators (`disposition_state`, `redaction_class`, `redaction_audience`, `access_result`, `view_type`).
- Default class guidance from PR-A / PR-B / PR-C was suggestion-only; PR-D LOCKS the governance policy.
- PR-A access_class values preserved verbatim; `access_policy_tier` is a SEPARATE concept.
- Redaction class enumeration INCLUDES preserved baseline `public_metadata_placeholder`.
- Retention duration values are owned by CPA / legal / DevOps; PR-D uses named policy references.
- Legal hold authority is owned by Compliance / legal; PR-D documents the expectation.
- AI Agent Services and Warranty Registration are reserved family slots ONLY with zero enumerated values; PR-D extends sensitivity mapping when modules exist.
- PR-A canonical rules (9), PR-B canonical rules (9), PR-C canonical rules (4) all apply to PR-D evidence governance.
- PR-D is documentation-and-architecture; no operational entities beyond 3 new + 1 hardened; no schema-level migrations; no source-module behavior changes.

## PR-E Boundary Contracts - Search / Query / Review / Investigation / Audit Report Export

This section reaffirms cross-module boundary discipline for PR-E. All existing baseline, PR-A, PR-B, PR-C, and PR-D boundary contracts are preserved without modification.

### Logs & Audit File Tracking ownership (additional under PR-E)

Logs & Audit File Tracking owns:

- The 5 PR-E entities: Evidence Search Session, Evidence Review Session, Evidence Collection Record, Review Note / Annotation, Audit Report Export Record.
- The Evidence Search Query and Search Filter Set sub-structures.
- The Search Scope Reference field.
- The Investigation Case Reference placeholder field.
- The Review Disposition enumeration.
- Chain-of-Custody View (rendered view; NOT an entity).
- Evidence Export Package (output pattern; NOT an entity).
- Search Index Projection (architecture concept; NOT an entity).
- Search filter dimension catalog (referenced; NO new filterable fields).
- The 4 PR-E events.
- The 13 PR-E numbered workflows.
- The 25 PR-E canonical rules.

### Logs & Audit File Tracking does NOT own (PR-E reaffirmation)

- Tenant Company users, roles, permissions, parent / child scope, capability checks (`check_access`), service identities. **Tenant Company.**
- Source-module operational records, business decisions, validation rules, generated content, lifecycle state, **operational reporting**. **Per source module.**
- BI / analytics reporting, metrics dashboards, trend analysis, business performance reporting, cross-module analytics indices. **Analytics / Reporting module.**
- Concrete query API endpoints / payloads / pagination cursor contracts. **Future API Governance Foundation PR.**
- Search index storage, search engines, runtime search execution, index rebuild mechanics, query execution engines. **Implementation.**
- Investigation Case Management entity (Investigation Case Reference is placeholder field only). **Future PR.**
- Concrete Compliance / Audit Reviewer / Raw Access Authorizer / Legal Hold Authority / Break-Glass Approver / Reviewer / Investigator role definitions. **Future Tenant Company coordination PR.**
- Per-tenant search override policy. **Future Tenant Company coordination PR.**
- Download UX (browser / desktop download experience). **Future UI / API.**
- Concrete export file format (PDF / CSV / JSON / ZIP). **Future UI / API.**
- Saved Search UI / Saved Search Record. **Future PR.**
- Evidence Review Queue UI / Evidence Review Queue Record. **Future UI.**
- Review Assignment UI / Review Assignment Record. **Future Tenant Company coordination.**
- Concrete retention duration values. **CPA / legal / DevOps** (per PR-D).
- Legal hold authority decisions. **Compliance / legal** (per PR-D).

### Tenant Company boundary (PR-E reaffirmation)

Tenant Company continues to own users, roles, permissions, parent / child scope, capability checks (`check_access`), service identities, and role grant / revoke workflows. PR-E search / review / export workflows defer to Tenant Company `check_access` for authority evaluation per Search-Defers-To-PR-D-Access-Governance Rule + PR-D Tenant-Company-Owns-Authority Rule.

### Source module per-family boundary discipline (PR-E reaffirmation)

For all 13 active PR-C source modules + 2 reserved placeholder family slots: PR-E search / review / export operates OVER their Evidence Records. PR-E does NOT modify source-module operational records, decisions, lifecycle, validation, or emission timing. Source modules retain canonical operational source-of-truth ownership.

Per **Search-Not-Source-of-Truth Rule** (PR-E canonical rule): Logs & Audit search returns Evidence Records (audit trail of events and decisions); source modules retain canonical operational source-of-truth. Logs & Audit search is NOT a substitute for source-module operational queries (e.g., "show me all current product catalog items" should query Product Catalog, NOT Logs & Audit search).

### Analytics / Reporting boundary (PR-E discipline)

Analytics / Reporting module owns:

- BI / analytics dashboards.
- Trend analysis.
- Metrics aggregation.
- Business performance reporting.
- Cross-module analytics indices.
- KPI generation and rollup.

Logs & Audit search / review / export is NOT Analytics:

- Logs & Audit search returns Evidence Records for investigation / audit / compliance purposes.
- Logs & Audit does NOT produce aggregated metrics, KPIs, or business intelligence reports.
- Audit Report Export Records are compliance / regulatory / investigation artifacts; NOT BI dashboards.

Per **Audit-Export-Not-Analytics Rule** (PR-E canonical rule): Audit exports are compliance / investigation / regulatory artifacts. Audit exports are NOT BI / analytics dashboards / metrics / trend reports / business-performance reporting (Analytics module owns BI surface). Audit exports do NOT produce aggregated KPIs or business intelligence outputs.

If Analytics needs evidence-derived metrics, Analytics module operates over its own evidence-emission Evidence Records (per PR-C `analytics_reporting` family) via the same PR-D access governance; Logs & Audit search is the investigation surface, Analytics is the BI surface.

### External tool boundary (PR-E reaffirmation)

PR-A External-Tool-Not-Source-of-Truth Rule applies to all `external_backed` PR-C evidence_type values and to external evidence reference search / retrieval. External system removal does NOT affect CIXCI evidence retention. External evidence reference validation is deferred (per PR-D deferral).

### File Tracking Record relationship (PR-B + PR-D + PR-E)

PR-E file-backed search / retrieval / export flows through PR-B File Tracking Record (NOT modified by PR-E):

- File-backed search results use PR-B's File Tracking Record fields.
- File-backed retrieval defaults to PR-B `masked_payload_reference` per File-Backed-Result-Masked-Default Rule.
- Audit Report Export Records use PR-B File Tracking Record with existing PR-B `audit_export` `file_purpose` value **ONLY when `export_status = generated`** (per Export-File-Tracking-Only-When-Artifact-Exists Rule); metadata-only / failed / canceled exports do NOT require File Tracking.

### PR-D governance relationship (PR-D + PR-E)

PR-E search / review / export operates OVER PR-D-governed evidence:

- Every result access flows through PR-D Workflow 8 -> hardened Audit Access Record (per Search-Defers-To-PR-D-Access-Governance Rule and Export-Access-Logged-Via-PR-D Rule).
- Per-audience result selection uses PR-D Redaction Transformation Record (per Per-Audience-Result-Selection Rule and PR-D Redacted-Views-Per-Audience Rule).
- Retention disposition state handling uses PR-D Retention Disposition Record state (per Purged-Reference-Only-Metadata-View Rule and Archived-Result-Availability-State Rule).
- Legal hold flag visibility uses PR-D Legal Hold Record state and PR-D Access Policy Matrix (per Legal-Hold-Flag-Visibility-Scoped Rule).
- Raw retrieval uses PR-D Workflow 9 (Raw Evidence Access).
- File-backed retrieval uses PR-D Workflow 12 (File-Backed Evidence Governance).
- Tenant / parent / child evaluation uses PR-D Workflow 13.

PR-E does NOT modify any PR-D entity, event, workflow, or canonical rule.

### CPA / legal / DevOps boundary (PR-E reaffirmation)

- CPA / legal / DevOps own concrete retention duration values (per PR-D).
- PR-E references PR-D's named retention policy references (`retention_policy_transient_short`, `retention_policy_standard`, `retention_policy_extended`, `retention_policy_financial_long_term`, `retention_policy_audit_critical_indefinite`, `retention_policy_legal_hold_indefinite`).
- Concrete duration locking remains a follow-up review pass after PR-D / PR-E merge.

### Compliance / legal boundary (PR-E reaffirmation)

- Compliance / legal own legal hold authority decisions (per PR-D).
- PR-E does NOT introduce hold-apply / hold-release flows.
- PR-E search / review / export respects active legal holds per PR-D Workflow 7 scope-match logic.

### Forbidden file modifications under PR-E

PR-E must NOT modify any of the following:

- `modules/logs-audit-file-tracking/openapi-contracts.md`
- Any file under `modules/product-catalog/`
- Any file under `modules/device-catalog/`
- Any file under `modules/media-image-asset-management/`
- Any file under `modules/order-routing/`
- Any file under `modules/fulfillment-returns/`
- Any file under `modules/integration-management/`
- Any file under `modules/notification-platform-service/`
- Any file under `modules/invoice-management/`
- Any file under `modules/pricing/`
- Any file under `modules/analytics-reporting/`
- Any file under `modules/tenant-company-model/`
- Any file under `modules/procurement-purchase-orders/`
- Any file under `modules/launch-event-management/`
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`

Note: `modules/ai-agent-services/` and `modules/warranty-registration/` directories do NOT exist on origin/main; do NOT create them.

### PR-E canonical rules summary (25)

**Search safety (5):**

- Search-Result-Redacted-By-Default Rule.
- Search-Defers-To-PR-D-Access-Governance Rule.
- Hidden-Denied-Result Rule.
- Visible-Denied-Metadata-Minimized Rule.
- Sensitive-Search-Logged Rule.

**Result rendering (6):**

- Per-Audience-Result-Selection Rule.
- Purged-Reference-Only-Metadata-View Rule.
- Archived-Result-Availability-State Rule.
- File-Backed-Result-Masked-Default Rule.
- Source-Snapshot-Minimization-In-Preview Rule.
- Full-Payload-Exception-No-Raw-Preview Rule.

**Sensitivity flag visibility (2):**

- Legal-Hold-Flag-Visibility-Scoped Rule.
- Restricted-Flag-Visibility-Scoped Rule.

**Review (3):**

- Review-Note-Append-Only Rule.
- Review-Note-Is-Not-Evidence-Amendment Rule.
- Evidence-Collection-References-Only Rule.

**Export (3):**

- Export-Default-Redacted Rule.
- Export-File-Tracking-Only-When-Artifact-Exists Rule.
- Export-Access-Logged-Via-PR-D Rule.

**Indexing (4):**

- Index-Is-Not-Source-of-Truth Rule.
- Index-Default-Redacted Rule.
- No-Raw-Payload-Indexing Rule.
- Index-Stale-Acceptable Rule.

**Boundary (2):**

- Search-Not-Source-of-Truth Rule.
- Audit-Export-Not-Analytics Rule.

### Critical rules summary (PR-E reaffirmation)

- Logs & Audit search must NOT become source-module operational reporting.
- Logs & Audit audit export must NOT become BI / analytics reporting.
- Logs & Audit search must NOT bypass PR-D access governance.
- Tenant Company `check_access` remains canonical permission authority.
- Source modules retain canonical operational source-of-truth.
- Analytics owns BI / dashboards / trends / metrics / KPIs.
- Every access logged via PR-D hardened Audit Access Record (no PR-E parallel logging).
- Search results default to redacted view; raw retrieval is exceptional and logged.
- Denied results hidden by default including counts.
- Visible-denied metadata reviewer-only and minimized.
- Audit Report Export Record links to PR-B File Tracking Record ONLY when `export_status = generated`.
- Evidence Collection Record is canonical entity name; references only; no content copy.
- Review Notes are append-only commentary; NOT Evidence Amendment Records.
- Search Index Projection is architecture concept only; NOT an entity.
- No raw payload indexing.
- Search results are NOT canonical source of truth; canonical records are PR-A / PR-B / PR-C / PR-D.
- All PR-A (9), PR-B (9), PR-C (4), PR-D (19) canonical rules apply.
- PR-A access_class values preserved verbatim.
- PR-D `public_metadata_placeholder` redaction class preserved.
- PR-D named retention policy references preserved.
- PR-D access_result terminality discipline preserved (`attempted` non-terminal; `granted` terminal; `denied` terminal).
- PR-D Evidence Governance Policy Matrix umbrella discipline preserved.
- AI Agent Services and Warranty Registration are reserved family slots only; PR-E does NOT introduce evidence_type values; future PR populates when modules exist.
- PR-E is documentation-and-architecture only; no operational entities beyond the 5 introduced; no source-module behavior changes.

### Sequence completion claim

**PR-E explicitly closes the planned Logs & Audit File Tracking A-through-E documentation hardening sequence.** After PR-E merges, the Logs & Audit File Tracking module documentation hardening is complete. Subsequent PRs operate on consumer side (source-module evidence-emission hardening) or adjacent modules (Tenant Company coordination, CPA / legal / DevOps duration locking, API Governance Foundation PR, OpenAPI hardening, search index implementation, Investigation Case Management if needed, AI / Warranty modules).
