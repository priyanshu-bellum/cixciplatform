# Phase 1 Device CSV Import Rules

This document captures proposal-level architecture rules for the Device Import Page - Phase 1 source update. It does not finalize future manufacturer, distributor, or API ingestion, public image URLs, compatibility authority, buyer workflow UX, Product Catalog behavior, Pricing behavior, Order Routing behavior, Fulfillment behavior, or Procurement behavior.

## Phase 1 Access Model

- Phase 1 device CSV import is System Admin-only.
- Manufacturers, vendors, buyers, and external integrations do not receive self-service device import access in Phase 1.
- Device Catalog records the admin actor, import mode, file metadata, validation results, correction history, and audit trail for every import attempt.
- Placeholder: define whether a future phase introduces manufacturer, distributor, or API ingestion and what source authority, approval, validation, and audit workflow would be required before enabling it.

## Import Modes

### Import New Devices

- Creates new Device Master Records only when the row does not match an existing canonical device by the Phase 1 uniqueness rule.
- Rows that match an existing device should be rejected or routed to correction with a duplicate/matching error.
- Placeholder: define whether duplicate rows inside the same CSV are rejected as row errors or block the entire batch.

### Update Existing Devices

- Updates existing Device Master Records only when the row matches an existing canonical device by the Phase 1 uniqueness rule.
- Rows that do not match an existing device should be rejected or routed to correction with a not-found error.
- Placeholder: define which fields can be updated in Phase 1 and which require a separate admin review flow.

## CSV Field Template

The Phase 1 CSV template requires these headers in this exact order:

1. `Manufacturer`
2. `Device Model`
3. `Device Type`
4. `Launch Date`
5. `Storage Variants`
6. `Connectivity`
7. `Charger Type`
8. `Feature Group`
9. `Compatibility Markers`

## Strict Header Validation

- Headers must exactly match the expected field names.
- Headers must appear in the exact order defined by the template.
- Missing fields should fail header validation.
- Extra fields should fail header validation.
- Duplicate fields should fail header validation.
- Header validation should run before row-level validation.
- Placeholder: define whether leading/trailing whitespace is normalized before exact comparison or treated as invalid.

## Row-Level Validation

- Required fields must be populated according to Phase 1 validation rules.
- `Manufacturer` must match a recognized manufacturer record or controlled manufacturer list.
- `Device Type` must match controlled values. Placeholder: confirm allowed values such as phone, tablet, smartwatch, or other device categories.
- `Launch Date` must be a valid date in the confirmed platform date format.
- `Storage Variants`, `Connectivity`, `Charger Type`, `Feature Group`, and `Compatibility Markers` must be populated sufficiently to prepare future compatibility-driven accessory workflows.
- Import New Devices rows must not match an existing device by Phase 1 uniqueness rules.
- Update Existing Devices rows must match exactly one existing device by Phase 1 uniqueness rules.
- Ambiguous, duplicate, missing, or conflicting matches should fail validation or route to correction before canonical records are changed.

## Device Uniqueness

- Phase 1 uniqueness is based on `Manufacturer` + `Device Model` + `Device Type`.
- Matching is case-insensitive.
- Placeholder: define whitespace, punctuation, accent, abbreviation, and synonym normalization before matching.
- Placeholder: define whether manufacturer aliases are resolved before uniqueness checks or rejected until normalized.
- This Phase 1 uniqueness rule is narrower than the future canonical identity model and should not finalize long-term Device Reference granularity.

## Device Status And Buyer Visibility

- Phase 1 imported devices receive system status `Active` after successful import.
- Buyer Visibility Status is separate from system status and should support `Hidden` and `Visible`.
- Future Launch Date devices should remain `Hidden` by default.
- Buyers should not see future devices unless a System Admin explicitly marks them `Visible`.
- `Active` system status must not imply buyer visibility.
- Placeholder: define whether non-future imported devices default to `Hidden` or follow an admin-selected visibility setting.

## Device Image Dependency

- Device image upload, processing, validation, storage, matching, renditions, and media audit are owned by Media Management.
- Phase 1 CSV import should not require or create public image URL fields.
- Device Catalog owns the Device Image Readiness Reference used for visibility gating, but must not absorb Media Management ownership.
- A device should not appear on All Devices or My Devices until an image has been uploaded and buyer visibility has been enabled.
- Placeholder: define the Device Image Readiness Reference shape and how Device Catalog consumes Media Management evidence.

## Import Job And Correction Model

- Device Import Job should track mode, actor, file name or file reference, submitted timestamp, validation status, row counts, accepted rows, rejected rows, correction-required rows, created records, updated records, and audit reference.
- Header validation failure should prevent row processing.
- Row-level validation failures should identify row number, field name, rejected value, error code, and correction guidance.
- Correction workflow should preserve original submitted values, corrected values, correcting actor, correction timestamp, and reason.
- Placeholder: define whether partial success is allowed in Phase 1 or whether any row error blocks the entire import.
- Placeholder: define retry, re-upload, and superseded import behavior.

## Logs And Audit Requirements

- Audit every import attempt, validation failure, correction, create, update, visibility change, and image-readiness dependency state change.
- Logs should identify System Admin actor, import mode, row counts, validation outcomes, affected Device References, and source file reference.
- Sensitive operational logs should not expose buyer-specific visibility state beyond authorized scopes.
- Import audit should be retained long enough to reconstruct why a device appeared, remained hidden, or was excluded from downstream views.

## Downstream Dependencies

### All Devices

- All Devices should consume only devices that satisfy buyer visibility and image readiness requirements.
- Device Catalog provides visibility/readiness references, while buyer-facing modules own screen behavior, layout, filters, empty states, display behavior, and other UX/state.

### My Devices

- My Devices should consume buyer-visible devices or Buyer Device Portfolio References only for authorized tenant scope.
- Device Catalog owns the Buyer Device Portfolio Reference; buyer-facing modules own the My Devices screen behavior, layout, filters, empty states, display behavior, and workflow UX/state.
- Device Catalog should not leak one buyer's visibility or portfolio state to another buyer.

### Future Compatibility-Driven Accessory Workflows

- Compatibility Markers and related preparation fields should support future Product Catalog compatibility workflows.
- Product Catalog may consume My Devices / Buyer Device Portfolio References for compatibility filtering but must not own or mutate the buyer device portfolio.
- Device Catalog should not decide accessory compatibility in Phase 1; Product Catalog or a future Compatibility Authority owns compatibility assertions.
- Device import events should give downstream modules enough reference/change context to prepare compatibility workflows without moving accessory logic into Device Catalog.

## Open Questions

- What exact controlled `Device Type` values are approved for Phase 1?
- Which fields are required versus conditionally required for each device type?
- What date format is canonical for `Launch Date`?
- Is Phase 1 import all-or-nothing, partial success, or correction-before-commit?
- What Device Image Readiness Reference shape should Device Catalog record from Media Management-owned image evidence?
- What default Buyer Visibility Status applies to non-future imported devices?
- How should `Compatibility Markers` be structured before a future compatibility authority is finalized?

## Feature-Group-Related Field Mapping (PR-B)

PR-B introduces the CSV-side mapping rules for feature-related fields. These rules govern how Phase 1 CSV import columns map to Compatibility Markers, Suggested Normalizations, and (ultimately, after approval) Device Feature Assignments. This section layers on top of the existing Phase 1 CSV import contract; it does not redefine the contract.

Platform-standard concerns - header validation, identifier governance, locked field protection, error / warning / review-required classification, inline correction, downloadable error reports, UPC / text identifier preservation, date / time / timezone governance, audit-ready import evidence - are delegated to `architecture/standards/import-export-validation-governance.md`. PR-B does not modify the platform standard. Device Catalog-specific layering is added here only where it adds rules the platform standard does not already cover.

### Column categories

Phase 1 CSV import columns are grouped into three categories for Feature-Group-related handling:

1. **Direct Feature Group columns** - a column that corresponds 1:1 to a known Feature Group (e.g., a `Connectivity` column corresponds to the `connectivity` Feature Group). The column's cell value is captured as a Compatibility Marker with `intended_feature_group_hint` set to the corresponding Feature Group reference.

2. **Compatibility Markers column** - a generic column that may contain arbitrary feature-related content (e.g., a `Compatibility Markers` or `Notes` column where System Admin captures device-specific feature hints that don't correspond to a single Feature Group). Cells in this column are captured as Compatibility Markers with `intended_feature_group_hint` null; normalization workflow (per `workflows.md` Workflow 2) determines the Feature Group during review.

3. **Non-feature columns** - columns that do not produce Compatibility Markers (e.g., Device identifier columns, Device Type column, Device Image columns). These columns participate in row validation but do not feed the Feature Evidence workflow.

The exact Master Device Import Template column-to-category mapping is defined elsewhere in `phase-1-csv-import.md` (the template version) and is referenced by - not redefined in - this section.

### Direct Feature Group column handling

For a Direct Feature Group column (e.g., `Connectivity`):

- The column header must match the Master Device Import Template header for that Feature Group. Header mismatch is caught by platform-standard header validation.
- The cell value is captured as a single Compatibility Marker with:
  - `source_field_reference` = the column name.
  - `raw_value` = the cell content, with platform-standard text preservation per `import-export-validation-governance.md`.
  - `intended_feature_group_hint` = the Feature Group reference corresponding to the column.
  - `target_device_reference` = the row's Device.
- For Feature Groups whose `value_structure_kind` is `enumerated_multi`, a single cell may carry multiple values separated per the Master Device Import Template's separator convention (controlled value, distinct from CSV row/column separators). Each value-segment becomes a candidate for a single Suggested Normalization referencing multiple Feature Value references.
- For Feature Groups whose `value_structure_kind` is `enumerated`, multi-value cells are flagged for review and may produce multiple competing Suggested Normalizations, with the System Admin approving at most one per `workflows.md` Workflow 2.

### Compatibility Markers column handling

For the generic Compatibility Markers column:

- The column header must match the Master Device Import Template header for the generic marker column. Header mismatch is caught by platform-standard header validation.
- The cell value is captured as one or more Compatibility Markers with `intended_feature_group_hint` null. The exact rule for how a single cell is split into multiple markers (separator convention, max marker count, escape rules) follows the Master Device Import Template and the platform standard's multi-value field rules.
- Normalization workflow must determine the Feature Group for each captured marker (per `workflows.md` Workflow 2). The marker may or may not map to any Feature Group; unmappable markers route to Data Quality Exception per Workflow 1 step 8.

### Pre-commit validation specific to Feature-Group-related fields

Beyond platform-standard validation, Device Catalog Phase 1 CSV import runs these row-level checks at preview / pre-commit:

- **Compatibility Marker capture validity.** Cells in Feature-Group-related columns produce Compatibility Markers only when the cell is non-blank. Blank cells do not produce markers (per platform-standard blank-field-no-overwrite for the target Device Feature Assignment, if any).

- **Device Capability Profile applicability check (when Profile content exists).** For Direct Feature Group columns where the row's Device Type has a populated Device Capability Profile, the column's Feature Group is checked against the Profile's applicability:
  - `required` or `optional` - column content captured normally.
  - `unsupported` - content captured, but Suggested Normalization approval will require Override Discipline per `permissions.md`. Preview flags this row.
  - `review_required` - content captured, but commit produces a Data Quality Exception alongside the assignment for tracking.
  - Profile content not yet populated for this Device Type (PR-A OQ 1 deferral) - no applicability gating; content captured normally.

- **Retired / deprecated Feature Value reference detection.** If a cell's value can be matched at preview time to a retired or deprecated Feature Value, the row is flagged:
  - Retired value reference -> blocks normalization approval without override (PR-B Override Discipline retired Feature Value override).
  - Deprecated value reference -> produces a warning; approval permitted; commit may produce a Data Quality Exception per source-rule.

- **Required Feature Group missing.** For Devices whose Device Capability Profile lists a Feature Group as `required`, if no Compatibility Marker is captured for that Feature Group from the row's data, the row is flagged. On commit, a Data Quality Exception of category `missing_required_feature_data` is created.

- **Conflicting Feature Values.** If multiple cells in the same row produce markers for the same Feature Group with values that map to different Feature Values (after suggestion), the row is flagged. On commit, a Data Quality Exception of category `conflicting_feature_values` is created unless the System Admin resolves the conflict by approving exactly one Suggested Normalization for the affected Feature Group during preview.

### Locked field protection for Feature-Group-related columns

Platform-standard locked field protection applies. Specifically:

- **Pricing-owned fields** are not present in Device Catalog CSV columns; Device Catalog imports do not carry pricing. If a Pricing-owned column header appears in a Device Catalog import file, header validation rejects it.

- **Media-owned attachment authority** is not in scope for Feature-Group-related columns. Device Catalog image fields (per `data-model.md` and `boundary-contracts.md`) reference Media Management; Feature-Group-related fields are independent.

- **Feature taxonomy fields** (Feature Group key, Feature Value key, Device Capability Profile content) are not importable through Device Catalog CSV. Taxonomy administration is a separate Feature Taxonomy Authority workflow per `workflows.md` Workflow 3 and `permissions.md`. Attempts to set a `feature_group_key` or `feature_value_key` via CSV are rejected by row validation.

### Header version and deprecation

Per platform standard, header version tracking and deprecation routing apply to Device Catalog imports. PR-B does not introduce header deprecations; it inherits the platform-standard behavior. Future deprecation of Feature-Group-related column names (when Feature Group names evolve, when Master Device Import Template revisions remove columns) follows the platform standard's deprecation warning-then-error pattern.

### Discipline

- CSV fields are not the final feature schema. The CSV is a transitional ingestion shape; the authoritative feature shape is defined by Feature Group, Feature Value, Device Capability Profile, and Device Feature Assignment per `data-model.md` (PR-A).
- Raw cell values become Compatibility Markers (ingestion artifacts), not Device Feature Assignments (feature truth). Promotion from marker to assignment requires Suggested Normalization approval per `workflows.md` Workflow 2.
- Unknown values do not auto-create Feature Values. Feature Value creation requires explicit Feature Taxonomy Authority action per `workflows.md` Workflow 3 and `permissions.md`.
- Manufacturer / distributor / API ingestion is not enabled in Phase 1. The `assignment_source` values `manufacturer_api` and `distributor_api` are reserved per `data-model.md` (PR-A) but not produced by Phase 1 imports.
