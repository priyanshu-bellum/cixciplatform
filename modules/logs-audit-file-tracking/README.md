# Logs And Audit File Tracking Module

This module is a first draft architecture specification for the Logs & Audit File Tracking platform service / bounded context.

Logs & Audit owns traceability evidence: audit records, file tracking records, API transmission logs, validation outcomes, processing results, retry/failure history, user-trigger history, source file references, payload references where permitted, retention classes, redaction classes, search/filtering, duplicate file detection, and correction/reupload history.

All content is proposal-level. It does not finalize log storage, file storage, payload backup rules, retention periods, redaction policy, search implementation, regulatory controls, or implementation behavior.

## Source Guidance

This module should be read with:

- ADR-0012 Logs & Audit File Tracking.
- ADR-0011 Invoice Management bounded context.
- ADR-0010 Fulfillment and Returns bounded context.
- ADR-0009 Order Routing bounded context.
- ADR-0008 Warranty Registration and Claim Support.
- ADR-0007 Category-Extensible Product Catalog.
- ADR-0006 AI Agent Services.
- ADR-0005 Pricing.
- ADR-0004 Device Catalog.
- Tenant Company module.
- Product Catalog module.
- Device Catalog module.
- Pricing module.
- Order Routing module.
- Fulfillment and Returns module.
- Invoice Management module.
- Architecture domain glossary and core entities.
- Platform integration principles once finalized.

## Boundary Summary

Logs & Audit may track:

- Imports, exports, downloads, API transmissions, validation outcomes, processing results, retries, failures, and user-trigger history.
- Manual vendor file flows for order exports, return exports, shipping imports, and return outcome imports.
- Invoice generation, invoice CSV exports, reconciliation uploads, and warranty registration transmissions.
- AI recommendation/action audit references, admin exception events, and operational review signals.

Logs & Audit does not own or mutate:

- Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Notification, or Analytics source records.
- Pricing calculations, routing decisions, fulfillment/return state, invoice decisions, warranty claim state, notification delivery, or analytics definitions.

## Files

- `spec.md` - module purpose, scope, capabilities, and guardrails.
- `data-model.md` - proposal-level audit, file, transmission, validation, and retry entities.
- `api-contracts.md` - domain API contract concepts.
- `openapi-contracts.md` - implementation-oriented endpoint template and schema notes.
- `events.md` - event catalog and event modeling notes.
- `event-contracts.md` - event interface contracts.
- `boundary-contracts.md` - explicit may answer / must not answer boundaries.
- `permissions.md` - roles, permission concepts, and access guardrails.
- `workflows.md` - audit, file tracking, API transmission, vendor file, search, and retention workflows.
- `edge-cases.md` - edge cases and unresolved behavior risks.
- `test-scenarios.md` - proposal-level validation scenarios.
- `assumptions-open-questions.md` - scale assumptions, open questions, and decisions needed.

## Cross-Module Pull Request Surfaces (additive)

The Cross-Module Scheduled System Admin Activity Summary Email PR (PR-C) adds an architecture-level surface to this module for summary-specific evidence retention. The surface is additive and follows existing Logs & Audit patterns; it does NOT constitute a full Logs & Audit File Tracking module hardening pass. Full hardening remains a separate later area.

PR-C surfaces added to Logs & Audit File Tracking:

- Activity Summary Generated Evidence entity (immutable; triggered by Analytics Workflow 5 success).
- No-Activity Summary Suppression Evidence entity (immutable; triggered by Analytics Workflow 6).
- One PR-C workflow (Summary Audit Evidence Recording).
- Two PR-C events (`audit.activity-summary-evidence.recorded`, `audit.activity-summary-suppression-evidence.recorded`).
- Reference-pattern retention for Activity Summary Delivery Attempt records (via existing Audit Record entity pattern; no new entity duplicates the delivery attempt lifecycle).
- Reference-pattern retention for Activity Summary Configuration lifecycle transitions (via existing Audit Record entity pattern).
- Mirrored Missed Window Carry-Forward Reference field on Activity Summary Generated Evidence (for direct Logs & Audit search traceability without requiring an Analytics query).
- Permissions and boundary contracts for the new entities.

Cross-module partners for this surface:

- Notification Platform Service owns Activity Summary Configuration and Activity Summary Delivery Attempt; Logs & Audit retains by reference. See `modules/notification-platform-service/`.
- Analytics / Reporting owns Activity Summary Reporting Window and Activity Summary Aggregation Record; Logs & Audit retains via the two new evidence entities. See `modules/analytics-reporting/`.

PR-C does not introduce new retention classes, redaction classes, or access classes; existing patterns apply to the new entities.

PR-C does not consume source-module events directly for the summary domain. The summary-related source events (PR #91, PR #92, PR #94) are consumed by Analytics / Reporting only; Logs & Audit File Tracking is involved only when Analytics or Notification Platform signals it.

## PR-A Scope - Core Evidence Spine

PR-A establishes the spine that every future cross-module evidence record in CIXCI conforms to. The existing baseline already has good immutability discipline (append-only, masked payload default, no silent rewrite, source-of-truth boundary) and several specific evidence-bearing records (Audit Record, Audit Evidence Amendment Record, File Tracking Record, API Transmission Log, Validation Result Record, vendor operational flow records). PR-A formalizes the spine without renaming or removing existing baseline entities.

### PR-A includes

- **Audit Record hardening.** Formalizes the source module / source record / source snapshot reference triad. Formalizes Actor Reference and Service Trigger Reference as distinct (previously combined). Formalizes Company Scope Reference. Adds optional `evidence_record_reference` back-link to attached Evidence Record. All existing baseline fields preserved.
- **Generic Evidence Record introduction.** A single new entity with an `evidence_type` discriminator that every future cross-module evidence record conforms to. Carries source / external / actor / scope references, hash and attachment references, retention/redaction/access classes, lineage references, and the PR-A metadata field set.
- **Evidence Record metadata field set (Codex cleanup additions).** Adds `evidence_schema_version`, `captured_at`, `source_event_reference`, `correlation_reference`, `trace_reference`, `idempotency_key`, and `replay_safe_dedupe_reference` to the Evidence Record.
- **Source Module / Source Record / Source Snapshot Reference formalization.** Reference types (NOT stored entities). Every Evidence Record carries the triad. Governed by the Source Snapshot Minimization Rule.
- **External Evidence Reference formalization.** A sub-structure on Evidence Record (NOT a separate entity). Captures provider response, external ID, external file reference, external task/project reference, external timestamp, webhook receipt reference, retry/failure transport evidence, and external evidence hash. Governed by the External-Tool-Not-Source-of-Truth Rule.
- **Actor / Service Trigger / Company Scope Reference formalization.** Reference types to Tenant Company records. No new role, capability flag, or scope introduced.
- **Evidence Amendment Record (formalized from baseline).** Append-only small correction to existing evidence. PR-A standardizes the canonical name once; existing baseline "Audit Evidence Amendment Record" language is preserved.
- **Evidence Supersession Record (new).** Append-only record that a new Evidence Record supersedes a prior one because the underlying source-module record was corrected. Both records remain in storage.
- **Retention / Redaction / Access foundation (classes only).** Formalizes `retention_class`, `redaction_class`, `access_class` enumerations at the *class* level. Introduces `restricted_evidence` flag, `raw_evidence_reference`, `redacted_view_reference`, and `legal_hold_reference` placeholder. Existing baseline redaction class values preserved.
- **Evidence integrity hash recording.** `evidence_hash_reference` field on Evidence Record captures the hash at creation. Folded into PR-A Workflow 1. Periodic integrity verification is future.

### PR-A intentionally does NOT include

- **Audit Access Record hardening.** Existing baseline Audit Access Record is referenced only; PR-A does NOT harden it. Access / search / review workflows are deferred to PR-D / PR-E.
- **File Tracking Foundation full hardening.** Deferred to **PR-B**. Uploaded / generated / downloaded file records under the evidence spine, full hash/integrity hardening, full duplicate detection hardening, retry/reprocess references full hardening, generated vendor email export files, and uploaded vendor import files are PR-B.
- **Cross-Module Evidence Catalog.** Deferred to **PR-C**. The comprehensive `evidence_type` taxonomy for Product Catalog manual/API product import evidence, buyer API product export evidence, Order Routing vendor order/return export evidence, Fulfillment / Returns vendor shipping/delivery/return import evidence, Cross-Module Summary Emails evidence, Media evidence, AI Agent placeholders, and SLA / exception / handoff evidence references is PR-C.
- **Retention duration matrix, redaction transformation workflow, legal hold lifecycle, access matrix.** Deferred to **PR-D**. PR-A defines class enumerations and the `legal_hold_reference` placeholder only.
- **Search / query / review workflows.** Deferred to **PR-E**. PR-A leaves search as foundation reference only.
- **OpenAPI hardening.** `openapi-contracts.md` is NOT modified. Deferred to a future API Governance Foundation PR.
- **Source module file modifications.** PR-A is single-module by file touch. Product Catalog, Order Routing, Fulfillment / Returns, Media / Image Asset Management, Integration Management, Tenant Company, Analytics / Reporting, Notification Platform Service, AI Agent Services, Device Catalog, Invoice Management, and Pricing files are NOT modified.
- **Per-evidence-type events.** PR-A's `audit.evidence.recorded` event carries the `evidence_type` discriminator. PR-A explicitly does NOT introduce one event per evidence subtype.
- **Periodic integrity check workflow.** PR-A captures the hash at evidence creation; verification workflows come later.
- **AI Agent evidence placeholders.** The generic Evidence Record naturally supports AI agent evidence via `evidence_type` when AI Agent Services PR-A is introduced.
- **Media-specific evidence type definitions.** Media evidence conforms to the spine; PR-C catalogs the evidence_type values.
- **New Logs & Audit retention class introduction.** Existing baseline retention class semantics reused; PR-A formalizes enumeration shape only.
- **Runtime / code / schema / migration / build changes.**

### Files modified by PR-A

PR-A modifies exactly these 12 files in `modules/logs-audit-file-tracking/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-A

- **Logs & Audit File Tracking** owns the new Evidence Record, Evidence Amendment Record, Evidence Supersession Record entities, the formalized reference types, the canonical rules (Source-of-Truth Boundary Rule, External-Tool-Not-Source-of-Truth Rule, Immutable Evidence Rule, Source Snapshot Minimization Rule, Evidence-Per-Lifecycle-Step Rule, Promotion-of-Naming Rule for Evidence Amendment Record, Audit-Record-and-Evidence-Record Separation Rule, Amendment vs Supersession Distinction Rule), the metadata field set on Evidence Record, the retention/redaction/access class foundation, and the legal_hold_reference placeholder.
- **Logs & Audit File Tracking references but does NOT harden** the existing baseline Audit Access Record entity in PR-A.
- **Source modules** own operational records, business decisions, validation rules, correction decisions, state transitions, source-module APIs and contracts, and when to emit evidence. Logs & Audit observes; source modules decide. Source modules are reference-only in PR-A.
- **Tenant Company** owns users, roles, permissions, company scope, parent/child scope, capability checks. PR-A's Actor / Service Trigger / Company Scope references resolve through Tenant Company. No new role, capability flag, or scope introduced. Tenant Company is reference-only in PR-A.
- **Integration Management** owns external transport, provider calls, webhook receipt, external IDs, provider response, retry/failure transport evidence, API and email transport mechanics (where placed there). The External Evidence Reference sub-structure on Evidence Record is the surface where Integration Management transport evidence attaches. Integration Management is reference-only in PR-A.
- **Product Catalog, Order Routing, Fulfillment / Returns, Media / Image Asset Management, Notification Platform Service, AI Agent Services, Device Catalog, Analytics / Reporting, Invoice Management, Pricing, Procurement / Purchase Orders, Launch / Event Management, Warranty Registration** are NOT touched by PR-A. Their future evidence emission conforms to the spine; their evidence_type values are PR-C.

### Application discipline

PR-A is additive across the 12 target files. Existing baseline entities, fields, rules, and language are preserved without rename or removal. PR-A standardizes the canonical naming for one entity (Evidence Amendment Record) but does NOT rename or remove the existing baseline "Audit Evidence Amendment Record" language; the standardization is a one-time clarification. See `APPLY.md` in the PR-A bundle for tool-agnostic application instructions and the explicit stop-before-commit rule.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/README.md`

> **Target file:** `modules/logs-audit-file-tracking/README.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline content or PR-A content).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Scope - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Scope - File Tracking Foundation

PR-B hardens the existing baseline File Tracking Record (and its supporting records) under the PR-A Evidence Record spine. PR-A established the generic Evidence Record with `evidence_type` discriminator and the formalized reference/lineage entities; PR-B integrates file activity with that spine so every uploaded, generated, or downloaded artifact across CIXCI conforms to one disciplined model.

### PR-B includes

- **File Tracking Record hardening under the PR-A spine.** Existing baseline entity preserved without rename or removal. PR-B adds spine integration references: `evidence_record_reference`, `audit_record_reference`, formalized `source_module_reference` / `source_record_reference` / `source_snapshot_reference`, `evidence_attachment_reference`, optional `external_evidence_reference` sub-structure (inherited from PR-A), `actor_reference`, `service_trigger_reference`, `company_scope_reference`, `file_storage_reference`, `file_hash_reference`, optional `file_integrity_reference`.
- **Normalized discriminator fields:** `file_direction` (uploaded / generated / downloaded - operational direction), `file_purpose` (proposal-level starter set of business-meaning values), `file_lifecycle_status` (proposal-level state set). One hardened File Tracking Record handles uploaded, generated, and downloaded files; no separate entities introduced.
- **Legacy `file_direction: import or export` wording preserved verbatim.** PR-B's normalized `file_direction` carries operational direction; existing baseline language carries data-flow direction. Implementation-level naming reconciliation is deferred; PR-B does NOT force a premature rename.
- **Duplicate File Detection Record hardened.** Existing baseline preserved; spine integration references added; tenant-scope-by-default and record-evidence-not-block discipline clarified.
- **Correction / Reupload History Record hardened.** Existing baseline preserved; spine integration references added; relationship to PR-A Evidence Supersession Record clarified.
- **Reprocess / Retry Request Record hardened.** Existing baseline preserved; spine integration references added.
- **Reprocess / Retry Outcome Record formalized as a narrow child/outcome record** tied to a Reprocess / Retry Request Record, with explicit `outcome_status` semantics.
- **Foundation support for vendor email export file references, uploaded vendor import file references, and product import/export file references.** Generic file-tracking patterns under the spine without entering source-module operational behavior.
- **Full Payload Exception Record relationship clarified.** Existing baseline entity preserved verbatim and referenced; PR-B Workflow 10 documents the relationship.

### PR-B intentionally does NOT include

- **Comprehensive cross-module evidence_type catalog.** Deferred to **PR-C**. Product Catalog manual/API product import evidence_type values, buyer API product export evidence_type values, Order Routing vendor order/return export evidence_type values, Fulfillment / Returns vendor shipping/delivery/return import evidence_type values, Cross-Module Summary Emails evidence_type values, Media evidence_type values, AI Agent evidence_type values, SLA / exception / handoff evidence_type values.
- **Retention duration matrix, redaction transformation workflow, legal hold lifecycle, access matrix.** Deferred to **PR-D**. PR-B preserves PR-A's class-only foundation.
- **Search / query / review workflows.** Deferred to **PR-E**.
- **Periodic file integrity verification.** Future phase. PR-B captures the hash at creation only.
- **OpenAPI hardening.** `openapi-contracts.md` NOT modified. Deferred to future API Governance Foundation PR.
- **Source-module behavior changes.** PR-B is single-module by file touch.
- **Audit Access Record hardening.** PR-A scope; PR-D / PR-E will harden.
- **Buyer-facing download UX, Product Catalog export UX, report download workflows, buyer media download packages.** PR-E or future.
- **Standalone Uploaded / Generated / Downloaded entities.** file_direction discriminator handles them.
- **Standalone Product Import / Product Export / Vendor Email Export / Vendor Import / AI Agent File evidence entities.** file_purpose discriminator + PR-C catalog handles them.
- **Per-evidence-type file events.** PR-A's `audit.evidence.recorded` with `evidence_type` discriminator covers them.
- **Renaming or removal of any existing baseline entity, field, rule, default, or boundary.**

### Files modified by PR-B

PR-B modifies exactly these 12 files in `modules/logs-audit-file-tracking/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-B

- **Logs & Audit File Tracking** owns the hardened File Tracking Record, Duplicate File Detection Record, Correction/Reupload History Record, Reprocess/Retry Request Record, and Reprocess/Retry Outcome Record; the new discriminator fields and spine integration references; the new canonical rules (File-Level vs Evidence-Level Lineage Rule, File-Tracking-Tenant-Scope Rule, Duplicate-Detection-Cost-Control Rule reaffirmed, Duplicate-Detection-Records-Evidence Rule, Reupload-Creates-New-File-Tracking-Record Rule, Retry-Creates-New-Evidence Rule, File-Lifecycle-Status-At-Creation Rule, Legacy-File-Direction-Preservation Rule, Reprocess-Terminal-Outcome Rule).
- **Logs & Audit File Tracking references but does NOT harden** the existing baseline Audit Access Record entity (PR-A scope) and the existing baseline Full Payload Exception Record entity (referenced only in PR-B Workflow 10).
- **Source modules** own operational records, business decisions, validation rules, correction decisions, state transitions, source-module APIs and contracts, when to emit file evidence, the semantic content of files, validation rules and outcomes, processing outcomes, correction outcomes, reupload decisions, retry / reprocess execution decisions, download authorization, and generated file content decisions. Reference-only in PR-B.
- **Tenant Company** owns users / roles / permissions / company scope / parent-child scope / capability checks. PR-B's references resolve through Tenant Company. No new role / capability flag / scope. Reference-only.
- **Integration Management** owns external transport / provider calls / API and email transport mechanics. External Evidence Reference sub-structure on File Tracking Record is the surface for transport evidence. Reference-only.
- **Notification Platform Service** owns notification delivery / email delivery mechanics where placed there. PR-C decides whether vendor email export delivery evidence is Logs-owned or Notification-owned. Reference-only in PR-B.
- **Product Catalog, Order Routing, Fulfillment / Returns, Media / Image Asset Management** future file evidence emission conforms to PR-B foundation; PR-C catalogs evidence_type values. NOT touched by PR-B.
- **Analytics / Reporting, Device Catalog, Invoice Management, Pricing, Procurement / Purchase Orders, Launch / Event Management, AI Agent Services, Warranty Registration** NOT touched by PR-B.

### Application discipline

PR-B is additive across the 12 target files. Existing baseline entities, fields, rules, and language are preserved without rename or removal. PR-A spine entities (Audit Record, Evidence Record, Evidence Amendment Record, Evidence Supersession Record) are NOT modified by PR-B; PR-B only references them via the new File Tracking Record fields. See `APPLY.md` in the PR-B bundle for tool-agnostic application instructions, the explicit stop-before-commit rule, and prohibitive-only references to destructive commands.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/README.md`

> **Target file:** `modules/logs-audit-file-tracking/README.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline content, PR-A content, or PR-B content).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Scope - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Scope - Cross-Module Evidence Catalog

PR-C delivers the comprehensive Cross-Module Evidence Catalog on top of the PR-A Evidence Record spine and the PR-B File Tracking Foundation. PR-A established the generic Evidence Record with `evidence_type` discriminator and the formalized reference / lineage entities. PR-B normalized the File Tracking discriminators (`file_direction`, `file_purpose`, `file_lifecycle_status`) and hardened the supporting file-tracking entities. PR-C catalogs the cross-module evidence taxonomy so source-module evidence-emission PRs have a known target.

PR-C is **documentation-only**. PR-C does NOT add operational entities, schema-level structures, new events, or source-module behavior changes.

### PR-C includes

- **Evidence Family Catalog (15 families):** `product_catalog`, `device_catalog`, `media`, `order_routing`, `fulfillment_returns`, `integration_management`, `notification_platform`, `invoice_management`, `pricing`, `analytics_reporting`, `tenant_company`, `procurement_purchase_orders`, `launch_event_management`, `ai_agent_services_placeholder`, `warranty_registration_placeholder`. Each family declares its owning source module, readiness level, key evidence themes, required references, backing classifications, and discipline guardrails.
- **Evidence Type Catalog (87 starter / placeholder values across 13 active families).** Each evidence_type is documented with family, owner, status (starter / placeholder; **zero final identifiers in PR-C**), evidence category, required references, and default class guidance. `ai_agent_services_placeholder` and `warranty_registration_placeholder` are reserved family slots only with **zero enumerated values** (module folders do NOT exist on origin/main).
- **Evidence Type Reference Requirements table.** Per evidence_type, documents whether each of PR-A's 8 reference types (`source_record_reference`, `source_snapshot_reference`, `file_tracking_record_reference`, `evidence_attachment_reference`, `external_evidence_reference`, `actor_reference`, `service_trigger_reference`, `company_scope_reference`) is required, typical, optional, or not-applicable.
- **Evidence Backing Classification (8 non-exclusive categories):** `file_backed`, `api_backed`, `notification_backed`, `external_backed`, `ai_backed`, `operational_state`, `decision`, `transport_delivery`. Transport evidence is explicitly distinct from business-outcome evidence; external provider responses are coordination evidence only, NOT CIXCI source of truth.
- **Evidence Type Status Discipline (4 status values).** `final` (PR-C uses zero final identifiers; promotion requires future PR), `starter` (usable architecture label; NOT a stable subscriber contract), `placeholder` (subject to refinement / consolidation / removal; NOT a stable subscriber contract), `future` (reserved for family slots only; AI Agent Services and Warranty Registration are the two future families).
- **Default Class Guidance Discipline.** Retention_class / redaction_class / access_class / restricted_evidence guidance is **suggestion-only**; PR-D owns locked policy. PR-C does NOT define retention duration matrix, full access matrix, legal hold workflows, or redaction transformation workflows.

### PR-C intentionally does NOT include

- **No new operational entity.** PR-C is documentation-only.
- **No new event.** Zero additive events. All evidence emission flows through PR-A's `audit.evidence.recorded` event carrying the `evidence_type` discriminator.
- **No event renames.** PR-A's 4 events and PR-B's 2 events are NOT renamed.
- **No source-module behavior changes.** All 15 referenced modules are reference-only.
- **No retention duration matrix, redaction transformation workflow, legal hold lifecycle, or access matrix.** Deferred to PR-D.
- **No search / query / review workflows.** Deferred to PR-E.
- **No OpenAPI hardening.** `openapi-contracts.md` is NOT modified. Deferred to future API Governance Foundation PR.
- **No final evidence_type identifiers.** Zero final status values used; future promotion PR required.
- **No AI Agent Services enumerated evidence_type values.** Reserved family slot only.
- **No Warranty Registration enumerated evidence_type values.** Reserved family slot only.
- **No Audit Access Record hardening.** Existing baseline preserved; PR-A scope; PR-D / PR-E will harden.
- **No renames, removals, or rewrites of any existing baseline, PR-A, or PR-B entity, field, rule, default, or boundary.** PR-C is additive.

### Files modified by PR-C

PR-C modifies exactly these 12 files in `modules/logs-audit-file-tracking/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-C

- **Logs & Audit File Tracking** owns the evidence taxonomy, evidence family classification, reference requirement expectations, backing classification, status discipline, and catalog discipline.
- **Source modules** own operational records, business decisions, lifecycle state, validation rules, and when evidence is emitted. Source modules retain canonical ownership of all operational records. Logs & Audit observes; source modules decide.
- **Logs & Audit must NOT become operational source of truth** for: Product state, Device state, Media state, Order state, Fulfillment state, Pricing state, Invoice state, Tenant state, Integration state, Notification state, Analytics state, Procurement state, Launch state, AI state, Warranty state.
- **External tools must NEVER become CIXCI source of truth.** External provider responses, webhook receipts, email delivery acknowledgements are coordination evidence only.
- **File Tracking Record** remains the canonical file-backed link from PR-B's File Tracking Foundation. PR-C's file-backed evidence_type values reference File Tracking Record via PR-B's spine integration.
- **Audit Access Record** remains existing baseline; NOT hardened by PR-C.

### PR-C canonical rules

- **Evidence Type Status Discipline Rule.** Starter values are usable architecture labels but NOT stable subscriber contracts. Placeholder values are NOT stable subscriber contracts. Future is reserved for family slots only. Promotion from starter to final requires an explicit future PR.
- **Default Class Guidance Suggestion-Only Rule.** Default retention_class / redaction_class / access_class / restricted_evidence guidance is suggestion-only; PR-D owns locked policy.
- **Evidence Family Closed-Set Rule (PR-C scope).** PR-C catalogs 15 families. Future families may be added by future PRs; PR-C is the current closed set.
- **Catalog Additive-Only Rule.** PR-C does NOT rename, remove, or rewrite any PR-A / PR-B / existing baseline content. PR-C is additive documentation.

All PR-A canonical rules (9) and PR-B canonical rules (9) are preserved and applied to PR-C evidence_type values.

### Application discipline

PR-C is additive documentation across the 12 target files. Existing baseline entities, fields, rules, and language are preserved without rename or removal. PR-A and PR-B entities and rules are NOT modified; PR-C only populates the `evidence_type` discriminator with starter / placeholder values. See `APPLY.md` in the PR-C bundle for tool-agnostic application instructions, the explicit stop-before-commit rule, and prohibitive-only references to destructive commands.
```

## PR-D Scope - Retention / Redaction / Legal Hold / Access Governance

PR-D delivers the Retention / Redaction / Legal Hold / Access governance hardening that locks policy and lifecycle deferred from PR-A, PR-B, and PR-C. PR-A established the class fields. PR-B normalized file-backed evidence. PR-C catalogued 87 evidence_type values with suggestion-only default class guidance. **PR-D locks the governance.**

PR-D is documentation-and-architecture. PR-D introduces 3 new entities, hardens 1 existing entity, introduces 3 new policy matrices, adds 6 events, and adds 13 workflows. PR-D does NOT modify source-module files; does NOT modify `openapi-contracts.md`; does NOT introduce new Tenant Company roles, capability flags, scopes, or permission families.

### PR-D includes

- **Retention governance.** Locks meanings of the 6 PR-A retention classes (`transient`, `standard`, `extended`, `regulatory`, `legal_hold`, `audit_critical`). Introduces the Retention Policy Matrix (mapping evidence_type / family -> retention_class -> named retention policy reference; PR-D uses named policy references; CPA / legal / DevOps own concrete duration values). Introduces the Retention Disposition Record (new append-only entity) with 6 disposition states (`retain`, `archive`, `purge_eligible`, `purge_blocked_by_hold`, `purged_reference_only`, `preserved`).
- **Redaction governance.** Locks 9 redaction class meanings including the preserved baseline `public_metadata_placeholder` value: `public_metadata_placeholder`, `buyer_visible_audit`, `vendor_visible_audit`, `customer_sensitive_restricted`, `pricing_sensitive_restricted`, `invoice_sensitive_restricted`, `warranty_sensitive_restricted`, `tenant_security_restricted`, `audit_only`. Introduces the Redaction Policy Matrix and the Redaction Transformation Record (new append-only entity). Locks the per-audience redacted view discipline.
- **Legal hold governance.** Introduces the Legal Hold Record (new entity) with multi-dimensional scope (evidence_type, family, company, file, source module) and 3 statuses (`applied`, `released`, `lapsed`). Promotes `legal_hold_reference` from PR-A placeholder to active reference. Each Legal Hold Record is scoped to ONE `company_scope_reference`.
- **Access governance.** Hardens the existing Audit Access Record with `access_result` discriminator (`attempted` non-terminal, `granted` terminal, `denied` terminal), `view_type` (`raw` / `redacted`), `access_reason_reference`, `break_glass_flag`, `denial_reason`, and clarified linkages. **Preserves PR-A's 6 access_class values verbatim** (`public_metadata`, `buyer_visible`, `vendor_visible`, `internal_operations`, `system_admin_only`, `compliance_only`). Introduces the Access Policy Matrix. Introduces `access_policy_tier` as a separate concept within the Access Policy Matrix (`standard_tier`, `restricted_tier`, `audit_only_tier`, `system_internal_tier`) that does NOT replace PR-A access_class.
- **Tenant / parent / child access expectations.** Documents access dimensions WITHOUT introducing Tenant Company roles. Tenant Company `check_access` remains canonical authority. Tenant Company coordination remains deferred.
- **Evidence type sensitivity mapping.** Per PR-C's 15 families and 87 evidence_type values, locks default governance guidance for retention_class / redaction_class / access_class / restricted_evidence / raw access default / redacted view default / legal hold eligibility.

### PR-D intentionally does NOT include

- No source-module behavior change.
- No new Tenant Company role, capability flag, scope, or permission family.
- No search / query / review workflows (PR-E scope).
- No OpenAPI hardening (`openapi-contracts.md` NOT modified).
- No exact retention duration values (named policy references only; CPA / legal / DevOps owns durations).
- No new evidence_type values or families (PR-C catalog referenced only).
- No rename or removal of any PR-A, PR-B, or PR-C entity, field, rule, default, boundary, event, or workflow.
- No per-evidence-type events.
- No per-family events.
- No `audit.evidence-access.denied` event (subsumed by `access_result` discriminator).
- No standalone Evidence Access Record, Access Denial Record, Restricted Evidence Access Record, or Break-Glass Access Record entity.
- No external evidence reference validation workflow (PR-E or future).
- No buyer / vendor download UX (PR-E or future).
- No legal hold cross-tenant scoping.

### Required cleanups applied

1. **access_class mismatch fixed.** PR-A's 6 access_class values preserved verbatim. The earlier-proposed `standard` / `restricted` / `audit_only` / `system_internal` values are NOT introduced as access_class; they appear only within the Access Policy Matrix as `access_policy_tier` values.
2. **`public_metadata_placeholder` preserved as redaction class.** Included as legacy / baseline-preserved value.
3. **Retention duration wording locked.** PR-D uses named retention policy references; concrete durations owned by CPA / legal / DevOps.
4. **`access_result` terminality clarified.** `attempted` non-terminal; `granted` terminal; `denied` terminal. No `audit.evidence-access.denied` event.
5. **Evidence Governance Policy Matrix wording cleaned.** Documented as umbrella view over the 3 matrices; not a fourth independent matrix.

### Files modified by PR-D

PR-D modifies exactly these 12 files in `modules/logs-audit-file-tracking/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-D

- **Logs & Audit File Tracking** owns governance policy, retention / redaction / legal hold / access records, immutable audit trails, redacted view references, and access recording.
- **Tenant Company** owns users, roles, permissions, parent / child scope, capability checks, and service identities. Tenant Company remains canonical authority for `check_access`. PR-D does NOT become permission authority.
- **Source modules** own operational records, business decisions, validation rules, generated content, lifecycle state, and evidence emission timing. Source modules retain canonical operational source-of-truth ownership.
- **CPA / legal / DevOps** own concrete retention duration values (PR-D uses named policy references).
- **Compliance / legal** own legal hold authority (PR-D documents the expectation; Compliance / legal applies / releases holds).
- **External tools** are coordination evidence only; NOT CIXCI source of truth.

### PR-D canonical rules (19 rules introduced)

- **Retention (5):** Legal-Hold-Overrides-Purge Rule, Immutable-Evidence-Retention Rule, Retention-Disposition-Append-Only Rule, File-Metadata-Outlives-Payload Rule, Source-Module-Deletion-Independence Rule.
- **Redaction (5):** Redaction-Never-Overwrites-Raw Rule, Redacted-View-Default Rule, Redaction-Transformation-Append-Only Rule, Redacted-Views-Per-Audience Rule, Amendment-vs-Redaction-Distinction Rule.
- **Legal Hold (3):** Legal-Hold-Does-Not-Mutate-Evidence Rule, Append-Only-During-Hold Rule, Legal-Hold-Apply-Append-Only Rule.
- **Access (4):** Raw-Evidence-Access-Exceptional Rule, All-Access-Logged Rule, Service-Identity-Access-Logged Rule, Tenant-Company-Owns-Authority Rule.
- **Governance / policy (2):** Governance-Policy-Locked-By-PR-D Rule, No-New-Tenant-Roles-In-PR-D Rule.

All PR-A canonical rules (9), PR-B canonical rules (9), and PR-C canonical rules (4) are preserved and applied to PR-D.

### Application discipline

PR-D is additive documentation-and-architecture across the 12 target files. Existing baseline entities, fields, rules, and language are preserved without rename or removal. PR-A, PR-B, and PR-C entities and rules are NOT modified; PR-D only populates governance lifecycle on top of them. See `APPLY.md` in the PR-D bundle for tool-agnostic application instructions, the explicit stop-before-commit rule, and prohibitive-only references to destructive commands.

## PR-E Scope - Search / Query / Review / Investigation / Audit Report Export

PR-E is the final documentation-and-architecture PR in the planned Logs & Audit File Tracking A-through-E hardening sequence. PR-A established the Evidence Record spine. PR-B normalized file tracking. PR-C catalogued 87 evidence_type values across 15 families. PR-D locked retention / redaction / legal hold / access governance. **PR-E governs search / query / review / investigation / audit report export ON TOP OF PR-D-governed data, never bypassing PR-D.**

PR-E is documentation-and-architecture. PR-E introduces 5 new entities, adds 4 events, adds 13 workflows, and locks 25 canonical rules. PR-E does NOT modify source-module files; does NOT modify `openapi-contracts.md`; does NOT introduce new Tenant Company roles, capability flags, scopes, or permission families; does NOT introduce new filterable fields beyond existing PR-A / PR-B / PR-C / PR-D fields.

### PR-E includes

- **Search / query governance.** Introduces the Evidence Search Session entity (NEW) with embedded Evidence Search Query and Search Filter Set sub-structures and a Search Scope Reference field. Documents the filter dimension catalog (all referencing existing PR-A through PR-D fields). Records search activity via `audit.search.executed`. Result access flows through PR-D's hardened Audit Access Record per Search-Defers-To-PR-D-Access-Governance Rule.
- **Search result safety.** Locks 13 search safety / result rendering rules including redacted-by-default rendering, raw retrieval via PR-D Workflow 9, denied results hidden by default including counts, visible-denied metadata minimized and reviewer-only, `purged_reference_only` metadata-view, archived availability state, per-audience result selection, file-backed masked default, source snapshot minimization in previews, Full Payload Exception no raw preview, legal hold and restricted flag visibility scoped.
- **Review / investigation governance.** Introduces the Evidence Review Session entity (NEW), Evidence Collection Record entity (NEW; canonical entity name), and Review Note / Annotation entity (NEW append-only). Introduces Investigation Case Reference field and Review Disposition field. Documents Chain-of-Custody View as a rendered view (NOT an entity).
- **Audit report / export governance.** Introduces the Audit Report Export Record entity (NEW). Audit Report Export Record links to PR-B File Tracking Record ONLY when a generated export artifact exists (using existing PR-B `audit_export` file_purpose value); metadata-only report-preview activity does NOT require File Tracking. Subject to PR-D governance.
- **Indexing assumptions.** Documents Search Index Projection as architecture concept (NOT an entity), indexable fields list, redacted index default, no raw payload indexing, index-not-source-of-truth, stale-acceptable, all deferring concrete implementation.
- **Boundary discipline reaffirmation.** Logs & Audit search is NOT source-module operational reporting (source modules own); Logs & Audit audit export is NOT BI / analytics reporting (Analytics owns); Tenant Company `check_access` remains canonical permission authority.

### PR-E intentionally does NOT include

- No source-module behavior change.
- No new Tenant Company role, capability flag, scope, or permission family.
- No OpenAPI hardening (`openapi-contracts.md` NOT modified).
- No concrete HTTP routes / payload schemas / endpoint behavior.
- No concrete search index implementation (database schema, engine choice, query execution).
- No download UX (future UI / API).
- No investigation queue UI / Review Assignment UI.
- No Saved Search Record (future).
- No new filterable fields beyond PR-A / PR-B / PR-C / PR-D fields.
- No raw payload indexing.
- No BI / dashboard expansion.
- No rename or removal of any PR-A / PR-B / PR-C / PR-D entity, field, rule, default, boundary, event, or workflow.
- No per-evidence-type / per-family events.
- No `audit.evidence-export.generated` event (`audit.evidence-export.recorded` with `export_status` discriminator covers all states).
- No `audit.search.denied` event (subsumed by PR-D `access_result = denied`).
- No `audit.evidence-export.downloaded` event (subsumed by PR-D `audit.evidence-access.recorded`).
- No `audit.evidence-collection.recorded` event (subsumed by `audit.review-session.recorded` or PR-A `audit.record.created`).
- No standalone Evidence Search Result Record, Search Access Record, Search Denial Record, Evidence Review Queue Record, Review Assignment Record, Reviewer Access Record, Audit Export Download Record, Saved Search Record, Search Index Rebuild Evidence, Search Index Projection entity.
- No Investigation Case Record (Investigation Case Reference is placeholder field only; future PR if needed).

### Required cleanups applied

1. **Event naming cleanup.** `audit.evidence-export.recorded` with `export_status` discriminator (`generated` / `failed` / `canceled` / `metadata_only`); NO `audit.evidence-export.generated` event introduced.
2. **File Tracking linkage cleanup for exports.** Audit Report Export Record links to PR-B File Tracking Record ONLY when a generated export artifact exists; metadata-only report-preview activity does NOT require File Tracking. Codified as the Export-File-Tracking-Only-When-Artifact-Exists Rule.
3. **Canonical record name cleanup.** Evidence Collection Record is the canonical entity name in technical sections. Prose may use "Evidence Collection / Evidence Set".
4. **Visible-denied metadata clarification.** Hidden-Denied-Result Rule + Visible-Denied-Metadata-Minimized Rule together: denied results hidden by default including counts; visible-denied metadata allowed only for authorized audit / compliance reviewers; minimized; no raw evidence content or restricted details; governed by PR-D Access Policy Matrix and hardened Audit Access Record.
5. **APPLY.md additional checks.** APPLY.md verifies no source-module reporting, no BI / dashboard expansion, no raw payload indexing, no standalone search / access / denial / download records, File Tracking linkage discipline, Evidence Collection Record canonical name, `audit.evidence-export.recorded` event naming.

### Files modified by PR-E

PR-E modifies exactly these 12 files in `modules/logs-audit-file-tracking/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-E

- **Logs & Audit File Tracking** owns governed evidence search / review / export records and workflows, the 5 new PR-E entities, Chain-of-Custody View, PR-E events / workflows / rules.
- **Tenant Company** owns users, roles, permissions, parent / child scope, capability checks (`check_access`), service identities. Tenant Company remains canonical permission authority.
- **Source modules** own operational records, lifecycle state, decisions, validation rules, generated content, operational reporting.
- **Analytics / Reporting** owns BI, dashboards, metrics, trends, business-performance reporting. Audit Report Export Records are NOT BI dashboards.
- **API / OpenAPI** owns concrete routes, payloads, pagination, cursors (future).
- **Implementation** owns index storage, search engines, runtime execution, rebuild mechanics.
- **CPA / legal / DevOps** own concrete retention duration values (per PR-D); compliance / legal own legal hold authority (per PR-D).
- **External tools** are coordination evidence only; NOT CIXCI source of truth.

### PR-E canonical rules (25 rules introduced)

- **Search safety (5):** Search-Result-Redacted-By-Default, Search-Defers-To-PR-D-Access-Governance, Hidden-Denied-Result, Visible-Denied-Metadata-Minimized, Sensitive-Search-Logged.
- **Result rendering (6):** Per-Audience-Result-Selection, Purged-Reference-Only-Metadata-View, Archived-Result-Availability-State, File-Backed-Result-Masked-Default, Source-Snapshot-Minimization-In-Preview, Full-Payload-Exception-No-Raw-Preview.
- **Sensitivity flag visibility (2):** Legal-Hold-Flag-Visibility-Scoped, Restricted-Flag-Visibility-Scoped.
- **Review (3):** Review-Note-Append-Only, Review-Note-Is-Not-Evidence-Amendment, Evidence-Collection-References-Only.
- **Export (3):** Export-Default-Redacted, Export-File-Tracking-Only-When-Artifact-Exists, Export-Access-Logged-Via-PR-D.
- **Indexing (4):** Index-Is-Not-Source-of-Truth, Index-Default-Redacted, No-Raw-Payload-Indexing, Index-Stale-Acceptable.
- **Boundary (2):** Search-Not-Source-of-Truth, Audit-Export-Not-Analytics.

All PR-A canonical rules (9), PR-B canonical rules (9), PR-C canonical rules (4), and PR-D canonical rules (19) are preserved and applied to PR-E.

### Sequence completion

**PR-E explicitly closes the planned Logs & Audit File Tracking A-through-E documentation hardening sequence:**

- PR-A: Core Evidence Spine.
- PR-B: File Tracking Foundation.
- PR-C: Cross-Module Evidence Catalog.
- PR-D: Retention / Redaction / Legal Hold / Access Governance.
- **PR-E: Search / Query / Review / Investigation / Audit Report Export.**

After PR-E merges, the Logs & Audit File Tracking module documentation hardening is complete. Future work operates on consumer side (source-module evidence-emission hardening) or adjacent modules (Tenant Company coordination for role creation, CPA / legal / DevOps duration locking, API Governance Foundation PR + Logs-and-Audit-specific OpenAPI hardening PR, search index implementation, Investigation Case Management module if needed, AI Agent Services module + evidence PR, Warranty Registration module + evidence PR).

### Application discipline

PR-E is additive documentation-and-architecture across the 12 target files. Existing baseline, PR-A, PR-B, PR-C, and PR-D content is preserved without rename or removal. See `APPLY.md` in the PR-E bundle for tool-agnostic application instructions, the explicit stop-before-commit rule, and prohibitive-only references to destructive commands.
