# Logs And Audit File Tracking Permissions

This document is proposal-level architecture. It defines initial roles, permission concepts, and access guardrails without finalizing authorization implementation.

## Permission Principles

- Access should be scoped by tenant, company/entity, source module, record type, redaction class, retention class, and actor role.
- Sensitive payload references should require explicit permission and audit tracking.
- Buyer/vendor-visible audit views should expose only approved metadata.
- Permissions must not grant authority to mutate source module business records.
- Logs & Audit must not become a path around source-module workflow approvals.

## Proposal-Level Roles

### System Admin

May:

- Search internal audit records where authorized.
- Review retention review placeholders.
- Review audit gap, repeated failure, and duplicate file signals.
- View sensitive metadata according to redaction policy.

Must not use Logs & Audit to edit source business records or bypass retention rules.

### Audit Operations User

May:

- Search audit/file/API transmission records for authorized scopes.
- Review validation and processing outcomes.
- Review retry/failure history.
- Review duplicate file detection and correction/reupload history.

### Source Module Service Role

May:

- Create audit records for its own module activity.
- Create file tracking records for its own imports/exports.
- Create API transmission logs for its own transmissions.
- Attach validation and processing result references.

Must not create misleading records for another source module without an approved system contract.

### Vendor Operations User

May:

- View authorized vendor file tracking metadata.
- Upload or review manual vendor file workflow records where policy allows.
- View validation and processing status for authorized vendor files.

Must not view unrelated vendor audit records or sensitive payloads.

### Buyer Operations User

May:

- View authorized buyer/entity audit metadata where exposed.
- View product export/download or invoice export tracking where policy allows.

Must not view unrelated buyer/entity audit records, internal-only records, or sensitive payloads.

### Compliance / Security Reviewer Placeholder

May:

- Review retention class and redaction class behavior.
- Review access to sensitive audit records.
- Review retention review placeholders.

## Permission Families

- `audit.record.create`
- `audit.record.read`
- `audit.record.search`
- `audit.sensitive.read`
- `file_tracking.create`
- `file_tracking.read`
- `file_tracking.search`
- `file_tracking.payload_reference.read`
- `file_tracking.correction_history.read`
- `api_transmission_log.create`
- `api_transmission_log.read`
- `validation_result.create`
- `processing_result.create`
- `retry_failure_history.read`
- `retention_review.create`
- `retention_review.read`

## Boundary Restrictions

Logs & Audit permissions must not grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Pricing snapshot mutation or pricing calculation authority.
- Routing decision or suborder mutation authority.
- Fulfillment delivery, return, replacement, or exception authority.
- Invoice generation, finalization, reconciliation decision, or payment authority.
- Warranty claim approval authority.
- Tenant eligibility or role management authority.
- AI recommendation execution authority.
- Notification template or delivery authority.
- Analytics metric definition authority.

## Audit Requirements

Sensitive operations should themselves be audited:

- Sensitive audit record access.
- Payload reference access.
- Search over restricted redaction classes.
- Retention review creation.
- Duplicate file review.
- Correction/reupload history access.
- Buyer/vendor-visible audit view access.

## Open Questions

- Which roles exist at launch versus future phases?
- Which audit records are buyer/vendor-visible?
- Which payload references can be viewed by operations roles?
- Which retention review actions require Compliance or Security approval?

## Scheduled System Admin Activity Summary Evidence Permissions (Cross-Module PR)

This section adds proposal-level permission concepts for the Logs & Audit File Tracking side of the scheduled summary email cross-module hardening pass. Notification Platform Service and Analytics / Reporting carry reciprocal permission sections. Tenant Company remains the authority for role definitions.

### Phase 1 actor inventory

- **CIXCI System Admin** - authorized to view the two new evidence types in Phase 1. Vendor users and buyer users are excluded.
- **System service identity for evidence recording** - the implementation-layer identity that Logs & Audit Workflow 10 operates under.

### Activity Summary Generated Evidence permissions

- `activity_summary_generated_evidence.create` - permission to create the evidence record. Only the system service identity (triggered by Analytics Workflow 5) has this permission.
- `activity_summary_generated_evidence.read` - permission to view the evidence record. CIXCI System Admin only in Phase 1.
- `activity_summary_generated_evidence.search` - permission to search across Activity Summary Generated Evidence records. CIXCI System Admin only in Phase 1.

PR-C does not introduce permissions to mutate or delete evidence records. The records are immutable per the existing Logs & Audit immutability rule; amendments use the existing Audit Amendment Workflow.

### No-Activity Summary Suppression Evidence permissions

- `no_activity_summary_suppression_evidence.create` - permission to create the evidence record. Only the system service identity (triggered by Analytics Workflow 6) has this permission.
- `no_activity_summary_suppression_evidence.read` - permission to view the evidence record. CIXCI System Admin only in Phase 1.
- `no_activity_summary_suppression_evidence.search` - permission to search across No-Activity Summary Suppression Evidence records. CIXCI System Admin only in Phase 1.

### Activity Summary Delivery Attempt retention (reference pattern)

Activity Summary Delivery Attempt is retained by reference via the existing Audit Record entity pattern. Existing Audit Record permissions apply unmodified:

- `audit.record.create` - covers retention of Activity Summary Delivery Attempt lifecycle transitions.
- `audit.record.read` - covers viewing the audit records referencing delivery attempts.
- `audit.record.search` - covers searching audit records by `source_module = notification-platform-service` and `event_action_type = activity_summary_delivery_*`.

PR-C does not introduce separate per-delivery-attempt permissions on the Logs & Audit side.

### Activity Summary Configuration lifecycle retention (reference pattern)

Activity Summary Configuration lifecycle transitions are retained by reference via the existing Audit Record entity pattern. Existing Audit Record permissions apply unmodified.

### Recipient scope authority (Logs & Audit side)

- Logs & Audit File Tracking does not resolve recipient scope.
- Existing Logs & Audit access patterns (tenant, entity, role, redaction class, retention class, access class, source-module filters) apply to the new evidence types.
- The new evidence types are internal-scope (CIXCI System Admin only); existing access patterns naturally enforce this.

### Vendor / buyer exclusion guardrail (Logs & Audit side)

PR-C strictly excludes vendor users and buyer users from:

- Activity Summary Generated Evidence visibility.
- No-Activity Summary Suppression Evidence visibility.
- Audit records that reference Activity Summary Delivery Attempt or Activity Summary Configuration via the source-module discriminator.

### Permission concepts NOT introduced

- Per-tenant evidence access.
- Evidence record mutation. Immutability is preserved.
- Manual evidence creation outside of Workflow 10 triggers.
- Retention duration override. Phase 1 uses existing retention class patterns.
- Search-API or search-index changes for the new evidence types beyond existing patterns.
- New retention review trigger specific to the new evidence types. Existing Retention Review Workflow covers the new entities.

### Audit requirements

The following PR-C operations are themselves auditable via existing Logs & Audit sensitive-operation patterns:

- Sensitive access to Activity Summary Generated Evidence (per existing `audit.sensitive.read` permission family).
- Sensitive access to No-Activity Summary Suppression Evidence.
- Search over Activity Summary Generated Evidence or No-Activity Summary Suppression Evidence.
- Amendment of evidence records via the existing Audit Amendment Workflow.

### Existing Logs & Audit permission patterns

The existing Logs & Audit permission families (`audit.record.create`, `audit.record.read`, `audit.record.search`, `audit.sensitive.read`, `file_tracking.create`, `file_tracking.read`, `file_tracking.search`, `file_tracking.payload_reference.read`, `file_tracking.correction_history.read`, `api_transmission_log.create`, `api_transmission_log.read`, `validation_result.create`, `processing_result.create`, `retry_failure_history.read`, `retention_review.create`, `retention_review.read`) are not modified by this PR. The PR-C permission concepts above sit alongside these existing families.

### Boundary restrictions (PR-C reaffirmations)

The Logs & Audit File Tracking PR-C permissions must not grant:

- Activity Summary Configuration mutation authority. Configuration lives at Notification Platform Service.
- Activity Summary Delivery Attempt mutation authority. Delivery attempts live at Notification Platform Service.
- Activity Summary Reporting Window mutation authority. Reporting Windows live at Analytics / Reporting.
- Activity Summary Aggregation Record mutation authority. Aggregation records live at Analytics / Reporting.
- Source-module record mutation authority. Logs & Audit File Tracking remains evidence-only.
- Tenant Company role mutation authority.
- Cursor advancement authority. The cursor lives at Notification Platform Service Activity Summary Configuration.

## PR-A Permissions - Core Evidence Spine

This section describes authority surfaces for PR-A. All existing baseline permission patterns are preserved.

### Tenant Company authority discipline (PR-A reaffirmation)

PR-A authority-bearing actions are evaluated through existing Tenant Company `check_access` patterns and existing baseline permission families. **PR-A introduces NO new Tenant Company role definition, NO new capability flag, NO new scope, and NO new permission family.** Authority for each PR-A action maps to existing roles and existing permission families.

The existing baseline permission families are preserved verbatim:

- `audit.record.create`
- `audit.record.read`
- `audit.record.search`
- `audit.sensitive.read`
- `file_tracking.create`
- `file_tracking.read`
- `file_tracking.search`
- `file_tracking.payload_reference.read`
- `file_tracking.correction_history.read`
- `api_transmission_log.create`
- `api_transmission_log.read`
- `validation_result.create`
- `processing_result.create`
- `retry_failure_history.read`
- `retention_review.create`
- `retention_review.read`

The existing baseline roles are preserved:

- System Admin
- Audit Operations User
- Source Module Service Role
- Vendor Operations User
- Buyer Operations User
- Compliance / Security Reviewer Placeholder

### Evidence Record creation authority

Evidence Record creation flows through existing source-module-service authority. Source modules emit evidence as part of their own audit-worthy actions.

| Action | Source Module Service Role | System Admin | Audit Operations User | Vendor Operations User | Buyer Operations User |
|--------|----------------------------|--------------|------------------------|-------------------------|-------------------------|
| Create Audit Record for own module activity | yes | yes | no | no | no |
| Create Evidence Record for own module activity (`audit.record.create`) | yes | yes | no | no | no |
| Create Evidence Record for another source module's activity | no (without approved system contract) | yes | no | no | no |
| Create Audit Record for cross-cutting administrative action | no | yes | no | no | no |

Vendor and buyer operations users do NOT directly create Audit Records or Evidence Records under PR-A. Vendor and buyer activity that needs audit / evidence flows through the source-module service that processes the user action (e.g., Product Catalog service creates evidence when a vendor uploads a product import file; Order Routing service creates evidence when a System Admin triggers a vendor export). PR-A does NOT introduce direct evidence-creation authority for vendor or buyer users.

### Evidence Amendment authority (PR-A Workflow 5)

| Action | Source Module Service Role | System Admin | Audit Operations User | Compliance / Security Reviewer |
|--------|----------------------------|--------------|------------------------|---------------------------------|
| Submit an Evidence Amendment Record against own-module Evidence Record | yes (via existing `audit.record.create` family; the amendment is itself an audit action) | yes | no | no |
| Submit an Evidence Amendment Record against another module's Evidence Record | no (without approved system contract) | yes | no | no |
| Submit an Evidence Amendment Record purely for redaction class or access class clarification | no | yes | no | yes (Compliance review path; reuses existing review surfaces) |
| Authorize Evidence Amendment that touches `restricted_evidence = true` evidence | no | yes | no | yes |

PR-A does NOT introduce a new `evidence.amendment.create` permission family. Existing `audit.record.create` plus `audit.sensitive.read` (when the amendment touches sensitive evidence) cover the authority surface. PR-D may expand if needed.

### Evidence Supersession authority (PR-A Workflow 6)

| Action | Source Module Service Role | System Admin |
|--------|----------------------------|--------------|
| Submit an Evidence Supersession Record for own-module Evidence Record after source-module correction | yes (via existing `audit.record.create` family; supersession is itself an audit action and creates a new Evidence Record) | yes |
| Submit an Evidence Supersession Record for another module's Evidence Record | no (without approved system contract) | yes |
| Authorize Evidence Supersession that touches `restricted_evidence = true` evidence | no | yes |

Source modules own the business correction decision; Logs & Audit records the lineage. Authority flows through existing `check_access` patterns.

### Source Module / Source Record / Source Snapshot Reference authority

These reference types are populated at evidence creation by source modules. PR-A introduces no specific authority for reference creation beyond the existing source-module-service `audit.record.create` and `file_tracking.create` permission families.

- Source modules populate the references for their own module activity.
- Source modules MUST NOT create misleading references for another source module without an approved system contract (this rule is reaffirmed from the existing baseline "Must not create misleading records for another source module without an approved system contract.").
- System Admins MAY create Audit Records and Evidence Records for cross-cutting administrative actions.

### External Evidence Reference authority

The External Evidence Reference sub-structure is populated at evidence creation, typically driven by Integration Management transport activity.

- Integration Management (or another transport-owning service) populates the External Evidence Reference sub-structure for transport-related evidence.
- No new permission family is introduced. The existing `audit.record.create` plus Integration Management's own authority covers this surface.
- External-Tool-Not-Source-of-Truth Rule applies: external evidence is coordination/proof only.

### Actor Reference, Service Trigger Reference, Company Scope Reference authority

These reference types resolve to Tenant Company records.

- Source modules populate Actor Reference with the human user actor reference at evidence creation.
- Source modules populate Service Trigger Reference with the service-trigger reference at evidence creation (when the action is service-initiated).
- Source modules populate Company Scope Reference with the company scope at evidence creation.
- Tenant Company `check_access` enforces the scope; PR-A does NOT add a new check_access invocation pattern.
- Cross-tenant evidence creation is denied by default (reaffirms baseline rule "cross-tenant search is denied by default" extended architecturally to evidence creation).

### Retention / Redaction / Access class assignment authority

- Source modules assign `retention_class`, `redaction_class`, and `access_class` at evidence creation (PR-A Workflows 7 and 8).
- PR-D will introduce review workflows that may upgrade or downgrade the class (with audit trail via Evidence Amendment Record).
- System Admin and Compliance / Security Reviewer roles will have review authority in PR-D; PR-A does NOT introduce class-review authority.

### `restricted_evidence` flag authority

- Source modules set `restricted_evidence = true` at evidence creation when the evidence content is restricted from normal access.
- The flag is a source-module classification; PR-A does NOT introduce a separate authority for setting the flag.
- The full gating matrix (which roles can read `restricted_evidence = true` evidence under which conditions) is PR-D.

### `legal_hold_reference` placeholder authority

- PR-A introduces only the placeholder field on Evidence Record.
- The Legal Hold entity, lifecycle, application authority, and lift authority are PR-D.
- PR-A does NOT introduce any authority surface for setting or clearing `legal_hold_reference`.

### Audit Access Record authority (PR-A reaffirmation)

The existing baseline Audit Access Record entity remains unchanged. PR-A does NOT introduce new authority surfaces for Audit Access Record creation, modification, or query. Existing baseline rules apply: sensitive operations themselves are audited via Audit Access Record per the existing `Audit access/view activity should itself be auditable for sensitive records` rule.

### Search / query / review authority (PR-A reference-only)

PR-A does NOT introduce or modify search / query / review authority. The existing baseline Search/Investigation Workflow and its associated permission families (`audit.record.search`, `file_tracking.search`, `audit.sensitive.read`) are preserved.

PR-E will harden search authority with tenant / parent / child scope enforcement, cross-tenant denial, buyer/vendor projection scope, and sensitive-search auditing. PR-A leaves these as existing baseline.

### Forbidden authority modifications under PR-A

PR-A must NOT introduce:

- Any new Tenant Company role definition.
- Any new Tenant Company capability flag.
- Any new Tenant Company scope.
- Any new permission family in `modules/logs-audit-file-tracking/permissions.md` (the existing baseline families cover all PR-A authority needs).
- Any modification to existing baseline permission families' semantics.
- Any new permission to mutate source-module business records (Logs & Audit must NOT grant such authority).

### Boundary restrictions (PR-A reaffirmation of baseline)

Logs & Audit permissions under PR-A must NOT grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Pricing snapshot mutation or pricing calculation authority.
- Routing decision or suborder mutation authority.
- Fulfillment delivery, return, replacement, or exception authority.
- Invoice generation, finalization, reconciliation decision, or payment authority.
- Warranty claim approval authority.
- Tenant eligibility or role management authority.
- AI recommendation execution authority.
- Notification template or delivery authority.
- Analytics metric definition authority.
- Media lifecycle, version supersession, restriction application, alias mapping approval, or upload recovery authority.
- Order Routing export schedule, delivery, or batch authority.

PR-A's evidence-creation, amendment, and supersession surfaces are observation and proof recording only. Business outcomes belong to source modules.

### Audit requirements (PR-A reaffirmation of baseline)

Sensitive PR-A operations should themselves be audited:

- Evidence Record creation for `restricted_evidence = true` evidence.
- Evidence Amendment Record creation touching `restricted_evidence = true` or `redaction_class` in any restricted bucket.
- Evidence Supersession Record creation touching `restricted_evidence = true` or `redaction_class` in any restricted bucket.
- Source Snapshot Reference content when the snapshot includes sensitive metadata (subject to Source Snapshot Minimization Rule).
- External Evidence Reference content when external IDs or external file references touch sensitive scopes.

These audit requirements reuse the existing baseline rule "Audit access/view activity should itself be auditable for sensitive records." PR-A does NOT introduce new audit requirements beyond reaffirmation.

### Authority observability

Each PR-A authority-bearing action records:

- The actor reference (vendor user via source-module service, System Admin user, source-module service actor, scheduled-policy actor).
- The Tenant Company authority reference (existing `check_access` evidence reference).
- The audit reference (the Audit Record for this PR-A action).
- The Evidence Record reference (for amendment and supersession actions).

These references travel together on the Evidence Amendment Record and Evidence Supersession Record entities.

### Open authority questions retained for PR-D

PR-A does NOT decide:

- Which roles can view `restricted_evidence = true` evidence (PR-D).
- Whether buyer / vendor operations users can view Evidence Records directly or only through curated source-module views (PR-D).
- Whether the existing `audit.sensitive.read` permission family covers all PR-A sensitive-evidence reads or whether new families are needed for amendment/supersession review (PR-D).
- The full tenant / parent / child access matrix for Evidence Record reads (PR-D).
- Legal hold authority (PR-D).
- Cross-tenant evidence search restrictions beyond the existing baseline "denied by default" (PR-E).

These authority questions are bounded to PR-D / PR-E; PR-A does not pre-empt them.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/permissions.md`

> **Target file:** `modules/logs-audit-file-tracking/permissions.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline permissions or PR-A permissions).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Permissions - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Permissions - File Tracking Foundation

This section describes authority surfaces for PR-B. All existing baseline and PR-A permission patterns are preserved.

### Tenant Company authority discipline (PR-B reaffirmation)

PR-B authority-bearing actions are evaluated through existing Tenant Company `check_access` patterns and existing baseline permission families. **PR-B introduces NO new Tenant Company role definition, NO new capability flag, NO new scope, and NO new permission family.** Authority for each PR-B action maps to existing roles and existing permission families.

The existing baseline permission families are preserved verbatim:

- `audit.record.create`
- `audit.record.read`
- `audit.record.search`
- `audit.sensitive.read`
- `file_tracking.create`
- `file_tracking.read`
- `file_tracking.search`
- `file_tracking.payload_reference.read`
- `file_tracking.correction_history.read`
- `api_transmission_log.create`
- `api_transmission_log.read`
- `validation_result.create`
- `processing_result.create`
- `retry_failure_history.read`
- `retention_review.create`
- `retention_review.read`

The existing baseline roles are preserved:

- System Admin
- Audit Operations User
- Source Module Service Role
- Vendor Operations User
- Buyer Operations User
- Compliance / Security Reviewer Placeholder

### File Tracking Record creation authority (PR-B)

File Tracking Record creation flows through existing source-module-service authority. Source modules emit file activity as part of their own audit-worthy actions.

| Action | Source Module Service Role | System Admin | Audit Operations User | Vendor Operations User | Buyer Operations User |
|--------|----------------------------|--------------|------------------------|-------------------------|-------------------------|
| Create File Tracking Record for own module file activity (`file_tracking.create`) | yes | yes | no | no | no |
| Create File Tracking Record for another source module's activity | no (without approved system contract) | yes | no | no | no |
| Create File Tracking Record for cross-cutting administrative action | no | yes | no | no | no |

Vendor and buyer operations users do NOT directly create File Tracking Records under PR-B. Vendor and buyer activity that produces files (vendor uploads import file, buyer downloads export file) flows through the source-module service that processes the user action (e.g., Product Catalog service creates File Tracking Record when a vendor uploads a product import file; Order Routing service creates File Tracking Record when a System Admin triggers a vendor export). PR-B does NOT introduce direct File Tracking Record creation authority for vendor or buyer users.

### Duplicate File Detection Record creation authority (PR-B Workflow 6)

| Action | Source Module Service Role | System Admin |
|--------|----------------------------|--------------|
| Create Duplicate File Detection Record (triggered by File Tracking Record creation) | yes (automatic; part of PR-B Workflow 6) | yes |
| Manually create or amend a Duplicate File Detection Record | no | yes |

The existing `file_tracking.create` family covers automatic duplicate detection record creation. PR-B does NOT introduce a new permission family.

### Correction / Reupload History Record creation authority (PR-B Workflow 7)

| Action | Source Module Service Role | System Admin | Vendor Operations User | Buyer Operations User |
|--------|----------------------------|--------------|-------------------------|-------------------------|
| Submit a corrected reupload (triggers PR-B Workflow 7) | yes (via existing `file_tracking.create` family) | yes | no (only via source-module service that processes the upload) | no (only via source-module service that processes the upload) |
| Authorize Correction / Reupload History Record creation that touches restricted_evidence file | no | yes | no | no |

The existing `file_tracking.create` family covers Correction / Reupload History Record creation. Authority on the underlying file upload flows through the source-module service (which itself was authorized via existing roles).

### Reprocess / Retry Request Record creation authority (PR-B Workflow 8)

| Action | Source Module Service Role | System Admin | Audit Operations User |
|--------|----------------------------|--------------|------------------------|
| Submit a Reprocess / Retry Request against own-module file activity (`audit.record.create`) | yes | yes | no |
| Submit a Reprocess / Retry Request against another module's file activity | no (without approved system contract) | yes | no |
| Authorize a Reprocess / Retry Request that touches restricted_evidence | no | yes | no |

The existing `audit.record.create` family (plus existing baseline source-module service authority) covers Reprocess / Retry Request Record creation.

### Reprocess / Retry Outcome Record creation authority (PR-B Workflow 8)

| Action | Source Module Service Role | System Admin |
|--------|----------------------------|--------------|
| Submit a Reprocess / Retry Outcome Record after executing the reprocess | yes (the source module that executed the reprocess) | yes |
| Authorize Reprocess / Retry Outcome Record with `outcome_status` carrying terminal state | yes (same source module) | yes |

The `outcome_status` is set by the source module that executed (or attempted to execute) the reprocess. Logs & Audit records the outcome as submitted. The five values (`completed`, `failed`, `canceled`, `blocked`, `no_new_evidence`) are all valid terminal states; PR-B does NOT introduce permission gating per outcome_status value.

### Download Foundation authority (PR-B Workflow 4)

| Action | Source Module Service Role | System Admin | Audit Operations User | Vendor Operations User | Buyer Operations User |
|--------|----------------------------|--------------|------------------------|-------------------------|-------------------------|
| Initiate a download (which triggers PR-B Workflow 4 to create a new File Tracking Record with `file_direction = downloaded`) | yes (source-module service handles authorized downloads) | yes | yes (for audit exports per `audit.record.read` and `file_tracking.read`) | yes (for vendor-authorized downloads, via source-module service) | yes (for buyer-authorized downloads, via source-module service) |
| Authorize a download that touches `restricted_evidence = true` | no | yes | no | no | no |

Download authorization (who can download what content) is owned by the source module or Tenant Company per existing baseline. Logs & Audit records the download event via PR-B Workflow 4. Full download UX workflows (buyer media download packages, Product Catalog export download UX, report download UX, audit export download workflow) are PR-E or future; PR-B is foundation-only.

### Spine integration reference authority (PR-B)

The spine integration references on File Tracking Record are populated at evidence creation by source modules. PR-B introduces no specific authority for reference population beyond existing source-module-service `file_tracking.create` and `audit.record.create` permission families.

- Source modules populate the references for their own module file activity.
- Source modules MUST NOT create misleading file evidence for another source module without an approved system contract (reaffirms existing baseline rule).
- System Admins MAY create File Tracking Records for cross-cutting administrative actions.

### External Evidence Reference authority (PR-B Workflow 1 / Workflow 3)

The External Evidence Reference sub-structure (inherited from PR-A) on File Tracking Record is populated at evidence creation, typically driven by Integration Management transport activity or Notification Platform Service delivery activity.

- Integration Management (or another transport-owning service) populates the sub-structure for transport-related file evidence.
- Notification Platform Service (when applicable per PR-C decision) populates the sub-structure for delivery-related file evidence.
- No new permission family is introduced. Existing `file_tracking.create` plus Integration Management's / Notification Platform Service's own authority covers this surface.
- External-Tool-Not-Source-of-Truth Rule applies: external evidence is coordination/proof only.

### Actor / Service Trigger / Company Scope Reference authority (PR-B)

These reference types (inherited from PR-A) resolve to Tenant Company records.

- Source modules populate Actor Reference with the human user actor reference at file activity creation.
- Source modules populate Service Trigger Reference with the service-trigger reference when the action is service-initiated.
- Source modules populate Company Scope Reference with the company scope at file activity creation.
- Tenant Company `check_access` enforces the scope; PR-B does NOT add a new check_access invocation pattern.
- Cross-tenant file creation is denied by default (reaffirms baseline rule extended to file evidence).

### Discriminator field authority (PR-B)

- Source modules assign `file_direction`, `file_purpose`, `file_lifecycle_status` at File Tracking Record creation.
- PR-B does NOT introduce a separate permission for setting these fields beyond existing `file_tracking.create` authority.
- `file_lifecycle_status` transitions during the file's lifecycle (validation, processing, replacement, supersession, archival) are triggered by source-module audit-worthy actions through PR-B workflows.

### Retention / Redaction / Access class assignment authority (PR-B)

- Source modules assign `retention_class`, `redaction_class`, `access_class` at File Tracking Record creation (per PR-A's At-Creation Classification Rule extended to file evidence).
- PR-D will introduce review workflows that may upgrade or downgrade the class (with audit trail via Evidence Amendment Record).
- System Admin and Compliance / Security Reviewer roles will have review authority in PR-D; PR-B does NOT introduce class-review authority for files.

### `restricted_evidence` flag authority (PR-B)

- Source modules set `restricted_evidence = true` on the parent Evidence Record (PR-A) when the file evidence content is restricted from normal access.
- The flag is a source-module classification at evidence creation; PR-B does NOT introduce a separate authority for setting the flag on file evidence beyond PR-A's authority.
- The full gating matrix (which roles can read `restricted_evidence = true` file evidence under which conditions) is PR-D.

### `legal_hold_reference` placeholder authority (PR-B)

- PR-B introduces no new authority surface for legal_hold_reference on file evidence.
- The Legal Hold entity, lifecycle, application authority, and lift authority are PR-D.
- PR-B does NOT introduce any authority surface for setting or clearing `legal_hold_reference` on File Tracking Record or parent Evidence Record.

### Audit Access Record authority (PR-B reaffirmation)

The existing baseline Audit Access Record entity remains unchanged by PR-B. PR-B does NOT introduce new authority surfaces for Audit Access Record creation, modification, or query. Existing baseline rules apply: sensitive operations themselves are audited via Audit Access Record per the existing `Audit access/view activity should itself be auditable for sensitive records` rule.

### Search / query / review authority (PR-B reference-only)

PR-B does NOT introduce or modify search / query / review authority. The existing baseline Search / Investigation Workflow and its associated permission families (`audit.record.search`, `file_tracking.search`, `audit.sensitive.read`) are preserved.

PR-E will harden search authority with tenant / parent / child scope enforcement, cross-tenant denial, buyer/vendor projection scope, and sensitive-search auditing. PR-B leaves these as existing baseline.

### Forbidden authority modifications under PR-B

PR-B must NOT introduce:

- Any new Tenant Company role definition.
- Any new Tenant Company capability flag.
- Any new Tenant Company scope.
- Any new permission family in `modules/logs-audit-file-tracking/permissions.md` (the existing baseline families cover all PR-B authority needs).
- Any modification to existing baseline permission families' semantics.
- Any new permission to mutate source-module business records.

### Boundary restrictions (PR-B reaffirmation of baseline + PR-A)

Logs & Audit permissions under PR-B must NOT grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Pricing snapshot mutation or pricing calculation authority.
- Routing decision or suborder mutation authority.
- Fulfillment delivery, return, replacement, or exception authority.
- Invoice generation, finalization, reconciliation decision, or payment authority.
- Warranty claim approval authority.
- Tenant eligibility or role management authority.
- AI recommendation execution authority.
- Notification template or delivery authority.
- Analytics metric definition authority.
- Media lifecycle, version supersession, restriction application, alias mapping approval, or upload recovery authority.
- Order Routing export schedule, delivery, or batch authority.
- Source-module reprocess execution authority (Logs & Audit records request and outcome only; source modules execute).
- Source-module duplicate outcome decision authority (Logs & Audit creates evidence; source modules decide block/warn/accept/reject/ignore/reprocess).

PR-B's file-evidence-creation, reupload, reprocess, and download-foundation surfaces are observation and proof recording only. Business outcomes belong to source modules.

### Audit requirements (PR-B reaffirmation of baseline + PR-A)

Sensitive PR-B operations should themselves be audited:

- File Tracking Record creation for `restricted_evidence = true` parent Evidence Record.
- Correction / Reupload History Record creation touching `restricted_evidence = true` or restricted-bucket `redaction_class`.
- Reprocess / Retry Request Record creation touching `restricted_evidence = true`.
- Reprocess / Retry Outcome Record creation touching `restricted_evidence = true`, regardless of `outcome_status` value.
- Download events (PR-B Workflow 4) for files in restricted-bucket `redaction_class` or with `restricted_evidence = true` parent Evidence Record.
- Full Payload Exception Record references where the file's content is in any sensitive bucket.
- External Evidence Reference content when external IDs or external file references touch sensitive scopes.

These audit requirements reuse the existing baseline rule "Audit access/view activity should itself be auditable for sensitive records." PR-B does NOT introduce new audit requirements beyond reaffirmation.

### Authority observability (PR-B)

Each PR-B authority-bearing action records:

- The actor reference (vendor user via source-module service, System Admin user, source-module service actor, scheduled-policy actor, downloader).
- The Tenant Company authority reference (existing `check_access` evidence reference).
- The audit reference (the Audit Record for this PR-B action).
- The Evidence Record reference (PR-A parent).
- The File Tracking Record reference.
- For Correction / Reupload History Record: prior and replacement File Tracking Record references; optional Evidence Supersession Record reference.
- For Reprocess / Retry Request and Outcome Records: cross-references and outcome_status.

These references travel together on the new entity records.

### Open authority questions retained for PR-D / PR-E

PR-B does NOT decide:

- Which roles can view `restricted_evidence = true` file evidence (PR-D).
- Which roles can view file evidence per `access_class` bucket (PR-D).
- Whether buyer / vendor operations users can view File Tracking Records directly or only through curated source-module views (PR-D).
- Whether download events on restricted files should trigger Audit Access Record creation (PR-D / PR-E).
- The full tenant / parent / child access matrix for File Tracking Record reads (PR-D).
- Legal hold authority on file evidence (PR-D).
- Cross-tenant file search restrictions beyond the existing baseline "denied by default" (PR-E).
- Buyer-facing download UX authority (PR-E or future).
- Whether reprocess requests on restricted file evidence require an additional Compliance/Security review step (PR-D).

These authority questions are bounded to PR-D / PR-E; PR-B does not pre-empt them.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/permissions.md`

> **Target file:** `modules/logs-audit-file-tracking/permissions.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Permissions - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Permissions - Cross-Module Evidence Catalog

This section describes authority surfaces for PR-C. PR-C is documentation-only and introduces NO new authority surfaces. All existing baseline, PR-A, and PR-B permission patterns are preserved.

### Tenant Company authority discipline (PR-C reaffirmation)

PR-C introduces:

- **NO new Tenant Company role definition.**
- **NO new Tenant Company capability flag.**
- **NO new Tenant Company scope.**
- **NO new permission family** in `modules/logs-audit-file-tracking/permissions.md`.

PR-C is documentation-only; no authority decisions are made. Evidence emission flows through existing source-module-service authority and existing Tenant Company `check_access` patterns.

### Authority for catalog usage (PR-C)

The PR-C catalog itself is documentation. Authority for evidence emission per PR-C catalogued evidence_type values flows through existing patterns:

- Source modules choose which `evidence_type` value to populate at evidence creation. The choice is bound by the source module's own authority to emit evidence (existing `audit.record.create`, `file_tracking.create`, etc.).
- Logs & Audit observes; source modules decide.
- No new authority is needed to select a starter or placeholder evidence_type value; the existing evidence emission authority covers it.

### Authority for status promotion (future PR scope)

Promotion of an evidence_type identifier from `starter` to `final` requires an explicit future PR. The future PR will:

- Document the source-module hardening that confirms the identifier semantics.
- Update the Evidence Type Catalog to mark the identifier as `final`.
- Notify subscribers of the stability change.

PR-C does NOT introduce promotion authority. Promotion is a documentation-change decision made by future PR review.

### Authority for AI Agent Services / Warranty Registration enumeration (future PR scope)

Enumeration of evidence_type values in the AI Agent Services or Warranty Registration reserved family slots requires the module to exist (`modules/ai-agent-services/` or `modules/warranty-registration/` to be present on main). When the module exists, a future PR will populate the family with starter values.

PR-C does NOT introduce enumeration authority. Enumeration is a documentation-change decision made by future PR review after module existence is confirmed.

### Authority for default class guidance refinement (PR-D scope)

PR-C's default class guidance is suggestion-only. PR-D will lock retention duration matrix, full access matrix, legal hold workflows, and redaction transformation workflows.

PR-D will introduce new authority surfaces for:

- Retention class assignment review (future PR-D role / family).
- Redaction class assignment review (future PR-D role / family).
- Access class assignment review (future PR-D role / family).
- Legal hold application authority (future PR-D Legal Hold entity authority).
- Restricted evidence access gating (future PR-D access matrix).

PR-C does NOT introduce any of these. PR-D scope.

### Authority for search / query / review (PR-E scope)

PR-E will introduce search / query / review authority surfaces for evidence_type-aware queries.

PR-C does NOT introduce search authority. PR-E scope.

### Audit Access Record authority (PR-C reaffirmation)

The existing baseline Audit Access Record entity remains unchanged by PR-C. PR-C does NOT introduce new authority surfaces for Audit Access Record creation, modification, or query. Existing baseline rules apply.

### Boundary restrictions (PR-C reaffirmation of baseline + PR-A + PR-B)

PR-C permissions do NOT grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Media lifecycle, version supersession, restriction application, alias mapping approval, or upload recovery authority.
- Order Routing export schedule, delivery, or batch authority.
- Fulfillment delivery, return, replacement, or exception authority.
- Integration Management transport / provider authority.
- Notification template, delivery, or suppression authority.
- Invoice generation, finalization, reconciliation, or payment authority.
- Pricing snapshot mutation or pricing calculation authority.
- Analytics metric definition authority.
- Tenant role / capability / status mutation authority.
- Procurement / PO lifecycle authority.
- Launch / Event activation authority.
- AI agent execution authority.
- Warranty claim approval authority.
- Source-module reprocess execution authority (Logs & Audit records request and outcome only; source modules execute).
- Source-module duplicate outcome decision authority.

PR-C's evidence-catalog surfaces are documentation. Business outcomes belong to source modules.

### Audit requirements (PR-C reaffirmation of baseline + PR-A + PR-B)

Sensitive PR-C-tagged evidence operations should themselves be audited per the existing baseline rule:

- Evidence_type values tagged with default class guidance `restricted_evidence = true_likely` should respect PR-A's restricted_evidence flag (set on the parent Evidence Record by source modules) and PR-D will define gating.
- Evidence_type values from `tenant_company` family touching role / permission / capability changes should respect restricted_pii redaction class guidance.
- Evidence_type values from `invoice_management` / `pricing` families should respect restricted access class guidance.

PR-C does NOT introduce new audit requirements; existing baseline and PR-A / PR-B audit requirements apply.

### Authority observability (PR-C)

PR-C evidence emission records (which are existing PR-A and PR-B records carrying the new PR-C `evidence_type` value):

- The actor reference or service trigger reference (per existing PR-A pattern).
- The Tenant Company authority reference (existing `check_access` evidence reference).
- The audit reference (the Audit Record for the action).
- The Evidence Record reference (PR-A parent, now carrying PR-C catalogued `evidence_type`).
- The File Tracking Record reference (PR-B, for file-backed evidence_type values).

References travel together per existing PR-A and PR-B discipline.

### Open authority questions retained for PR-D / PR-E

PR-C does NOT decide:

- Which roles can view evidence of `restricted_evidence = true` (PR-D).
- Which roles can view evidence per `access_class` bucket (PR-D).
- Which roles can view evidence per family (PR-D).
- Whether buyer / vendor operations users can view Evidence Records directly or only through curated source-module views (PR-D).
- Legal hold authority on evidence (PR-D).
- Cross-tenant evidence search restrictions (PR-E reaffirms baseline denied by default).
- Buyer-facing evidence export authority (PR-E or future).
- Whether evidence on restricted families requires additional Compliance / Security review (PR-D).
- Status promotion authority (future PR scope).
- AI Agent Services / Warranty Registration enumeration authority (future PR after module exists).

These authority questions are bounded to PR-D / PR-E / future PRs; PR-C does not pre-empt them.

### PR-C authority surface inventory (summary)

- **New Tenant Company roles:** 0.
- **New Tenant Company capability flags:** 0.
- **New Tenant Company scopes:** 0.
- **New permission families:** 0.
- **New authority decisions:** 0.
- **Existing baseline / PR-A / PR-B permissions:** all preserved.

PR-C is documentation-only.
```

## PR-D Permissions - Retention / Redaction / Legal Hold / Access Governance

This section describes authority surfaces for PR-D. PR-D documents access expectations; Tenant Company `check_access` is canonical authority. PR-D introduces **NO new Tenant Company role, capability flag, scope, or permission family.** Per No-New-Tenant-Roles-In-PR-D Rule and Tenant-Company-Owns-Authority Rule.

### Tenant Company authority discipline (PR-D reaffirmation)

PR-D introduces:

- **NO new Tenant Company role definition.**
- **NO new Tenant Company capability flag.**
- **NO new Tenant Company scope.**
- **NO new permission family** in `modules/logs-audit-file-tracking/permissions.md`.

PR-D is documentation-and-architecture; no authority decisions are made. Access evaluation flows through existing Tenant Company `check_access` patterns; PR-D logs the outcome via hardened Audit Access Record.

### Authority for retention disposition

- Retention Disposition Record creation requires authority. PR-D documents that the authority is a service or human actor with appropriate permission per Tenant Company `check_access` (typically restricted to operational service identities and Compliance / Audit Reviewer; specific role / capability definition deferred to future Tenant Company coordination).
- Logs & Audit logs the disposition via Retention Disposition Record; Tenant Company evaluates whether the actor has authority.

### Authority for redaction transformation

- Redaction Transformation Record creation requires authority. PR-D documents that the authority is typically a service identity (automatic redaction per policy) or a Compliance / Audit Reviewer (manual redaction). Specific role / capability definition deferred.
- Logs & Audit logs the transformation; Tenant Company evaluates authority.

### Authority for legal hold apply / release

- Legal Hold Apply / Release authority is owned by Compliance / legal team (per PR-D boundary discipline).
- PR-D documents the expectation that Compliance / legal actors apply / release holds.
- Tenant Company `check_access` evaluates whether the actor has authority for hold-apply or hold-release operations.
- Specific Compliance / Audit Reviewer / Legal Authority role / capability definition deferred to future Tenant Company coordination.

### Authority for raw evidence access

- Raw evidence access is EXCEPTIONAL per Raw-Evidence-Access-Exceptional Rule.
- `access_reason_reference` is REQUIRED.
- Tenant Company `check_access` evaluates elevated authority requirement for raw access of the evidence's `access_class` + `restricted_evidence`.
- Specific Raw Access Authorizer role / capability definition deferred to future Tenant Company coordination.

### Authority for restricted evidence access

- Restricted evidence (Evidence Record with `restricted_evidence = true`) access requires elevated authority.
- PR-D's sensitivity mapping typically maps restricted evidence to `compliance_only` or `system_admin_only` access_class.
- Tenant Company `check_access` evaluates whether actor has the required access_class authority.

### Authority for break-glass access

- Break-glass access (`break_glass_flag = true` on Audit Access Record) is emergency / exceptional access.
- `access_reason_reference` is REQUIRED.
- PR-D documents the expectation that break-glass is rare (incident response, regulatory subpoena, etc.); concrete approval workflow deferred to future Tenant Company coordination.
- Break-glass access is logged; flagged for elevated review.

### Authority for status promotion (future PR scope)

- Promotion of PR-C catalog evidence_type identifiers from starter to final is a future-PR documentation change (per PR-C canonical Promotion Rule).
- PR-D does NOT promote any identifier to final.
- PR-D's sensitivity mapping uses PR-C identifiers as-is (starter / placeholder).

### Authority for retention duration locking (CPA / legal / DevOps scope)

- Concrete retention duration values are owned by CPA / legal / DevOps.
- PR-D's named retention policy references are placeholders awaiting duration values.
- Future CPA / legal / DevOps review locks duration values; not a PR-D authority.

### Authority for AI Agent Services / Warranty Registration enumeration (future PR scope)

- Enumeration of evidence_type values in AI Agent Services or Warranty Registration reserved family slots requires the module to exist (`modules/ai-agent-services/` or `modules/warranty-registration/` present on main).
- When the module exists, future PR populates the family AND extends PR-D's sensitivity mapping.
- PR-D does NOT introduce enumeration authority.

### Audit Access Record authority (PR-D hardening discipline)

The existing baseline Audit Access Record entity remains; PR-D HARDENS by adding discriminators and clarified fields. PR-D does NOT introduce new authority surfaces for Audit Access Record creation. Existing baseline rules apply, augmented by:

- **All-Access-Logged Rule.** Every access attempt (granted / denied / attempted) MUST be logged.
- **Service-Identity-Access-Logged Rule.** Service identity access logged identically to human access.

### Boundary restrictions (PR-D reaffirmation of baseline + PR-A + PR-B + PR-C)

PR-D permissions do NOT grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Media lifecycle, version supersession, restriction application, alias mapping approval, or upload recovery authority.
- Order Routing export schedule, delivery, or batch authority.
- Fulfillment delivery, return, replacement, or exception authority.
- Integration Management transport / provider authority.
- Notification template, delivery, or suppression authority.
- Invoice generation, finalization, reconciliation, or payment authority.
- Pricing snapshot mutation or pricing calculation authority.
- Analytics metric definition authority.
- Tenant role / capability / status mutation authority.
- Procurement / PO lifecycle authority.
- Launch / Event activation authority.
- AI agent execution authority.
- Warranty claim approval authority.
- Source-module reprocess execution authority (Logs & Audit records request and outcome only; source modules execute).
- Source-module duplicate outcome decision authority.

PR-D's governance surfaces are policy + record-keeping. Business outcomes belong to source modules. Authority belongs to Tenant Company.

### Audit requirements (PR-D reaffirmation of baseline + PR-A + PR-B + PR-C)

Sensitive PR-D-recorded operations are themselves audited per the existing baseline rule:

- Legal Hold Apply / Release operations recorded via Audit Record (PR-A) + Legal Hold Record (PR-D).
- Retention Disposition recorded via Audit Record (PR-A) + Retention Disposition Record (PR-D).
- Redaction Transformation recorded via Audit Record (PR-A) + Redaction Transformation Record (PR-D).
- Every Audit Access Record access decision is itself an audit trail; nested audit (accessing the Audit Access Record itself) is also logged (per All-Access-Logged Rule).

### Authority observability (PR-D)

PR-D records (Legal Hold Record, Retention Disposition Record, Redaction Transformation Record, hardened Audit Access Record) carry:

- The `actor_reference` or `service_trigger_reference` (per existing PR-A pattern).
- The Tenant Company authority reference (existing `check_access` evidence reference).
- The `audit_record_reference` (the Audit Record for the action).
- The `evidence_record_reference` (the parent Evidence Record).
- The `correlation_reference` (PR-A envelope field).

References travel together per existing PR-A and PR-B discipline.

### Open authority questions retained for future PRs

PR-D does NOT decide:

- Concrete Compliance / Audit Reviewer role definition (Tenant Company hardening).
- Concrete Raw Access Authorizer role definition.
- Concrete Legal Hold Authority role definition.
- Concrete Break-Glass Approver role definition.
- Per-tenant access matrix overrides.
- Cross-tenant evidence-sharing patterns (currently denied by default).
- Service identity catalog for source-module services.
- Concrete retention duration values (CPA / legal / DevOps).
- Concrete archive storage tier policy (DevOps).
- Concrete purge execution mechanism (DevOps).
- Search / query / review authority (PR-E).
- Buyer / vendor evidence download authority (PR-E or future).

These authority questions are bounded to future PRs (Tenant Company coordination, CPA / legal / DevOps review, PR-E, future API Governance Foundation PR); PR-D does not pre-empt them.

### PR-D authority surface inventory (summary)

- **New Tenant Company roles:** 0.
- **New Tenant Company capability flags:** 0.
- **New Tenant Company scopes:** 0.
- **New permission families:** 0.
- **New authority decisions:** 0.
- **Existing baseline / PR-A / PR-B / PR-C permissions:** all preserved.
- **PR-D-recorded authority operations:** 4 (Legal Hold Apply, Legal Hold Release, Retention Disposition, Redaction Transformation; all flow through Audit Record + Tenant Company `check_access`).
- **PR-D access logging:** Every access via hardened Audit Access Record per All-Access-Logged Rule.

PR-D is documentation-and-architecture; Tenant Company remains canonical authority.

## PR-E Permissions - Search / Query / Review / Investigation / Audit Report Export

This section describes authority surfaces for PR-E. PR-E documents access expectations; Tenant Company `check_access` is canonical authority. PR-E introduces **NO new Tenant Company role, capability flag, scope, or permission family.** Per PR-D No-New-Tenant-Roles-In-PR-D Rule extended.

### Tenant Company authority discipline (PR-E reaffirmation)

PR-E introduces:

- **NO new Tenant Company role definition.**
- **NO new Tenant Company capability flag.**
- **NO new Tenant Company scope.**
- **NO new permission family** in `modules/logs-audit-file-tracking/permissions.md`.

PR-E is documentation-and-architecture; no authority decisions are made. Access evaluation flows through existing Tenant Company `check_access` patterns; PR-E logs the outcome via PR-D's hardened Audit Access Record.

### Authority for Evidence Search Session creation

- Search Session creation requires `actor_reference` or `service_trigger_reference` per PR-A discipline.
- Cross-tenant searches denied by default; tenant scope verified via Tenant Company `check_access`.
- Sensitive searches (per `sensitive_filter_used` discriminator) require `search_initiated_purpose_reference` per Sensitive-Search-Logged Rule.
- Specific Investigator / Reviewer role definition deferred to future Tenant Company coordination.

### Authority for per-result search access

- Every result access flows through PR-D Workflow 8 (Evidence Access Recording).
- Tenant Company `check_access` evaluates per-result authority.
- PR-D Access Policy Matrix evaluates `access_class` + `restricted_evidence` + `legal_hold_state` + redaction audience.
- Both must succeed for `access_result = granted`.
- Hardened Audit Access Record logs the decision.

### Authority for visible-denied metadata

- Visible-denied metadata (per Visible-Denied-Metadata-Minimized Rule) is allowed ONLY for authorized audit / compliance reviewers per PR-D Access Policy Matrix.
- Specific Compliance / Audit Reviewer role definition deferred to future Tenant Company coordination.
- Visible-denied metadata MUST be minimized: no raw content; no restricted details; only presence-of-evidence + evidence_type + family + captured_at + class fields + denial reason.

### Authority for raw evidence retrieval (within search)

- Raw retrieval is exceptional per PR-D Raw-Evidence-Access-Exceptional Rule.
- `access_reason_reference` REQUIRED.
- Tenant Company `check_access` evaluates elevated authority requirement.
- Specific Raw Access Authorizer role definition deferred to future Tenant Company coordination.

### Authority for Evidence Review Session creation

- Review Session creation requires `actor_reference` (REQUIRED reviewer); service-only review exceptional.
- Tenant Company `check_access` evaluates reviewer authority.
- Specific Reviewer / Investigator role definition deferred to future Tenant Company coordination.

### Authority for Review Note / Annotation creation

- Review Note creation requires `actor_reference` (REQUIRED reviewer).
- Tenant Company `check_access` evaluates note-creation authority for the target Evidence Record / Evidence Collection Record / Review Session.
- For notes targeting `restricted_evidence` records, `review_note_redaction_class` is elevated per PR-D Redaction Policy Matrix.

### Authority for Evidence Collection Record creation

- Collection creation requires `actor_reference` OR `service_trigger_reference`.
- Tenant Company `check_access` evaluates collection-creation authority.
- Membership additions / removals are evaluated against requester's authority for each referenced Evidence Record.

### Authority for Audit Report Export Record creation

- Export creation requires `actor_reference` OR `service_trigger_reference`.
- `export_purpose_reference` REQUIRED.
- Tenant Company `check_access` evaluates export-creation authority for each evidence item in scope.
- For evidence under active Legal Hold, export MAY proceed if authority granted (per OQ-EX-5 locked decision); export records hold state at export time.
- For raw export items, per-item PR-D Workflow 9 escalation required with `access_reason_reference`.

### Authority for export download / access

- Every download / access to an Audit Report Export package (when `export_status = generated`) flows through PR-D Workflow 8 -> PR-D hardened Audit Access Record per Export-Access-Logged-Via-PR-D Rule.
- `view_type` defaults to `redacted` (the export is already masked / redacted at generation per audience).
- Raw view of export items requires elevated authority + reason.
- NO separate Audit Export Download Record.

### Authority for metadata-only report preview

- Metadata-only previews (`export_status = metadata_only`) do NOT require PR-B File Tracking Record per Export-File-Tracking-Only-When-Artifact-Exists Rule.
- Preview access still requires Tenant Company `check_access` authority for the underlying evidence.
- Preview access still logged via PR-D Workflow 8.

### Authority observability (PR-E)

PR-E records (Evidence Search Session, Evidence Review Session, Evidence Collection Record, Review Note / Annotation, Audit Report Export Record) carry:

- `actor_reference` or `service_trigger_reference` (per PR-A discipline).
- `company_scope_reference` (REQUIRED single-tenant).
- `audit_record_reference` (parent Audit Record per PR-A).
- `correlation_reference` (PR-A envelope field).

References travel together per existing PR-A / PR-B / PR-C / PR-D discipline.

### Boundary restrictions (PR-E reaffirmation of baseline + PR-A + PR-B + PR-C + PR-D)

PR-E permissions do NOT grant:

- Product Catalog record editing.
- Device Catalog identity or lifecycle editing.
- Media lifecycle / version supersession / restriction / alias mapping / upload recovery authority.
- Order Routing export schedule / delivery / batch authority.
- Fulfillment delivery / return / replacement / exception authority.
- Integration Management transport / provider authority.
- Notification template / delivery / suppression authority.
- Invoice generation / finalization / reconciliation / payment authority.
- Pricing snapshot mutation or calculation authority.
- Analytics metric definition authority (Analytics module owns).
- Tenant role / capability / status mutation authority (Tenant Company owns).
- Procurement / PO lifecycle authority.
- Launch / Event activation authority.
- AI agent execution authority.
- Warranty claim approval authority.
- Source-module reprocess execution authority (Logs & Audit records request and outcome only).
- Source-module duplicate outcome decision authority.

PR-E's governance surfaces are search policy + record-keeping. Business outcomes belong to source modules. Authority belongs to Tenant Company.

### Audit requirements (PR-E reaffirmation)

Sensitive PR-E-recorded operations are themselves audited per existing baseline + PR-A through PR-D rules:

- Evidence Search Session creation recorded via Audit Record (PR-A) + `audit.search.executed` event.
- Per-result access recorded via PR-D Workflow 8 -> PR-D hardened Audit Access Record + `audit.evidence-access.recorded`.
- Evidence Review Session creation / transition recorded via Audit Record (PR-A) + `audit.review-session.recorded` event.
- Review Note / Annotation creation recorded via Audit Record (PR-A) + `audit.review-note.recorded` event.
- Evidence Collection Record creation / membership change recorded via Audit Record (PR-A) + `audit.record.created`; if within Review Session, ALSO `audit.review-session.recorded`.
- Audit Report Export Record creation recorded via Audit Record (PR-A) + `audit.evidence-export.recorded` event.
- Export download / access recorded via PR-D Workflow 8 -> PR-D hardened Audit Access Record + `audit.evidence-access.recorded`.

### Open authority questions retained for future PRs

PR-E does NOT decide:

- Concrete Compliance / Audit Reviewer role definition (Tenant Company hardening).
- Concrete Raw Access Authorizer role definition.
- Concrete Legal Hold Authority role definition (per PR-D).
- Concrete Break-Glass Approver role definition (per PR-D).
- Concrete Reviewer / Investigator role definition.
- Concrete Review Assignment authority.
- Concrete Investigation Case Management authority (future module).
- Per-tenant search override policy.
- Cross-tenant evidence-sharing patterns (currently denied by default).
- Service identity catalog for source-module services.
- Concrete retention duration values (CPA / legal / DevOps; per PR-D).
- Concrete archive storage tier policy (DevOps).
- Concrete purge execution mechanism (DevOps; per PR-D).
- Concrete export file format (PDF / CSV / JSON / ZIP).
- Concrete download distribution authority.
- Saved Search authority re-evaluation rules.
- Search rate-limiting policy.

These authority questions are bounded to future PRs (Tenant Company coordination, CPA / legal / DevOps review, PR-E follow-ups, future API Governance Foundation PR); PR-E does not pre-empt them.

### PR-E authority surface inventory (summary)

- **New Tenant Company roles:** 0.
- **New Tenant Company capability flags:** 0.
- **New Tenant Company scopes:** 0.
- **New permission families:** 0.
- **New authority decisions:** 0.
- **Existing baseline / PR-A / PR-B / PR-C / PR-D permissions:** all preserved.
- **PR-E-recorded authority operations:** 5 (Evidence Search Session creation, Evidence Review Session lifecycle, Review Note creation, Evidence Collection Record creation, Audit Report Export Record creation; all flow through Audit Record + Tenant Company `check_access`).
- **PR-E access logging:** Every per-result access + every export download via PR-D hardened Audit Access Record per Search-Defers-To-PR-D-Access-Governance Rule and Export-Access-Logged-Via-PR-D Rule.

PR-E is documentation-and-architecture; Tenant Company remains canonical authority.
