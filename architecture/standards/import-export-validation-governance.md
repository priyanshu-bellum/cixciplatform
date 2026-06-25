# Import / Export / Validation Governance Standard

This standard defines complete-platform governance for import, export, and validation workflows across CIXCI modules. It is a shared platform standard, not a new bounded context.

Source modules remain the owners of their source-of-truth records, domain validation, and final apply/mutation behavior. This standard defines common expectations so import/export experiences are predictable, non-destructive by default, auditable, and safe across Product Catalog, Device Catalog, Pricing, Media / Image Asset Management, Order Routing, Fulfillment / Returns, Invoice Management, Logs & Audit File Tracking, Integration Management, Notification Platform Service, Analytics / Reporting, Procurement / Purchase Orders, Launch / Event Management, AI Agent Services, Warranty Registration / Claims, and future modules.

## Purpose

CIXCI supports API-first workflows with CSV/file fallback, manual vendor file workflows, scheduled exports, external integration delivery, and module-owned operational imports. These workflows need common governance for:

- Mode selection.
- Create versus update separation.
- Validation and preview.
- Non-destructive defaults.
- Controlled destructive actions.
- Error reporting and correction.
- Identifier and date handling.
- Audit evidence.
- Integration failure tracking.
- AI-ready events and review signals.

This standard should be referenced by modules rather than copied into each module in full.

## Ownership Model

### Platform Standard Owns

- Common import/export governance rules.
- Shared lifecycle/status vocabulary.
- Shared validation and preview expectations.
- Shared non-destructive/destructive behavior rules.
- Shared identifier, date, and file conventions.

### Source Modules Own

- Domain-specific validation.
- Required identifiers.
- Locked/editable fields.
- Final apply/mutation behavior.
- Source-of-truth records.

Examples:

- Product Catalog owns product import application, compatibility assertions, product visibility records, buyer activation/download records, product identifiers, catalog-carried pricing inputs, and catalog exports.
- Device Catalog owns device import application, Device References, canonical device records, device visibility, and device exports.
- Pricing owns pricing rule/import interpretation, pricing snapshots, pricing exceptions, pricing overrides, buyer-specific pricing behavior, and price calculation outputs.
- Media / Image Asset Management owns image/ZIP upload processing, validation, renditions, URL generation, and media access references.
- Fulfillment / Returns owns shipment, tracking, delivery, return, replacement, and operational status imports.
- Invoice Management owns invoice CSV exports, reconciliation upload placeholders, and invoice archive behavior.

### Tenant Company Owns

- User/company/entity permissions.
- Import/export authority.
- Destructive action authority.
- Override authority.
- Schedule/view permissions.
- Tenant, buyer, vendor, manufacturer, parent, child entity, role, activation, relationship, region, Product Type, licensed-property, and readiness scope signals.

### Logs & Audit Owns

- Immutable evidence.
- File tracking.
- Row counts.
- Validation outcomes.
- Processing outcomes.
- Payload/file references.
- Import/export summaries.
- Audit search and retention/redaction metadata.

Logs & Audit must not mutate source records.

### Integration Management Owns

- External delivery/receipt state.
- API, webhook, CSV, SFTP, manual upload/download, and external transport evidence.
- Provider failures/retries.
- External system references.
- External ID mapping evidence.
- Inbound webhook receipt evidence and outbound delivery evidence.

Integration Management must not mutate source records unless the owning source module accepts the result through its own workflow.

### Notification Platform Service Owns

- Scheduled email delivery.
- Recipient delivery status.
- Notification history.
- Delivery attempt tracking, retries, suppression, and provider response references.

Notification Platform Service does not own the export content or source-module export eligibility.

### Analytics / Reporting Owns

- Report exports only.
- Reporting read-model exports.
- Reporting export lifecycle.
- Reporting export schema/version, redaction, and retention metadata.

Analytics must not bypass source-module or Tenant Company visibility rules.

### AI Agent Services Owns

- Recommendations.
- Correction suggestions.
- Review signals.
- Pattern detection.

AI Agent Services must not apply corrections, mutate source records, confirm imports, perform destructive actions, or bypass permissions without approved action contracts and source-module authority.

## Boundary Rules

- Do not create a new Import/Export bounded context from this standard.
- Do not move business validation ownership away from source modules.
- Do not let Logs & Audit mutate source records.
- Do not let Integration Management mutate source records.
- Do not let AI agents apply corrections without approved action contracts and permissions.
- Do not let Analytics bypass source-module or Tenant Company visibility rules.
- Do not let exports become hidden data access paths around module permissions, redaction, or tenant scope.
- Do not let imported external IDs replace internal CIXCI source-of-truth identifiers.

## Import Mode Selection

Every import workflow should declare an explicit mode before validation or apply. Proposal-level modes include:

- Create only.
- Update only.
- Create and update, only where explicitly allowed by the source module.
- Validate only / dry run.
- Correction / reupload.
- Supersession / revision.
- Destructive action mode, only where explicitly allowed.

The default mode should be non-destructive and should avoid overwriting existing source records unless the user or integration explicitly selects an allowed update behavior.

## Create Versus Update Separation

Create and update behavior should be separated so imports cannot accidentally create duplicates or overwrite existing records.

Create workflows should:

- Require create-specific identifiers or uniqueness checks.
- Block or route to review when a row matches an existing record where create-only behavior is selected.
- Avoid converting a failed create into an update without explicit confirmation.

Update workflows should:

- Require an existing source-module record match.
- Block when a row matches zero records or multiple records.
- Require a stable identifier or source-module-approved match rule.
- Preserve immutable history and prior versions.

Mixed create/update workflows should be allowed only when the source module explicitly supports the behavior and the preview separates create rows from update rows.

## Update-Only Protection

Update-only imports must not create new records as a fallback.

If an update row cannot be matched to exactly one existing record, the row should become error, warning, skipped, or review-required according to source-module policy. It should not silently create a new record.

## Blank Field Protection

Blank, null, or omitted fields in import files should not overwrite existing values unless the source module supports an explicit clear/delete operation.

Proposal-level blank field handling:

- Omitted field: no change by default.
- Blank cell: no change by default unless clear mode is explicitly selected.
- Explicit clear token: allowed only where source-module rules support clearing that field.
- Required blank field: validation error.
- Locked blank field: validation error or warning according to source-module rules.

The preview should distinguish no change, set value, clear value, and invalid blank behavior.

## Required Identifier Rules

Each source module must define required identifiers for every import/export contract.

Required identifier governance:

- Identifiers must be scoped by namespace and source module.
- UPC, GTIN, SKU, external IDs, Device References, Media Asset IDs, Pricing Snapshot IDs, routed suborder references, invoice IDs, tenant/company/entity IDs, and integration IDs must not share a flat namespace.
- Matching rules must declare case sensitivity, whitespace normalization, punctuation handling, source authority, and collision behavior where applicable.
- Missing required identifiers should block or route rows to review.
- Duplicate identifiers in the same file should be detected before apply.
- Identifier conflicts against existing source records should block or route to review.

## Header Validation

CSV/file imports should validate headers before row-level validation.

Header validation should check:

- Required headers are present.
- Header names match the source-module contract.
- Header order matches where exact-order files are required.
- Extra headers are either allowed by the contract or rejected.
- Duplicate headers fail validation.
- Deprecated headers produce warning or error according to source-module version rules.
- Header contract version is captured where available.

Header failures should prevent unsafe apply. Source modules may allow preview of header errors for user correction.

## Locked Field Protection

Source modules must define locked fields, editable fields, and conditionally editable fields.

Locked field governance:

- Imports must not update locked fields.
- Locked field changes should appear in preview as blocked, ignored, or review-required.
- Locked fields should be tied to source-module field ownership.
- Cross-module-owned fields must not be overwritten by another module's import.
- Admin overrides require explicit authority, reason, audit evidence, and source-module support.

Examples:

- Product Catalog must not update Pricing-owned calculated prices.
- Pricing must not update Product Catalog product records.
- Media must not update Product Catalog or Device Catalog attachment authority.
- Fulfillment imports must not update Order Routing route decisions.
- Analytics exports must not update operational source records.

## Preview Table Requirement

Every user-facing import that can affect records should provide a preview before confirmation unless an approved integration contract explicitly allows automated processing.

Preview should show:

- Proposed operation: create, update, no change, skip, delete/clear, supersede, review-required.
- Matched source record reference.
- Required identifier status.
- Field-level before/after summary where safe.
- Blank field behavior.
- Locked field changes.
- Errors and warnings.
- Visibility/access impact where applicable.
- Destructive action impact where applicable.
- Row-level status and summary counts.

Preview must not itself mutate source records.

## Error Versus Warning Handling

Validation outcomes should distinguish errors from warnings.

Errors should block apply for the affected row, affected operation, or entire import according to source-module policy.

Warnings should allow continued processing only when the source module declares the warning non-blocking and the user/integration is allowed to proceed.

Common categories:

- Error: missing required identifier, invalid header, locked field change, ambiguous match, invalid date, invalid Product Type, unauthorized scope, stale required snapshot, invalid file format, destructive action without authority.
- Warning: deprecated field, optional metadata missing, non-critical formatting issue, non-blocking visibility impact, downstream notification not configured.
- Review-required: source conflict, stale evidence, cross-module authority ambiguity, policy override request, high-risk destructive change, unsupported mixed mode.

## Inline Correction

User-facing import workflows may allow inline correction before final confirmation.

Inline corrections should:

- Preserve original submitted value.
- Record corrected value.
- Capture correction actor, timestamp, reason, and audit reference.
- Re-run affected validation.
- Respect locked fields and permissions.
- Avoid applying AI suggestions without user/source-module approval.

Inline correction records should be visible in Logs & Audit as import evidence.

## Downloadable Error Reports

Import workflows should support downloadable error reports where files have row-level validation outcomes.

Error reports should include:

- Import job/batch reference.
- Source file reference or masked reference.
- Row number or row identity.
- Field path.
- Error/warning code.
- Severity.
- Message/remediation hint.
- Rejected value, redacted where needed.
- Correction status.
- Review-required state.

Error report exports must respect tenant scope, redaction, and Logs & Audit file tracking.

## Import Drafts

Imports may support a draft lifecycle so users can upload, validate, correct, and review before apply.

Draft import expectations:

- Drafts do not mutate source records.
- Drafts preserve validation state and preview state.
- Drafts should expire or require refresh after source records change.
- Drafts should capture source input version references where applicable.
- Drafts should be scoped by tenant, entity, user/service, and source module.

## Import Confirmation

Imports that mutate records require confirmation unless an approved integration contract explicitly defines automated apply.

Confirmation should capture:

- Confirming actor or service identity.
- Confirmation timestamp.
- Source module.
- Import mode.
- Preview version or validation version confirmed.
- Destructive action acknowledgement where applicable.
- Override or waiver evidence where applicable.
- Audit reference.

If source records changed after preview, confirmation should block or require revalidation according to source-module policy.

## Non-Destructive Default Behavior

Imports should be non-destructive by default.

Default behavior should avoid:

- Deleting records.
- Clearing values.
- Overwriting locked fields.
- Replacing canonical identifiers.
- Changing visibility/access state.
- Changing pricing outcomes.
- Changing fulfillment/return/invoice operational state without source-module validation.

Any destructive behavior must be explicit, previewed, permissioned, confirmed, and auditable.

## Destructive Action Controls

Destructive actions include delete, clear, deactivate, revoke, hide, replace, supersede, detach, cancel, overwrite, or bulk status change where source-module records or access are affected.

Controls should include:

- Explicit destructive mode.
- Elevated permission from Tenant Company.
- Source-module support for the action.
- Preview of affected records and fields.
- Impact summary.
- Confirmation text or equivalent acknowledgement.
- Reason code and optional comment.
- Audit evidence.
- Reversal/supersession guidance where available.
- Review-required routing for high-risk actions.

## Compatibility Import Governance

Compatibility imports are source-module governed.

Product Catalog owns accessory compatibility assertions that reference Device Catalog-owned Device References unless a future Compatibility Authority is assigned.

Compatibility imports should:

- Require Product Catalog product/variant references and Device Catalog Device References or approved compatible-device references.
- Validate Device Reference existence, lifecycle/visibility compatibility, and scope where available.
- Preserve mapping source, confidence, effective dates, and version.
- Block ambiguous Device References.
- Route stale, superseded, missing, or conflicting Device References to review.
- Not mutate Device Catalog canonical device records.

## Pricing Import Governance

Pricing imports are governed by Pricing when they affect price calculation, pricing profiles, pricing rules, exceptions, overrides, effective prices, or snapshots.

Pricing imports should:

- Require Pricing-owned identifiers and scope references.
- Preserve rule/profile/snapshot versioning.
- Validate effective dates, scope, source input versions, currency, and conflict behavior.
- Block stale, superseded, expired, unauthorized, or conflicting pricing evidence.
- Never silently recalculate downstream invoices or orders without source-module workflow support.

Product Catalog may import catalog-carried pricing inputs as product facts, but Pricing owns commercial interpretation and calculated outcomes.

## Buyer-Specific Pricing Override Governance

Buyer-specific pricing overrides should be owned by Pricing and scoped with Tenant Company evidence.

Required governance:

- Buyer parent or child/entity scope reference.
- Tenant Company scope/eligibility evidence.
- Pricing override id/version.
- Effective date range.
- Approval status.
- Supersession/expiration behavior.
- Conflict handling against parent/child overrides, product, vendor, region, channel, and Product Type scope.
- Preview of affected buyer/entity pricing outcomes where allowed.

Imports must not infer buyer eligibility or permission authority independently.

## Buyer Access Assignment Governance

Buyer access assignment imports must consume Tenant Company authority and source-module visibility rules.

Buyer access assignments may affect catalog visibility, device portfolio visibility, product activation/download access, media download access, invoice report access, analytics report access, or notification recipient scope.

Governance:

- Tenant Company owns buyer/entity/user/role/relationship eligibility.
- Source modules own whether their records become visible, active, downloadable, exportable, or reportable.
- Preview must show visibility/access impact.
- Cross-tenant assignment is denied by default.
- Missing or stale eligibility evidence blocks or routes to review.

## Visibility Impact Preview

Imports that may affect visibility, access, activation, publication, downloadability, exportability, routability, launch readiness, or reporting visibility should include a visibility impact preview.

Preview should identify:

- Affected tenant/company/entity/buyer/vendor/manufacturer scope.
- Source-module visibility record or evidence.
- Current state and proposed state.
- Downstream surfaces affected.
- Potential notification/export impact.
- Missing or stale eligibility evidence.
- Review-required conditions.

Visibility preview does not grant access by itself.

## Image / Media Import Governance

Media imports are governed by Media / Image Asset Management.

Media import workflows include manual image upload, ZIP upload, CSV/API image references, and future media provider imports.

Governance:

- Media Asset ID is the durable reference.
- Storage paths and URLs are implementation/delivery references, not source-of-truth identifiers.
- ZIP imports should create processing jobs and extracted file records.
- File-level validation, mapping, transformation, duplicate detection, accepted/rejected/skipped counts, and review state should be tracked.
- Media may produce mapping evidence but Product Catalog and Device Catalog own attachment acceptance.
- URL generation and downloads must respect access policy and tenant scope.
- Failed transformations or uncertain transparent-background generation should route to review.

## Order Fulfillment Import Governance

Fulfillment/Returns owns fulfillment operational imports that affect shipment, tracking, delivery, return, receipt, replacement, or exception state.

Governance:

- Imports must reference routed suborder, fulfillment handoff, shipment, return, or replacement evidence as required by Fulfillment/Returns.
- Imports must not select routes or mutate Order Routing decisions.
- Tracking/status imports must include source, source timestamp, received timestamp, source event version, idempotency key, and audit reference where available.
- Stale, duplicate, out-of-order, or conflicting status updates should append evidence and route to review or be ignored according to source authority rules.
- Delivery imports must not create invoice state directly; Invoice Management consumes delivered evidence later.

## Tracking URL Governance

Tracking URLs and carrier/provider references are operational delivery references.

Governance:

- Tracking URLs should be validated for format and source authority.
- Tracking URLs should not be treated as source-of-truth shipment state.
- Tracking URL changes should preserve prior references and audit evidence.
- Suspicious, malformed, unsafe, or cross-tenant tracking URLs should block or route to review.
- Provider callbacks should be handled through Integration Management receipt evidence where applicable.

## Return Processing Import Governance

Return processing imports are governed by Fulfillment/Returns for operational return state.

Governance:

- Return imports should reference return request intake, authorization reference, return shipment, return receipt, condition placeholder, or replacement chain as applicable.
- Return imports must not decide refund, credit, invoice adjustment, payment, or warranty claim approval.
- Return Refunded and adjustment evidence consumed by Invoice Management must remain references unless future ADR assigns refund execution ownership.
- Partial returns, quantity mismatch, missing authorization, stale authorization, and conflicting condition/status should route to review.

## Export Governance

Exports must respect source-module ownership, Tenant Company permissions, redaction, and visibility rules.

Export governance:

- Source modules define export schema and eligible fields for their records.
- Tenant Company defines who may export and view exported data.
- Logs & Audit tracks export files, actor/service, row counts, file references, redaction class, and audit evidence.
- Integration Management tracks external delivery evidence where exports are transmitted externally.
- Notification Platform Service tracks scheduled email delivery where exports are emailed.
- Analytics owns report exports and reporting read-model exports only.
- Exports must not bypass source-module visibility rules or redaction.
- Export files should have schema version, generated by, generated at, source version/reference, retention class, and expiration/revocation behavior where applicable.

## Scheduled Email Export Governance

Scheduled email exports involve the export-owning source module or Analytics, Tenant Company permissions, Notification delivery, and Logs & Audit evidence.

Governance:

- Schedule creation requires Tenant Company permission.
- Source module or Analytics owns export content and eligibility.
- Notification Platform Service owns recipient delivery status and notification history.
- Logs & Audit tracks export generation and delivery audit references.
- Schedules should capture frequency, timezone, recipient scope, export schema version, redaction class, and expiration/review state.
- Failed generation and failed delivery should be tracked separately.
- Scheduled exports must not send data to recipients who lost access before delivery.

## CSV-Only Vendor Order Exports

Where vendor order exports are CSV-only, the owning source module and Integration Management should preserve clear boundaries.

Governance:

- Order Routing owns routed suborder/order routing evidence.
- Fulfillment/Returns owns fulfillment handoff and execution evidence.
- Integration Management owns external delivery/receipt evidence where transmitted.
- Logs & Audit owns file tracking and audit evidence.
- CSV-only export contracts should define exact headers, required identifiers, row counts, source records, redaction class, delivery method, and retry/reupload behavior.
- Manual downloads/uploads should be auditable and should not bypass source-module state controls.

## UPC / Text Identifier Preservation

CSV import/export must preserve text identifiers exactly where they are identifiers rather than numbers.

Rules:

- UPC, GTIN, SKU, external IDs, order numbers, invoice numbers, tracking numbers, zip/postal codes, device identifiers, and similar identifiers should be treated as text.
- Leading zeros must be preserved.
- Scientific notation conversion must be prevented.
- Whitespace normalization should be explicit and source-module governed.
- Display formatting should not change canonical identifier values without validation.
- Exports should include text-safe formatting guidance where needed.

A future `csv-format-and-identifier-preservation.md` standard should define detailed CSV encoding, quoting, delimiter, escaping, newline, BOM, and spreadsheet-safety rules.

## Date / Time And Timezone Governance

Imports and exports must preserve enough timestamp evidence for audit, display, filtering, and downstream reconciliation.

Governance:

- Capture source timestamp where provided.
- Capture received timestamp for imports and callbacks.
- Capture generated timestamp for exports.
- Capture timezone or timezone basis where available.
- Capture date-basis field where reports/imports can filter by order date, delivery date, refund date, invoice period, launch date, release date, generated date, or another basis.
- Do not silently mix date bases in one report/import without recording the basis.
- Invalid dates should error.
- Ambiguous dates should block or route to review.
- Module-specific timezone rules, such as Invoice Management using EST/ET, remain module-owned unless a future shared standard supersedes them.

A future `date-time-and-timezone-governance.md` standard should define platform-wide parsing, storage, display, daylight saving, timezone, and date-basis behavior.

## Audit Logging

All import/export workflows should produce audit evidence appropriate to their risk and sensitivity.

Audit evidence should include:

- Source module.
- Import/export job id.
- Actor/user/service.
- Tenant/company/entity scope.
- File reference or masked payload reference.
- File name/type/direction.
- Row counts, accepted counts, failed counts, skipped counts, warning counts.
- Validation status and processing status.
- Error summary.
- Preview version.
- Confirmation reference.
- Apply result.
- Correction/reupload/supersession references.
- Destructive action evidence where applicable.
- Retention class, redaction class, and access class where applicable.

Logs & Audit owns the immutable audit/file evidence. Source modules own source-record mutations and change history.

## Integration Failure Tracking

When imports or exports depend on external systems, Integration Management should track transport and provider evidence.

Track:

- Integration id.
- External system reference.
- Direction: inbound, outbound, bidirectional.
- Delivery/receipt status.
- Provider response reference.
- Retry count and retry exhaustion.
- Circuit-breaker or degraded state.
- Dead-letter/quarantine state where applicable.
- External ID mapping status.
- Source-module disposition.

Provider failure does not automatically imply source-module business failure unless the source module accepts that disposition.

## AI-Ready Import / Export Events

Import/export workflows should emit AI-ready signals without giving AI mutation authority.

Proposal-level events/signals:

- import.validation.failed.
- import.warning.detected.
- import.correction.suggested.
- import.review.required.
- import.duplicate.detected.
- import.mapping.conflict.detected.
- import.blank-field.blocked.
- import.locked-field.blocked.
- import.destructive-action.requested.
- export.generated.
- export.failed.
- export.delivery.failed.
- export.access-risk.detected.

AI agents may recommend corrections, summarize failures, detect patterns, or flag risky imports/exports. AI must not apply corrections, confirm imports, perform destructive actions, or bypass permissions without approved action contracts and source-module authority.

## User-Facing Import Summary

After validation and after apply, user-facing workflows should provide a clear summary.

Summary should include:

- Import mode.
- Source file name/reference.
- Total rows.
- Created rows.
- Updated rows.
- Unchanged rows.
- Skipped rows.
- Failed rows.
- Warning count.
- Review-required count.
- Destructive changes requested/applied.
- Visibility/access impact summary.
- Downloadable error report link/reference where available.
- Audit/reference id.

Summaries should use safe, redacted fields and should not expose unauthorized tenant data.

## System Admin Oversight

System Admin oversight should be available for high-risk or platform-wide imports/exports.

Oversight scenarios:

- Destructive bulk actions.
- Cross-tenant or platform-wide changes.
- Locked field override requests.
- Pricing override imports.
- Buyer access assignment imports.
- Device canonical record changes.
- Product visibility or activation bulk changes.
- Fulfillment/return conflict resolution imports.
- Integration retry exhaustion or repeated file failures.
- Sensitive export access or repeated downloads.

System Admin authority still depends on Tenant Company permissions and source-module rules.

## Standard Import Statuses

Proposal-level import statuses:

- Draft.
- Uploaded.
- Header Validation Failed.
- Validating.
- Validation Failed.
- Validation Completed.
- Preview Ready.
- Correction Required.
- Review Required.
- Awaiting Confirmation.
- Confirmed.
- Processing.
- Partially Completed.
- Completed.
- Completed With Warnings.
- Failed.
- Cancelled.
- Superseded.
- Expired.

Source modules may add domain-specific substates but should map them to the standard vocabulary for platform reporting, audit, and user-facing summaries.

## Standard Export Statuses

Proposal-level export statuses:

- Draft.
- Requested.
- Validating Access.
- Access Denied.
- Queued.
- Generating.
- Generated.
- Partially Generated.
- Delivery Pending.
- Delivered.
- Delivery Failed.
- Downloaded.
- Expired.
- Revoked.
- Superseded.
- Failed.
- Cancelled.

Source modules may add domain-specific substates but should map them to the standard vocabulary for platform reporting, audit, delivery, and user-facing summaries.

## Module-Specific Governance Notes

### Product Catalog

Use this standard for accessory imports, product updates, compatibility imports, product exports/downloads, buyer activation/download imports, catalog visibility imports, and catalog-carried pricing input imports. Product Catalog owns product records and catalog assertions.

### Device Catalog

Use this standard for device imports, Phase 1 System Admin-only CSV import, device updates, buyer-visible/exportable device data, Device Reference preservation, and device export/download. Device Catalog owns canonical device records.

### Pricing

Use this standard for pricing profile/rule/exception/override imports, buyer-specific pricing overrides, effective-date validation, snapshot bindability checks, and pricing export where allowed. Pricing owns commercial interpretation and calculation.

### Media / Image Asset Management

Use this standard for manual image upload, ZIP processing, CSV/API image references, validation, mapping evidence, transformation, downloadable assets, and URL/export references. Media owns asset processing and delivery references, not product/device attachment authority.

### Order Routing

Use this standard for any future import/export of routing policies, routing exceptions, vendor order exports, or routed suborder references. Order Routing owns routing decisions and snapshots.

### Fulfillment / Returns

Use this standard for shipping imports, tracking imports, return outcome imports, return receipt imports, replacement execution references, and vendor operational file flows. Fulfillment/Returns owns operational execution state.

### Invoice Management

Use this standard for invoice CSV exports, downloadable invoice archives, reconciliation file uploads, adjustment reference imports, and accounting sync export placeholders. Invoice Management owns invoice records and reports.

### Logs & Audit File Tracking

Use this standard to align audit/file evidence fields. Logs & Audit owns immutable import/export evidence, not source-record mutation.

### Integration Management

Use this standard to align transport evidence, external ID references, provider failures, retries, webhook/API/CSV/SFTP/manual exchange, and source-module disposition handoffs. Integration owns connection state and delivery/receipt evidence.

### Notification Platform Service

Use this standard for scheduled email export delivery and delivery failure tracking. Notification owns delivery history, not export source content.

### Analytics / Reporting

Use this standard for report exports, scheduled reports, reporting read-model export lifecycle, redaction, visibility evidence, and sensitive export access. Analytics owns report exports only.

### Procurement / Purchase Orders

Use this standard for PO document exports, vendor/manufacturer response imports, CSV/manual exchange placeholders, external PO references, and review workflows. Procurement owns PO lifecycle.

### Launch / Event Management

Use this standard for launch calendar exports, readiness evidence imports, external task reference imports, and launch reporting signals. Launch owns coordination state, not source readiness facts.

### Warranty Registration / Claims

Use this standard for warranty registration transmissions, warranty claim import/export placeholders, vendor warranty response imports, and warranty evidence exports. Warranty support owns only the workflow scope assigned by ADR/module docs.

## Recommended Related Future Standards

Create separate standards for detailed shared conventions:

- `architecture/standards/csv-format-and-identifier-preservation.md`.
- `architecture/standards/date-time-and-timezone-governance.md`.
- `architecture/standards/import-export-status-vocabulary.md`.

These standards should refine, not replace, the ownership boundaries in this governance document.

## Future Alignment Note

Modules should reference this standard for shared import/export/validation expectations instead of copying this full content into each module. Module docs should keep domain-specific rules close to the owning bounded context and point back here for platform-wide behavior.

This standard does not create a new bounded context, does not replace source-module validation, and does not finalize implementation details.