# Device Catalog Data Model

## Entities

- Device Master Record
- Device Reference
- Manufacturer
- Brand
- Device Model
- Device Variant
- Device Identifier
- Device Alias
- Device Taxonomy Node
- Device Lifecycle State
- Device Source Record
- Device Import Batch
- Phase 1 Device CSV Import Job
- Phase 1 Device CSV Import Row
- Phase 1 Device CSV Validation Error
- Device Import Correction Record
- Buyer Visibility Status
- Device Image Readiness Reference
- Device Export Record
- Buyer Device Portfolio Reference
- Device Change Record
- Future Purchase Order Device Reference Placeholder

## Feature Evidence Foundation Entities (PR-A)

PR-A introduced architecture-level entity definitions for the Device Catalog Feature Evidence Foundation. These entities are proposal-level and are defined at the architecture surface. Implementation locus (database constraints, ORM models, validators, indexes, query patterns) is left to the developer per the project's operating model.

The entities defined below are:

- **Feature Group** - a controlled category of device feature truth (e.g., "Connectivity", "Charger Type", "Storage Variant"). Owned by Device Catalog. Lifecycle-managed taxonomy entity.
- **Feature Value** - a controlled value within a Feature Group (e.g., "USB-C", "MagSafe", "Bluetooth 5.3"). Owned by Device Catalog. Lifecycle-managed taxonomy entity.
- **Device Capability Profile** - by Device Type, the set of required, optional, unsupported, and review-required Feature Groups. Owned by Device Catalog. Mirrors the Product Type Capability Profile pattern from Product Catalog PR #77.
- **Device Feature Assignment** - the assertion that a specific Device has a specific Feature Value within a specific Feature Group. Owned by Device Catalog. The authoritative record of "this device has this feature."
- **Device Capability Evidence** - the consolidated view of feature evidence for a device, used by consuming modules (notably Product Catalog) to make compatibility decisions. Owned by Device Catalog.

Two additional concepts were declared at the architecture level in PR-A and then expanded by the PR-B import/review workflow layer:

- **Compatibility Marker** - a transitional Phase 1 CSV ingestion artifact. Not final feature truth. Not authoritative compatibility evidence. Normalized into controlled feature evidence where possible; routes to Data Quality Exception where it cannot. Concept declared in PR-A; full entity shape and normalization workflow defined in PR-B.
- **Data Quality Exception** - an architecture-level category for evidence records that capture missing, stale, conflicting, incomplete, or unmappable feature data requiring human resolution. Concept declared in PR-A; full lifecycle, resolver authority, and resolution workflow defined in PR-B.

Validation behavior (e.g., "unknown Feature Group rejected"), API contracts (e.g., feature evidence lookup), event names, and workflow definitions (e.g., Phase 1 CSV import normalization) are covered by the later Device Catalog hardening layers and do not appear in the foundation entity definitions themselves.

Phase 1 reaffirmation: CIXCI System Admin CSV import is the only authoritative ingestion source. Manufacturer / distributor / API ingestion remains future-facing only.

---

### Feature Group

**Owning module:** Device Catalog.

**Purpose:** A controlled category of device feature truth. Feature Groups define *what kind of feature* the platform tracks for devices (e.g., "Connectivity", "Charger Type", "Storage Variant", "Network Band", "Form Factor"). The set of Feature Groups in active use defines the device-feature surface area available to Product Catalog for compatibility filtering.

**Identity:**

- `feature_group_id` - canonical platform-assigned identifier. Stable. Not editable by import or by System Admin actions after creation.
- `feature_group_key` - short, stable, human-readable key suitable for cross-module reference (e.g., `connectivity`, `charger_type`). Lowercase snake_case. Created at Feature Group creation; not editable after creation. The exact key syntax rules (allowed characters, length bounds, reserved words) are an open question (PR-A OQ 5).
- `display_label` - human-readable display label for taxonomy administration and (optionally) downstream display. Editable by Feature Taxonomy Authority. Localization is owned by downstream display modules, not by Device Catalog.

**Controlled value structure (declared in PR-A, detailed enumeration is deferred):**

- `value_structure_kind` - one of the proposal-level kinds below. The exact structural enumeration is intentionally lightweight at PR-A and may be refined in PR-B once normalization workflows are defined.
  - `enumerated` - values constrained to a controlled set of Feature Values (the default kind; e.g., Charger Type -> USB-C, Lightning, MagSafe, ...).
  - `enumerated_multi` - values are a set of controlled Feature Values (e.g., Connectivity -> {Bluetooth 5.3, NFC, USB-C}).
  - `range_bounded` - values are scalar within a bounded numeric range (reserved for future Feature Groups like Battery Capacity; not used by Phase 1 CSV import in PR-A).
  - `freeform_constrained` - values are text but constrained by a controlled validation pattern (reserved for future use; not used by Phase 1 CSV import in PR-A).

**Lifecycle states (proposal-level):**

- `draft` - created by Feature Taxonomy Authority, not yet active. Not visible to consuming modules.
- `active` - in active use. Visible to consuming modules. New Feature Values may be created within it. Device Feature Assignments may reference it.
- `deprecated` - slated for removal. Existing Device Feature Assignments continue to be honored, but new assignments referencing the Feature Group should not be created. New Feature Values within a deprecated Feature Group are blocked.
- `retired` - terminal state. No new assignments, no new values, no edits. Existing assignments referencing a retired Feature Group are surfaced as Data Quality Exceptions for review per PR-B.

Lifecycle transitions (allowed and blocked) are an open question for PR-B workflow scope (PR-A OQ 6).

**Versioning and supersession:**

- `version` - monotonically increasing version number for the Feature Group definition. Incremented when any taxonomy-administered field changes (`display_label`, `value_structure_kind`, lifecycle state).
- `source_hash` - content hash of the Feature Group definition at this version. Computed at version transition. Used by consuming modules to detect drift and by audit to verify version integrity.
- `superseded_by` - optional reference to a successor Feature Group when the current Feature Group is retired in favor of a renamed or restructured replacement. The successor must exist and be in `draft` or `active` state at the time of supersession declaration. Supersession does not auto-migrate Device Feature Assignments; migration is an explicit workflow step.

**Audit reference:**

- `created_at`, `created_by` (CIXCI System Admin reference per PR-A permissions model).
- `updated_at`, `updated_by` (per change).
- `retired_at`, `retired_by` (terminal).
- All taxonomy-administered changes produce audit records per the platform standard.

**Relationships:**

- A Feature Group has zero or more Feature Values.
- A Feature Group is referenced by zero or more Device Feature Assignments.
- A Feature Group may be referenced by zero or more Device Capability Profile entries (as required, optional, unsupported, or review-required for a given Device Type).

---

### Feature Value

**Owning module:** Device Catalog.

**Purpose:** A controlled value within a Feature Group (e.g., within "Charger Type": "USB-C", "Lightning", "MagSafe"). Feature Values are the leaves of the controlled taxonomy. A Device Feature Assignment references one Feature Value (or, for `enumerated_multi` Feature Groups, a set of Feature Values).

**Identity:**

- `feature_value_id` - canonical platform-assigned identifier. Stable. Not editable after creation.
- `feature_value_key` - short, stable, human-readable key suitable for cross-module reference and CSV mapping (e.g., `usb_c`, `magsafe`, `bluetooth_5_3`). Lowercase snake_case. Unique within its parent Feature Group. Created at Feature Value creation; not editable after creation. The exact key syntax rules are an open question (PR-A OQ 5, shared with Feature Group).
- `display_label` - human-readable display label. Editable by Feature Taxonomy Authority.

**Parent reference:**

- `feature_group_id` (and/or `feature_group_key`) - the Feature Group to which this value belongs. Required at creation; not editable after creation. A Feature Value cannot move between Feature Groups; renames or restructurings require supersession.

**Lifecycle states (proposal-level, mirroring Feature Group):**

- `draft` - not yet in active use.
- `active` - in active use.
- `deprecated` - slated for removal. Existing Device Feature Assignments referencing this Feature Value continue to be honored. New assignments referencing this Feature Value should not be created.
- `retired` - terminal. Existing assignments referencing a retired Feature Value are surfaced as Data Quality Exceptions per PR-B.

A Feature Value's lifecycle is independent of its parent Feature Group's lifecycle except that a Feature Value cannot be `active` if its parent Feature Group is `retired` (block enforced when the parent retires; transition behavior is an open question for PR-B).

**Versioning and supersession:**

- `version` - monotonically increasing version number for the Feature Value definition.
- `source_hash` - content hash at this version.
- `superseded_by` - optional reference to a successor Feature Value (within the same Feature Group, or in a different Feature Group when the parent is being restructured). Migration is not automatic; it requires an explicit workflow step.

**Audit reference:** mirrors Feature Group (`created_at`, `created_by`, `updated_at`, `updated_by`, `deprecated_at`, `deprecated_by`, `retired_at`, `retired_by`).

**Relationships:**

- A Feature Value belongs to exactly one Feature Group.
- A Feature Value is referenced by zero or more Device Feature Assignments.

---

### Device Capability Profile

**Owning module:** Device Catalog.

**Purpose:** By Device Type, the set of required, optional, unsupported, and review-required Feature Groups. Mirrors the Product Type Capability Profile pattern from Product Catalog PR #77. Used by Device Catalog to validate Device Feature Assignment completeness and by consuming modules (notably Product Catalog) to reason about feature expectations for a given Device Type.

This entity is intentionally lightweight at the architecture level. It is not a rules engine. It declares applicability classes per (Device Type, Feature Group) pair. Behavioral interpretation (e.g., "block buyer export when required Feature Group missing") lives in the consuming module's validation rules, not in the Profile itself.

**Identity:**

- `device_capability_profile_id` - canonical platform-assigned identifier per Device Type. One Device Capability Profile per Device Type.
- `device_type_reference` - reference to the Device Type this Profile applies to. Required at creation; not editable after creation. (Device Type is presumed to exist in `modules/device-catalog/data-model.md`; if it does not, PR-A may need to introduce it lightly. See PR-A OQ 7.)
- `version` - monotonically increasing version number for the Profile definition. Incremented on any Profile entry change.

**Profile entries:**

Each entry pairs a Feature Group with one applicability class:

- `required` - devices of this Device Type must have a Device Feature Assignment for this Feature Group. Missing assignments produce Data Quality Exceptions per PR-B.
- `optional` - devices may have a Device Feature Assignment for this Feature Group but are not required to.
- `unsupported` - devices of this Device Type must not have a Device Feature Assignment for this Feature Group. Assignments produce validation errors per PR-B.
- `review_required` - assignments are permitted but route through review per PR-B. Used when the applicability is contextual or not yet decided.

The exact required / optional / unsupported / review-required mapping per (Device Type, Feature Group) is **content** - a product / business decision, not a spec decision. PR-A defines the shape; content lands separately. See PR-A OQ 1.

**Versioning and supersession:**

- `version` - incremented on entry change.
- `source_hash` - content hash at this version.
- `superseded_by` - reserved for cases where a Device Type is renamed or restructured and the Profile is being replaced wholesale.

**Audit reference:** mirrors Feature Group.

**Relationships:**

- A Device Capability Profile is associated with exactly one Device Type.
- A Device Capability Profile references zero or more Feature Groups, each with one applicability class.
- A Device Capability Profile is consumed by Device Catalog validation (PR-B) and by Product Catalog compatibility filtering (consumption only; Product Catalog does not edit Profiles).

---

### Device Feature Assignment

**Owning module:** Device Catalog.

**Purpose:** The assertion that a specific Device has a specific Feature Value within a specific Feature Group. This is the authoritative record of "this device has this feature." A device may have multiple Device Feature Assignments - one per Feature Group it has feature evidence for.

For `enumerated_multi` Feature Groups, a single Device Feature Assignment may reference multiple Feature Values (the assignment represents the set of values the device exhibits for that Feature Group).

**Identity:**

- `device_feature_assignment_id` - canonical platform-assigned identifier. Stable.
- `device_reference` - reference to the Device this assignment applies to. Required; not editable after creation. Assignments do not move between devices; corrections happen via update or delete-and-recreate per PR-B.

**Assignment content:**

- `feature_group_reference` - the Feature Group this assignment is within. Required.
- `feature_value_references` - one or more Feature Value references within the named Feature Group. Cardinality depends on the Feature Group's `value_structure_kind`:
  - `enumerated` - exactly one Feature Value reference.
  - `enumerated_multi` - one or more Feature Value references.
  - `range_bounded` / `freeform_constrained` - assignment shape remains future workflow scope (not used by Phase 1 CSV import).

**Provenance:**

- `assignment_source` - one of: `csv_import`, `system_admin_direct_edit`, `compatibility_marker_normalization`, `migration`. Reserved values for future use: `manufacturer_api`, `distributor_api`. Phase 1 uses only `csv_import`, `system_admin_direct_edit`, and `compatibility_marker_normalization`.
- `source_reference` - reference to the originating evidence (CSV import job ID, System Admin action ID, Compatibility Marker ID). Required for audit.
- `feature_group_version` - the version of the Feature Group definition at the time of assignment.
- `feature_value_version` - the version of the Feature Value definition at the time of assignment (per referenced value, when multi).

**Lifecycle states (proposal-level):**

- `active` - current authoritative assertion.
- `superseded` - replaced by a newer assignment for the same (Device, Feature Group) pair. Retained for audit; not surfaced as current evidence.
- `withdrawn` - explicitly removed via correction. Retained for audit; not surfaced as current evidence.

A Device may have at most one `active` Device Feature Assignment per (Device, Feature Group) pair. New assignments for the same pair transition the prior `active` assignment to `superseded`.

**Audit reference:** mirrors Feature Group.

**Relationships:**

- A Device Feature Assignment belongs to exactly one Device.
- A Device Feature Assignment references exactly one Feature Group.
- A Device Feature Assignment references one or more Feature Values (per `value_structure_kind`).
- A Device Feature Assignment may reference one Compatibility Marker (the ingestion artifact it was normalized from, when applicable).

---

### Device Capability Evidence

**Owning module:** Device Catalog.

**Purpose:** The consolidated, consumer-facing view of feature evidence for a device. Used by Product Catalog and other consuming modules to make compatibility decisions without traversing the underlying Device Feature Assignment records directly. Device Capability Evidence is *derived* from Device Feature Assignments; it is not independently editable.

Conceptually, Device Capability Evidence is the read model that answers: "for this device, what are the current authoritative feature values across all Feature Groups, with applicability per the Device Capability Profile, and with data quality status?"

**Identity:**

- `device_capability_evidence_id` - canonical platform-assigned identifier per Device. One Device Capability Evidence record per Device.
- `device_reference` - the Device. Required; not editable.

**Evidence content (derived, declared at architecture level):**

For each Feature Group referenced in the Device's Device Capability Profile, Device Capability Evidence carries:

- `feature_group_reference`
- `applicability` - the applicability class from the Device Capability Profile (required, optional, unsupported, review-required).
- `assignment_status` - one of: `assigned`, `missing`, `unsupported_but_assigned`, `review_required_assigned`, `superseded_value_referenced`, `retired_value_referenced`. Values beyond `assigned` and `missing` indicate data quality conditions; the enumeration and triggering rules are covered by the import/review workflow layer.
- `current_feature_value_references` - for `assigned` status, the current Feature Value reference(s); for other statuses, may be empty or contain the offending reference.
- `assignment_reference` - the underlying Device Feature Assignment ID(s), when applicable.
- `freshness_state` - one of: `current`, `stale`, `unknown`. Freshness rules (what makes evidence stale, how often it's revalidated) are an open question (PR-A OQ 3).

**Provenance:**

- `evidence_generated_at` - timestamp at which this evidence record was derived.
- `evidence_source_versions` - the versions of the Device Capability Profile, Feature Groups, and Feature Values that contributed to this evidence record. Used to detect when consuming modules are operating on stale evidence (per PR-B).

**Audit reference:** evidence records produce audit on creation and on each regeneration. Underlying Device Feature Assignment changes drive evidence regeneration; the regeneration trigger model is covered by the import/review workflow layer.

**Relationships:**

- A Device Capability Evidence record belongs to exactly one Device.
- A Device Capability Evidence record is derived from zero or more Device Feature Assignments and one Device Capability Profile.
- A Device Capability Evidence record is consumed by Product Catalog (read-only) and other downstream modules per PR-C.

---

### Compatibility Marker (concept-only, PR-A)

**Owning module:** Device Catalog.

**Status:** Concept declared in PR-A. Full entity shape, fields, validation rules, and normalization workflow defined in PR-B.

**Definition:**

Compatibility Marker is **a transitional Phase 1 CSV ingestion artifact**. It is the raw or semi-structured input captured from the Phase 1 CSV that the platform attempts to normalize into controlled feature evidence.

The following clarifications are normative and must be preserved in downstream PRs and in any consuming module's interpretation:

- **Not final feature truth.** A Compatibility Marker is an ingestion artifact, not authoritative feature evidence. Authoritative feature evidence is captured by Device Feature Assignment (post-normalization) and surfaced by Device Capability Evidence.
- **Not authoritative compatibility evidence.** Compatibility Markers must not be consumed by Product Catalog as if they were Device Feature Assignment evidence.
- **Not a Product Catalog compatibility assertion.** Compatibility Markers are not accessory compatibility assertions in the Product Catalog sense. Product Catalog owns accessory compatibility assertions; Compatibility Markers are a Device-Catalog-side ingestion concept that feeds Device-Catalog-owned feature evidence.
- **Not exposed to Product Catalog as a compatibility decision.** Product Catalog must not branch logic on Compatibility Marker state. Product Catalog reads Device Capability Evidence (post-normalization) and consumes Device Feature Assignments (where applicable).
- **Normalized into controlled feature evidence where possible.** When a Compatibility Marker can be mapped to a known Feature Group + Feature Value tuple, normalization produces or updates a Device Feature Assignment.
- **Routed to Data Quality Exception when it cannot normalize.** When mapping is ambiguous, missing, conflicting, or otherwise unresolvable, the Compatibility Marker routes to a Data Quality Exception for human resolution. The Compatibility Marker is retained for audit and as input to resolution.

**Naming note:** The name "Compatibility Marker" is preserved for consistency with the existing Device Catalog Phase 1 CSV context. There is a recognized risk of naming overlap with Product Catalog compatibility terminology (PR #79 Device Compatibility, Compatibility Update Modes). The naming may be revisited if confusion arises. See PR-A OQ 8.

**Boundary:** Compatibility Marker is owned by Device Catalog. Its lifecycle, retention, normalization workflow, and routing rules are owned by Device Catalog and defined in PR-B. No other module owns Compatibility Marker state.

---

### Data Quality Exception (concept-only, PR-A)

**Owning module:** Device Catalog.

**Status:** Concept declared in PR-A. Full lifecycle states, resolver authority, retention, and resolution workflow defined in PR-B.

**Definition:**

Data Quality Exception is **an architecture-level evidence category for feature data that requires human resolution**. It captures conditions where Device Catalog cannot produce or maintain authoritative feature evidence without intervention.

Conditions that produce Data Quality Exceptions (declared at concept level in PR-A; full triggering rules in PR-B):

- **Missing feature data** - a Device of a Device Type whose Device Capability Profile requires a Feature Group has no Device Feature Assignment for that Feature Group.
- **Stale feature data** - Device Capability Evidence references a Feature Group or Feature Value version that has been superseded or retired and has not been re-evaluated within the freshness threshold (threshold itself is PR-A OQ 3).
- **Conflicting feature data** - multiple Device Feature Assignments for the same (Device, Feature Group) pair where the platform cannot determine the authoritative one.
- **Incomplete feature data** - a Device Feature Assignment references a Feature Value that has been retired or is no longer present in the controlled taxonomy.
- **Unmappable feature data** - a Compatibility Marker cannot be normalized to any known Feature Group + Feature Value tuple.

**Boundary:** Data Quality Exception is owned by Device Catalog. Resolution authority, lifecycle states, retention, and the workflow that transitions an Exception from open to resolved are defined in PR-B. PR-A does not define the resolver authority class - the open question is whether resolution authority is identical to Device Feature Assignment / Correction Authority (PR-A permissions) or whether it should be a distinct class (see PR-A OQ 4).

**Consumption:**

- Product Catalog may consume Data Quality Exception references (read-only) when deciding whether to surface a device as available for compatibility filtering, but Product Catalog does not own resolution and does not create or mutate Data Quality Exception records. This consumption pattern is defined in PR-C.

## Feature Evidence Import and Review Workflow Entities (PR-B)

PR-B layers workflow-backed entities on top of PR-A's Feature Evidence Foundation. The PR-A entity definitions (Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence) are unchanged by PR-B. Two PR-A concept-only declarations (Compatibility Marker, Data Quality Exception) are promoted to full entity definitions in PR-B because the import and review workflow operates on them. One new workflow-supporting entity is introduced (Suggested Normalization).

PR-B does not change the conceptual framing established by PR-A. The PR-A normative clarifications for Compatibility Marker - *not final feature truth*, *not authoritative compatibility evidence*, *not a Product Catalog compatibility assertion*, *not exposed to Product Catalog as a compatibility decision* - remain in force. PR-B adds entity shape (fields, lifecycle states, audit references, relationships) without altering meaning.

The entities defined or promoted in PR-B are:

- **Compatibility Marker** - full entity (promoted from PR-A concept-only). The raw ingestion artifact captured from the Phase 1 CSV row.
- **Suggested Normalization** - new entity. A proposed mapping from a Compatibility Marker (or other unmapped input) to a Feature Group + Feature Value tuple. Workflow-supporting; not feature truth.
- **Data Quality Exception** - full entity (promoted from PR-A concept-only). The lifecycle-managed record of feature data requiring human resolution.
- **Device Capability Evidence Regeneration** - new entity (or sub-record on Device Capability Evidence per implementation choice). The audit record of an evidence regeneration attempt, including success/failure state.

The chain of states from CSV row to Product Catalog compatibility assertion is **architecturally non-collapsible**:

```
Raw CSV row
    +----- produces ---> Compatibility Marker (Device Catalog ingestion artifact, not feature truth)
        +----- proposes ---> Suggested Normalization (Device Catalog workflow proposal, not feature truth)
            +----- approved by System Admin ---> Device Feature Assignment (Device Catalog feature truth)
                +----- derives ---> Device Capability Evidence (Device Catalog derived view, feature truth)
                    +----- consumed by ---> Product Catalog accessory compatibility assertion (Product Catalog feature truth - independent decision)
```

These states are **not interchangeable**. A Compatibility Marker is not feature truth even if a Suggested Normalization has been proposed against it. A Suggested Normalization is not feature truth until it has been approved by a System Admin holding the appropriate authority class. Device Feature Assignment is the first feature truth in this chain. Device Capability Evidence is the consumer-facing derived view. Product Catalog accessory compatibility is a separate downstream interpretation; Device Catalog does not own it.

---

### Compatibility Marker

**Status in PR-B:** Promoted from PR-A concept-only to full entity. The PR-A `### Compatibility Marker (concept-only, PR-A)` block remains in the file (it carries the normative non-authoritative clarifications). PR-B adds the entity shape below.

**Owning module:** Device Catalog.

**Purpose:** The raw or semi-structured Phase 1 CSV ingestion artifact captured per import row per Feature-Group-related field. A single CSV row may produce zero, one, or many Compatibility Markers, depending on which Feature-Group-related fields the row contains content for. Compatibility Marker is the audit-grade record of *what was imported*, separate from *what was approved as feature truth*.

**Identity:**

- `compatibility_marker_id` - canonical platform-assigned identifier. Stable.
- `import_job_reference` - the CSV import job this marker came from. Required at creation. Not editable.
- `import_row_reference` - the row within the import job. Required at creation. Not editable.
- `source_field_reference` - the column / field within the row that produced this marker (e.g., `Connectivity`, `Charger Type`, `Compatibility Markers`). Required at creation. Not editable.

**Content (the raw artifact):**

- `raw_value` - the literal text content captured from the CSV cell. Preserved exactly as imported, with platform-standard text identifier preservation per `import-export-validation-governance.md` where applicable (leading-zero preservation, no whitespace normalization unless explicit, no encoding transformation).
- `target_device_reference` - the Device the marker is intended for. Required. Determined by the import row's Device identification (per `phase-1-csv-import.md`).
- `intended_feature_group_hint` - optional. When the source field corresponds to a known Feature Group (e.g., the `Charger Type` column maps cleanly to the `charger_type` Feature Group), this records the hint. When the source field is a generic Compatibility Markers column, this is null and the workflow must determine the Feature Group during normalization.

**Lifecycle states (proposal-level for PR-B):**

- `pending_normalization` - captured from CSV import; awaiting normalization. Default state at creation.
- `normalization_proposed` - one or more Suggested Normalizations have been proposed against this marker (by automated suggestion or by System Admin review).
- `normalization_approved` - a Suggested Normalization has been approved by a System Admin; a Device Feature Assignment has been created or updated from this marker.
- `normalization_unmappable` - the marker cannot be normalized to any controlled Feature Group + Feature Value tuple. Routed to Data Quality Exception.
- `superseded` - a later import replaced or invalidated this marker. Retained for audit; no longer current.

State transitions are defined in `workflows.md` (PR-B). Compatibility Markers do not transition autonomously - every transition is triggered by an explicit System Admin action or by a Phase 1 CSV import workflow step.

**Provenance:**

- `created_at`, `created_by` - when and by whom (typically the import job's actor, recorded against CIXCI System Admin per `permissions.md`).
- `last_state_transition_at`, `last_state_transition_by`, `last_state_transition_reason` - per transition.
- `superseded_by` - when applicable, reference to the marker that superseded this one.

**Relationships:**

- A Compatibility Marker belongs to exactly one import job and one import row.
- A Compatibility Marker references exactly one target Device.
- A Compatibility Marker may have zero or more Suggested Normalizations.
- A Compatibility Marker may have exactly one approved normalization (the one that produced or updated the Device Feature Assignment).
- A Compatibility Marker may produce one Data Quality Exception (when state is `normalization_unmappable`).

**Retention:**

Compatibility Markers are retained for audit/reference per `import-export-validation-governance.md`. Specific retention period is deferred (see PR-B OQ 5).

**Boundary preservation (from PR-A):**

- Compatibility Markers must not be consumed by Product Catalog as authoritative compatibility evidence.
- Compatibility Markers are not exposed to Product Catalog as a compatibility decision.
- Product Catalog reads Device Feature Assignment and Device Capability Evidence; it does not read Compatibility Marker state.

---

### Suggested Normalization

**Status in PR-B:** New entity. Workflow-supporting; not feature truth.

**Owning module:** Device Catalog.

**Purpose:** A proposed mapping from a Compatibility Marker (or other unmapped input) to a Feature Group + Feature Value tuple. Suggested Normalizations are produced during the Phase 1 CSV import preview and review workflow. A Suggested Normalization is a *proposal*, not an *approval*; it has no effect on Device Feature Assignment, Device Capability Evidence, or Product Catalog consumption until and unless approved by a System Admin holding the appropriate authority class.

**Critical distinction (architecturally non-collapsible):**

- **Suggested Normalization != Approved Normalization.** A Suggested Normalization may be proposed during preview, but only an approved System Admin action can create or update Device Feature Assignment / Device Capability Evidence. Approval is recorded as an audit-linked state transition; the Suggested Normalization itself is not feature truth.
- **Suggested Normalization is not AI feature truth.** Where the suggestion was produced by an automated rule or by AI Agent Services in a future phase, the suggestion is still a proposal subject to human approval per `permissions.md`. PR-B does not enable AI-driven auto-approval; Phase 1 has no AI involvement in Device Catalog ingestion.

**Identity:**

- `suggested_normalization_id` - canonical platform-assigned identifier. Stable.
- `compatibility_marker_reference` - the marker this suggestion is proposing a normalization for. Required at creation. Not editable.

**Proposal content:**

- `proposed_feature_group_reference` - the Feature Group the suggestion proposes mapping to. Required.
- `proposed_feature_value_references` - one or more Feature Value references within the proposed Feature Group (cardinality per Feature Group's `value_structure_kind`). Required.
- `proposal_source` - one of: `system_admin_proposal`, `automated_rule_proposal`, `prior_history_proposal`. The exact source determines what authority and audit reference is required for approval (per `permissions.md` Override Discipline). PR-B Phase 1 uses `system_admin_proposal` and `automated_rule_proposal` only; `prior_history_proposal` (suggested based on prior approved normalizations for similar markers) is reserved.
- `proposal_confidence_indicator` - an optional, non-authoritative indicator of how confident the proposal is. PR-B does not define a scoring scheme; the indicator is opaque to consumers and is for review-UX context only. Implementation is left to the developer; PR-B does not specify confidence semantics.

**Lifecycle states (proposal-level for PR-B):**

- `proposed` - created during preview / review. Default state.
- `approved` - a System Admin holding Device Feature Assignment / Correction Authority has approved this proposal. Approval creates or updates the corresponding Device Feature Assignment (see `workflows.md` for the commit sequence).
- `rejected` - a System Admin has explicitly rejected this proposal. Rejected proposals do not produce or update Device Feature Assignment. The underlying Compatibility Marker remains in `pending_normalization` or transitions to `normalization_unmappable` per workflow rules.
- `superseded` - a later proposal replaced this one. Retained for audit.

**Provenance:**

- `created_at`, `created_by`, `proposal_source`.
- `approved_at`, `approved_by`, `approval_audit_reference` - required for transition to `approved`. Approval audit reference is the audit record produced by the System Admin's approval action per `permissions.md` override and audit discipline.
- `rejected_at`, `rejected_by`, `rejection_reason_reference` - required for transition to `rejected`.

**Relationships:**

- A Suggested Normalization belongs to exactly one Compatibility Marker.
- A Suggested Normalization, when approved, produces or updates exactly one Device Feature Assignment.
- Multiple Suggested Normalizations may exist for the same Compatibility Marker; at most one may be `approved`.

**Boundary preservation:**

- Suggested Normalizations are not consumed by Product Catalog. Product Catalog reads Device Feature Assignment and Device Capability Evidence only.
- Suggested Normalizations are not authoritative within Device Catalog itself; they become feature-truth-producing only on approval.

---

### Data Quality Exception

**Status in PR-B:** Promoted from PR-A concept-only to full entity. The PR-A `### Data Quality Exception (concept-only, PR-A)` block remains in the file (it carries the normative ownership clarifications). PR-B adds the entity shape and lifecycle below.

**Owning module:** Device Catalog.

**Purpose:** The lifecycle-managed record of feature data requiring human resolution. Created when the Phase 1 CSV import or post-commit regeneration encounters a condition the platform cannot resolve automatically (missing required data, conflicting values, retired-value reference in active context, regeneration failure, unmappable Compatibility Marker, etc.).

**Identity:**

- `data_quality_exception_id` - canonical platform-assigned identifier. Stable.
- `exception_category` - one of (proposal-level for PR-B; full enumeration may be refined as workflows mature):
  - `missing_required_feature_data`
  - `stale_feature_evidence`
  - `conflicting_feature_values`
  - `unmappable_compatibility_marker`
  - `retired_feature_value_referenced`
  - `deprecated_feature_value_referenced_review_required`
  - `device_capability_evidence_regeneration_failed`
  - `device_capability_profile_mismatch_review_required`
  - `override_audit_evidence_missing`

**Subject references:**

- `device_reference` - the Device the exception relates to. Required when device-scoped.
- `feature_group_reference`, `feature_value_reference` - the taxonomy entities relevant to the exception. Optional; populated when applicable.
- `compatibility_marker_reference` - when the exception originated from an unmappable marker. Optional.
- `device_feature_assignment_reference` - when the exception is about a specific assignment. Optional.
- `device_capability_evidence_reference` - when the exception is about derived evidence (e.g., regeneration failure). Optional.
- `import_job_reference`, `import_row_reference` - when the exception originated from a CSV import. Optional.

**Lifecycle states:**

Per the PR-B scope decision, the persistent lifecycle states are:

- `created` - newly opened. Not yet acknowledged by a System Admin.
- `under_review` - a System Admin has acknowledged the exception and is working on resolution. **Note:** `corrected` is **not** a persistent state. When a System Admin applies a correction (e.g., approves a Suggested Normalization, supersedes a retired value, fixes a conflicting assignment), the correction is recorded as an audit-linked history entry on the exception; the exception remains in `under_review` until explicitly resolved. This distinction matters because applying a correction is not the same as confirming the correction stuck - the System Admin closes the exception (`resolved`) only after verifying the underlying issue is fixed.
- `resolved` - terminal. The underlying issue is fixed and the System Admin has closed the exception with verification.
- `dismissed` - terminal. The exception was a false positive or otherwise not actionable. The underlying data is accepted as-is because the original detection was incorrect.
- `unresolved` - terminal. The exception is closed despite the underlying issue not being fixed. The data remains in a degraded state, accepted intentionally. Closing as `unresolved` requires explicit System Admin override evidence per `permissions.md` Override Discipline.

Transitions:

- `created -> under_review` - explicit System Admin acknowledgement.
- `under_review -> resolved` - explicit System Admin closure with verification reference.
- `under_review -> dismissed` - explicit System Admin closure with dismissal reason.
- `under_review -> unresolved` - explicit System Admin closure with override evidence (see Override Discipline in `permissions.md`).
- `resolved | dismissed | unresolved -> under_review` - explicit System Admin reopening with reopen reason. Reopened exceptions retain their full history.
- `created -> dismissed | unresolved` - direct closure without intermediate `under_review` is permitted but discouraged; requires the same evidence as the equivalent `under_review ->` transition.

`corrected` is **never a persistent lifecycle state.** Each correction action is recorded as a history entry with: actor, timestamp, action type (e.g., `approved_normalization`, `superseded_assignment`, `created_feature_value`, `forced_override`), affected entity references, before/after where applicable, audit reference. The Data Quality Exception's history may contain zero or more correction entries; the lifecycle state is independent of the count of corrections.

**Resolution context:**

- `resolution_action_reference` - for `resolved`, the audit reference to the action(s) that resolved the underlying issue. May reference an approved Suggested Normalization, a superseded assignment, a corrected Feature Value, a regenerated Device Capability Evidence record, or similar.
- `dismissal_reason_reference` - for `dismissed`, a reason reference (whether structured controlled values or freeform is an open question, PR-B OQ 7).
- `unresolved_override_audit_reference` - for `unresolved`, the override audit reference per Override Discipline. Required; transition fails without it.

**Audit:**

- `created_at`, `created_by` - created by either a workflow action (CSV import detected the condition) or by an explicit System Admin action. When created by a workflow, `created_by` is the workflow's audit actor (CIXCI System Admin per `permissions.md`).
- `history` - append-only record of every state transition and every correction action. Each entry carries actor, timestamp, action type, audit reference, and any payload relevant to the action.
- `last_state_transition_at`, `last_state_transition_by`.

**Relationships:**

- A Data Quality Exception may reference zero or one of each subject entity (Device, Feature Group, Feature Value, Compatibility Marker, Device Feature Assignment, Device Capability Evidence, import job, import row).
- A Data Quality Exception is consumed by Product Catalog read-only as part of Device Capability Evidence consumption per PR-A boundary discipline.

**Deferrals (PR-B does not define):**

- Retention period for resolved / dismissed / unresolved exceptions.
- Notification routing (who is alerted when an exception is created).
- SLA / escalation behavior.
- Event-level representation (covered by the contracts/signals layer).
- API-level lookup contract (covered by the contracts/signals layer).

---

### Device Capability Evidence Regeneration

**Status in PR-B:** New entity (or sub-record on Device Capability Evidence per implementation choice). Audit-grade record of evidence regeneration attempts.

**Owning module:** Device Catalog.

**Purpose:** Records each attempt to regenerate Device Capability Evidence for a Device, including success, failure, and partial-success outcomes. PR-A defined Device Capability Evidence as the derived consumer-facing view; PR-B defines what happens when that view is recomputed after upstream changes.

**Trigger sources (declared at architecture level; full workflow in `workflows.md`):**

- New or updated Device Feature Assignment for the Device.
- Feature Value creation or mapping approval that affects assignments for the Device.
- Feature Group or Feature Value lifecycle transitions (deprecation, retirement, supersession) that affect assignments for the Device.
- Compatibility Marker normalization commit that produces or updates an assignment for the Device.
- Data Quality Exception resolution that changes feature evidence for the Device.

**Trigger discipline:**

Regeneration is **post-commit only.** Preview workflows may compute proposed evidence impact for display, but proposed-impact computations do not produce Device Capability Evidence records and do not raise the compatibility-impacting review signal. The discipline mirrors PR #78's pre-commit / post-commit pattern: previews are informational; only commits produce feature truth and downstream signals.

**Identity and outcome:**

- `regeneration_id` - canonical platform-assigned identifier. Stable.
- `device_reference` - the Device whose evidence was regenerated. Required.
- `triggered_at`, `triggered_by_reference` - the upstream commit that triggered the regeneration.
- `outcome` - one of:
  - `success` - Device Capability Evidence was successfully regenerated; the prior evidence record is superseded.
  - `failure` - regeneration failed. Per PR-B failure-handling rules, the Device Capability Evidence record is marked `stale` or `unknown` (per source-rule per workflow), and a Data Quality Exception of category `device_capability_evidence_regeneration_failed` is created.
  - `partial_success` - regeneration succeeded for some Feature Groups but failed for others. The succeeded portions update the evidence record; the failed portions create per-Feature-Group Data Quality Exceptions.
- `outcome_detail` - structured detail for failure / partial-success outcomes (failed Feature Group references; failure reason references). For `success`, may be empty or carry summary info.

**Compatibility-impacting review signal connection:**

A regeneration with `outcome = success` or `outcome = partial_success` raises the compatibility-impacting review signal **only where consumer safety is affected** - that is, only when the regeneration changed feature evidence in a way Product Catalog could reasonably need to know about (e.g., a Feature Value was added, removed, or changed for a Feature Group that any Product Catalog accessory compatibility assertion currently filters on). The exact rule for "consumer safety affected" is `workflows.md` territory; this entity's job is to record the outcome and the signal-raised audit reference.

`outcome = failure` does **not** raise the compatibility-impacting review signal by default. The Data Quality Exception captures the failure; Product Catalog learns about feature unavailability through the existing Device Capability Evidence `freshness_state` and through the Data Quality Exception reference, not through a separate signal. Exception: if a regeneration failure leaves the Device's evidence in a state where Product Catalog's previously-asserted compatibility may now be incorrect, the signal may be raised explicitly with `outcome = failure` plus override evidence per Override Discipline.

**Audit:**

- Every regeneration produces an audit reference per the platform pattern, regardless of outcome.
- Failures additionally produce a Data Quality Exception reference (see above).
- Signal-raised regenerations carry a signal-raised audit reference.

**Relationships:**

- A Device Capability Evidence Regeneration belongs to exactly one Device.
- A Device Capability Evidence Regeneration may produce zero or one new Device Capability Evidence record version (for `success` or `partial_success`).
- A Device Capability Evidence Regeneration may produce zero or more Data Quality Exceptions (for `failure` and `partial_success`).
- A Device Capability Evidence Regeneration may raise zero or one compatibility-impacting review signal occurrence.

**Boundary preservation:**

- Device Catalog raises the compatibility-impacting review signal; Product Catalog consumes it. Device Catalog does not directly mutate Product Catalog state in response to regeneration. The signal is one-way.

## Relationships

- Manufacturer may have many Brands.
- Brand may have many Device Models.
- Device Model may have many Device Variants.
- Device Master Record represents the canonical device identity for a model, variant, or another confirmed granularity.
- Device Master Record may have many Device Identifiers and Device Aliases.
- Device Master Record may belong to one or more Device Taxonomy Nodes.
- Device Source Record captures manufacturer, external feed, admin, or other source-system submissions.
- Device Import Batch groups records received through future-facing manufacturer, distributor, or API ingestion workflows where a later approved phase enables them.
- Phase 1 Device CSV Import Job records System Admin-only CSV import attempts, mode, file metadata, validation status, row counts, correction status, log references, and audit references.
- Phase 1 Device CSV Import Row records submitted row values, validation state, matched Device Reference where applicable, and create/update outcome.
- Phase 1 Device CSV Validation Error records row number, field name, rejected value, error code, correction guidance, and audit reference.
- Device Import Correction Record preserves original submitted values, corrected values, correcting actor, correction timestamp, and reason.
- Buyer Visibility Status is separate from system lifecycle status and supports Hidden and Visible proposal states.
- Device Image Readiness Reference records whether Media Management-owned image evidence has satisfied the visibility dependency without making Device Catalog the media asset owner.
- Device Export Record captures authorized buyer export/download activity or export snapshots.
- Buyer Device Portfolio Reference links an authorized buyer scope to a Device Reference without transferring canonical device ownership to Tenant Company, buyer-facing modules, or Product Catalog.
- Future Purchase Order Device Reference Placeholder may reference Device Catalog records without moving procurement workflow ownership into Device Catalog.

## Ownership

- Device Catalog owns canonical device records, identifiers, normalization, source tracking, taxonomy, lifecycle metadata, and Device Reference contracts.
- Device Catalog owns Phase 1 CSV import job, row validation, correction, log, and audit records for System Admin-only imports.
- Device Catalog owns buyer visibility status for device records as a distinct state from system lifecycle status, subject to Tenant Company and buyer-facing module boundaries.
- Device Catalog owns the Device Image Readiness Reference as a visibility dependency, but Media Management owns image upload, processing, validation, storage, matching, renditions, media audit, public image URL policy, transformations, CDN behavior, and rights management.
- Device Catalog owns buyer-exportable device source data and export/download contracts, subject to Tenant Company eligibility and buyer-facing workflow boundaries.
- Product Catalog owns accessory product records and accessory compatibility mappings that reference Device Catalog records, and may consume My Devices / Buyer Device Portfolio References for compatibility filtering without owning or mutating the buyer device portfolio.
- Tenant Company owns tenant hierarchy, company/entity scope, relationship eligibility, regional eligibility, user access, and permission boundaries.
- Pricing owns pricing rules, calculations, quotes, discounts, and final buyer-specific price.
- Order Routing owns routing decisions, vendor selection, route selection, and order orchestration.
- Fulfillment owns shipment, return, and fulfillment execution state.
- Future Procurement / Purchase Orders owns manufacturer purchase order workflow if that capability is introduced.

## Phase 1 CSV Import Data Rules

This section is proposal-level and specific to the Device Import Page - Phase 1 source update.

### Import Modes

- `Import New Devices`: creates new Device Master Records only when a row does not match an existing device by the Phase 1 uniqueness rule.
- `Update Existing Devices`: updates existing Device Master Records only when a row matches exactly one existing device by the Phase 1 uniqueness rule.

### CSV Field Template

Phase 1 CSV rows use these fields in exact order:

1. Manufacturer
2. Device Model
3. Device Type
4. Launch Date
5. Storage Variants
6. Connectivity
7. Charger Type
8. Feature Group
9. Compatibility Markers

### Header Validation Fields

- Header names must match exactly.
- Header order must match exactly.
- Missing fields, extra fields, and duplicate fields fail validation.
- Header validation should run before row-level validation.

### Row Validation Fields

- Required fields must be populated according to Phase 1 rules.
- Manufacturer must be recognized.
- Device Type must be a controlled value.
- Launch Date must be valid.
- Storage Variants, Connectivity, Charger Type, Feature Group, and Compatibility Markers should be populated for compatibility preparation.
- Rows must satisfy mode-specific uniqueness or matching rules before canonical records are created or updated.

### Phase 1 Uniqueness

- Uniqueness is Manufacturer + Device Model + Device Type.
- Matching is case-insensitive.
- Placeholder: define whitespace, punctuation, alias, and manufacturer normalization before matching.

### Status And Visibility Fields

- Phase 1 imported devices get system status Active after successful import.
- Buyer Visibility Status is separate and supports Hidden and Visible.
- Future Launch Date devices remain Hidden by default.
- Buyers do not see future devices unless System Admin marks them Visible.
- Device should not appear on All Devices or My Devices until image readiness is satisfied and buyer visibility is enabled.

## Device Identity Hardening

This section is proposal-level and does not finalize identity rules.

### Canonical Granularity Options

- Placeholder: canonical record per model, where variants are attributes or child records.
- Placeholder: canonical record per manufacturer model and variant combination.
- Placeholder: canonical record per manufacturer, model, variant, carrier, and region combination.
- Placeholder: canonical record per commerce-ready device SKU if future requirements demand SKU-level identity.
- Placeholder: define whether refurbished, condition, storage, color, network, carrier lock, or generation differences are canonical dimensions or descriptive attributes.

### Identifier Namespace Rules

- Placeholder: every identifier should carry an identifier type, namespace, issuer/source, region or carrier scope where relevant, and confidence level.
- Placeholder: manufacturer model numbers, carrier SKUs, buyer aliases, external feed IDs, UPC/GTIN/IMEI-family references, and CIXCI IDs should not share a flat namespace.
- Placeholder: identifier uniqueness should be evaluated inside its namespace before being promoted to cross-source identity.
- Placeholder: identifier collisions should create review-required states rather than automatic merges.

### Manufacturer vs Vendor vs Buyer Alias Distinction

- Placeholder: manufacturer identifiers and names should be treated as source-authoritative only where manufacturer authority is confirmed.
- Placeholder: vendor identifiers should not become canonical Device IDs unless a future source authority rule allows it.
- Placeholder: buyer aliases should remain tenant-scoped labels or export annotations and must not rewrite platform-wide canonical records.
- Placeholder: external feed aliases should carry source confidence and should be review-required when they conflict with manufacturer or CIXCI-governed fields.

### Model / Variant / Carrier / Region Collision Risks

- Placeholder: identical model names across manufacturers, brands, regions, carriers, years, generations, or product lines must not be assumed to represent the same device.
- Placeholder: carrier-specific and region-specific variants may need separate canonical records, linked variants, or scoped attributes depending on confirmed granularity.
- Placeholder: launch, release, discontinued, or availability dates may differ by region or carrier and should not be flattened without an authority decision.
- Placeholder: Product Catalog compatibility mappings should specify the Device Reference granularity they rely on so broad model references do not accidentally include incompatible variants.

### Merge / Split / Supersession Behavior

- Placeholder: merge should define predecessor references, successor reference, redirect behavior, audit trail, and downstream notification rules.
- Placeholder: split should define predecessor reference, successor references, ambiguity handling, and whether downstream consumers must reselect a more specific reference.
- Placeholder: supersession should distinguish replacement device, successor generation, lifecycle replacement, and alias correction.
- Placeholder: retired or discontinued devices may remain valid for historical references, buyer exports, analytics, and Product Catalog compatibility history.

### Immutable vs Redirected vs Deprecated Device References

- Placeholder: immutable references should never change target but may carry lifecycle state and successor pointers.
- Placeholder: redirected references may resolve to a successor reference after merge, subject to audit and consumer compatibility rules.
- Placeholder: deprecated references may remain resolvable for historical use but should be blocked or review-required for new associations.
- Placeholder: unresolved references should prevent downstream consumers from silently assuming compatibility, price, route, procurement, or export behavior.

## Field-Level Ownership

This section is proposal-level and does not finalize field authority.

### Manufacturer-Owned Fields

- Placeholder: manufacturer name, brand, model, variant, external model number, and device specifications where manufacturer authority is confirmed.
- Placeholder: launch, release, availability, or discontinued dates where provided by manufacturer or authoritative source.
- Placeholder: carrier, region, color, storage, network, or other variant metadata where source authority is confirmed.
- Placeholder: device images or content references if supplied as manufacturer source data.

### CIXCI-Governed Fields

- Placeholder: canonical Device ID and Device Reference identity.
- Placeholder: normalization rules, deduplication status, merge/split/supersession decisions, and alias mappings.
- Placeholder: taxonomy placement and category labels where CIXCI governs classification.
- Placeholder: buyer-exportable field set and export contract metadata.
- Placeholder: lifecycle status normalization and visibility state for canonical device records.
- Placeholder: Phase 1 CSV import validation, correction, status, and audit metadata.
- Placeholder: audit, import batch, source confidence, and change record metadata.

### Buyer Alias / Export Fields

- Placeholder: buyer-specific alias, label, merchandising name, or export formatting preference should remain tenant-scoped.
- Placeholder: buyer export record, export batch, download state, and export audience should remain scoped to authorized buyer/company/entity context.
- Placeholder: buyer portfolio references should link buyer scope to Device References without creating buyer-owned canonical device records.

### External Feed Fields

- Placeholder: external feed identifiers, taxonomy hints, lifecycle hints, availability metadata, enrichment attributes, and media references should retain source attribution.
- Placeholder: external feed data should carry confidence, freshness, and conflict status before affecting canonical records.
- Placeholder: external feed values should not override manufacturer-owned or CIXCI-governed fields without a confirmed precedence rule.

### Tenant Company-Owned Or Scope Fields

- Placeholder: buyer, parent company, child entity, relationship, and regional eligibility scope.
- Placeholder: role and permission context required to view, export, or administer device data.
- Placeholder: tenant readiness or eligibility signals used by Device Catalog access decisions.

### Unresolved / Shared Fields

- Placeholder: buyer device portfolio references when buyer-facing modules own workflow state but Device Catalog owns canonical device reference integrity.
- Placeholder: field authority when manufacturer data, CIXCI normalization, buyer-specific aliases, vendor data, and external feeds conflict.
- Placeholder: region-specific device availability when it affects Product Catalog compatibility, Pricing, Order Routing, or buyer export behavior.
- Placeholder: Device Image Readiness Reference shape when Media Management owns device image and content assets.
- Placeholder: compatibility anchor metadata if a future Compatibility Authority is assigned.

### Precedence When Sources Conflict

- Placeholder: CIXCI-governed identity and Device Reference integrity should block automatic overwrites from lower-confidence sources.
- Placeholder: manufacturer-authoritative fields should generally outrank vendor or external feed values for manufacturer-controlled attributes, unless a confirmed source exception exists.
- Placeholder: buyer aliases should annotate tenant-scoped export or portfolio views and should not override canonical manufacturer or CIXCI-governed values.
- Placeholder: external feed values should be staged, scored, or review-required when they conflict with manufacturer-owned or CIXCI-governed fields.
- Placeholder: unresolved conflicts should produce review-required states and audit records rather than silent canonical updates.

## Retention

- Placeholder: define retention for retired, merged, split, or discontinued device records.
- Placeholder: define retention for source records, import batches, failed import records, correction records, and normalization decisions.
- Placeholder: define retention for buyer export/download history and Device Reference audit logs.
- Placeholder: define retention for aliases and superseded identifiers needed for historical compatibility or order references.

## Tenant Isolation Notes

- Canonical device data may be platform-wide, but access, export, and buyer portfolio usage must be tenant-scoped.
- Buyer Device Portfolio References must not leak one buyer's portfolio, export, or eligibility state to another buyer.
- Buyer aliases must remain tenant-scoped and must not overwrite platform-wide canonical device fields.
- Device export permissions must be evaluated with Tenant Company scope and relationship eligibility signals.
- Device Reference identifiers used by Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, or future Procurement must not expose unauthorized tenant-specific state.

## My Devices Portfolio Snapshot and Change Record Data Model

This section documents the Device Catalog data-model extensions for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. All existing Device Catalog data-model entries (canonical Device records, Device References, Device Capability Evidence, existing Buyer Device Portfolio Reference) are preserved without modification. The Product Catalog side is documented in `modules/product-catalog/data-model.md`.

### Buyer-scope triad (data-model invariant; Device Catalog side)

Every buyer-specific entity introduced or hardened in this section carries the buyer-scope triad:

- `buyer_reference` (REQUIRED).
- `company_scope_reference` (REQUIRED).
- `buyer_entity_reference` (REQUIRED).

Cross-buyer reads / mutations are architecturally impossible: every record is keyed on the triad. There is no cross-buyer key.

---

### Buyer Device Portfolio Reference (HARDENED)

The existing Buyer Device Portfolio Reference entity is preserved by reference and hardened with the following additional fields. Existing fields and existing references continue to work; the new fields are additive.

Hardening additions:

- `active_flag` (REQUIRED; boolean).
- `change_source` (REQUIRED; one of: `buyer_action`, `admin_on_behalf`, `service_identity_sync`, `system_correction`).
- `last_change_timestamp` (REQUIRED).
- `current_portfolio_snapshot_reference` (REQUIRED; reference to the most recent Buyer Device Portfolio Snapshot for this buyer).

Existing fields preserved per existing Device Catalog baseline: buyer-scope triad, device_reference, lifecycle / audit fields.

### Buyer Device Portfolio Snapshot (NEW)

Frozen portfolio at a point in time. Referenced by Product Catalog Buyer-Scoped Compatibility Projections (1:1 via projection's `buyer_device_portfolio_snapshot_reference`).

Proposal-level fields (reference-first):

- `buyer_device_portfolio_snapshot_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `snapshot_timestamp`.
- `active_device_references` (the set of device references with `active_flag = true` at snapshot time).
- `inactive_device_references` (the set of device references with `active_flag = false` at snapshot time; preserved for evidence and supersession traceability).
- `superseded_device_references` (devices superseded by successors; preserved).
- `excluded_device_reason_summary` (counts by exclusion reason; e.g., `inactive`, `superseded`, `reference_corrected_away`).
- `prior_snapshot_reference` (nullable; preserves evidence chain).
- `snapshot_evidence_reference` (Logs & Audit Evidence Record reference; evidence kind: `buyer_device_portfolio_snapshot`).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).

### Buyer Device Portfolio Change Record (NEW)

Append-only history of portfolio changes. One Change Record per portfolio-affecting event; bulk imports produce ONE record per import.

Proposal-level fields:

- `buyer_device_portfolio_change_record_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `change_timestamp`.
- `change_type` (one of 8 values: `device_added`, `device_removed`, `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`).
- `prior_portfolio_snapshot_reference` (nullable for first-time / empty-prior cases).
- `new_portfolio_snapshot_reference` (REQUIRED).
- `affected_device_references` (the set of devices changed in this record).
- `change_reason_reference` (optional structured reason).
- `actor_reference` OR `service_trigger_reference` (one populated).
- `change_evidence_reference` (Logs & Audit Evidence Record reference; evidence kind: `buyer_device_portfolio_change`).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).

---

### Buyer-scope triad - data-model rules

#### Cross-buyer non-interference (architectural guarantee)

- Every Buyer Device Portfolio Reference, Snapshot, and Change Record carries the buyer-scope triad.
- There is no cross-buyer key.
- Buyer 1's portfolio cannot be read or mutated under Buyer 2's scope.

#### Canonical Device record preservation

- Canonical Device records and Device References remain Device-Catalog-owned.
- This PR does NOT modify canonical Device record fields.
- Portfolio entities REFERENCE devices; they do NOT mutate device canonical data.
- Product Catalog REFERENCES portfolio snapshots; it does NOT mutate them.

#### Historical evidence preservation

- Buyer Device Portfolio Change Records are append-only.
- Buyer Device Portfolio Snapshots are immutable once created (superseded by newer snapshots; prior snapshots remain referenceable for evidence).
- Existing Device Catalog baseline evidence (Device Capability Evidence, compatibility-impacting review signals) is preserved per existing baseline.

#### Empty My Devices state

- A buyer with no active devices has a VALID Buyer Device Portfolio Snapshot with empty `active_device_references`.
- The snapshot itself exists; Product Catalog produces a valid empty-portfolio projection per its Workflow 11.

#### `change_source` semantics

- `buyer_action`: the buyer initiated the change directly.
- `admin_on_behalf`: a Tenant Company admin initiated the change on behalf of the buyer per existing act-on-behalf authority.
- `service_identity_sync`: a service identity (e.g., Tenant API integration user) initiated the change.
- `system_correction`: a system-initiated correction (e.g., reference correction).

#### Evidence kinds emitted by Device Catalog under this Foundation

- `buyer_device_portfolio_snapshot` (NEW): emitted on Buyer Device Portfolio Snapshot creation and supersession.
- `buyer_device_portfolio_change` (NEW): emitted on Buyer Device Portfolio Change Record creation.

Both evidence kinds are recorded by Logs & Audit per existing PR-A discipline. CPA / legal / DevOps retention duration review for these two new kinds occurs in parallel post-merge (consistent with PR #104 + Logs & Audit PR-D retention review pattern).

### What this data-model section intentionally does NOT introduce

- No Device Catalog ownership of accessory visibility, export eligibility, Add Accessory / Accessory Added state, Selling state, or compatibility projection (Product Catalog owns).
- No Product Catalog-owned canonical Device records.
- No Product Catalog-owned My Devices source records.
- No global Buyer-Scoped Compatibility Projection (Product Catalog projection is buyer-scoped only).
- No automatic Stop Selling record from device removal (locked default).
- No new tenant capabilities or role bundles.
- No new Logs & Audit entities (2 new evidence kinds emitted via existing `service_identity.evidence_emit`; an additional 2 emitted by Product Catalog; 4 total).
- No new Notification Platform entities.
- No new Integration Management entities.
- No concrete persistence schema. Implementation owns.
- No concrete query indexing strategy. Implementation owns.
- No concrete propagation latency. Implementation owns.
- No concrete UI / UX field shapes. Future UX / UI.
- No rename, deprecation, or replacement of any existing baseline data-model entry (Buyer Device Portfolio Reference is hardened additively; existing fields preserved).
- No modifications to `phase-1-csv-import.md` data-model entries (out of scope).
- No `audit_export.*` capability references (PR #103 family is for compliance audit report exports).
