# Device Catalog Permissions

## Roles

- Placeholder: System Admin for Phase 1 CSV device import, import correction, import review, buyer visibility changes, and image-readiness gating review.
- Placeholder: Device Catalog Admin for canonical device correction, merge/split review, lifecycle updates, and import review outside Phase 1 constraints.
- Placeholder: Device Catalog Viewer for read-only access to authorized device records.
- Placeholder: Manufacturer Integration Actor for future source data submission within confirmed source boundaries, not Phase 1 self-service import.
- Placeholder: Buyer Export Actor for authorized buyer device export/download.
- Placeholder: Operations Reviewer for failed imports, source conflicts, and export failures.

## Feature Evidence Foundation Authority Classes (PR-A)

PR-A introduces two distinct authority classes for the Device Catalog Feature Evidence Foundation. Both route to CIXCI System Admin in Phase 1, but they are declared as separate authority classes from the outset so that future ingestion sources (manufacturer / distributor / API ingestion in later phases) can be granted one class without granting the other.

All authority decisions are evaluated against Tenant Company `check_access`. Device Catalog does not maintain its own role hierarchy; it declares which authority class is required and defers to Tenant Company for the resolution.

### Authority Class - Feature Taxonomy Authority

**Scope:** Lifecycle and definition of the controlled feature taxonomy. Specifically:

- Create, update, deprecate, retire Feature Group records.
- Create, update, deprecate, retire Feature Value records.
- Create, update, supersede Device Capability Profile records (per Device Type applicability of Feature Groups).
- Declare supersession references between Feature Groups, between Feature Values, and between Device Capability Profiles.

**Phase 1 holders:** CIXCI System Admin only.

**Future-phase considerations (not enabled by PR-A):** This authority class is reserved for taxonomy administration. Manufacturer or distributor ingestion sources, if enabled in a future phase, would receive Device Feature Assignment / Correction Authority only - never Feature Taxonomy Authority. Taxonomy administration remains a CIXCI platform responsibility.

**Audit requirements:**

- Every Feature Taxonomy Authority action produces an audit record with actor reference, action type, before/after state, version increment, and source hash.
- Retirement of a Feature Group or Feature Value with active downstream references (active Device Feature Assignments, active Device Capability Profile entries) produces an audit record that includes the impact reference. Whether retirement is blocked, warned, or routed to review when active references exist is an open question for PR-B (PR-A OQ 6).
- All audit records are emitted to Logs & Audit per the platform pattern; Device Catalog references audit identifiers but does not own the immutable record.

**Override discipline:**

- "Controlled overrides require audit." Any taxonomy action that bypasses normal lifecycle expectations (e.g., directly retiring a Feature Group without prior deprecation, or restoring a retired Feature Value) requires an explicit override reference and an audit record carrying that override reference. Override workflows are defined in PR-B; PR-A declares the audit requirement.

### Authority Class - Device Feature Assignment / Correction Authority

**Scope:** Creation, update, supersession, withdrawal, and correction of Device Feature Assignment records. Specifically:

- Create new Device Feature Assignments (per Device, per Feature Group).
- Update existing Device Feature Assignments (superseding the prior active assignment).
- Withdraw Device Feature Assignments (e.g., when a feature was incorrectly assigned).
- Correct Device Feature Assignment records (e.g., when a CSV import produced a wrong Feature Value reference and human review identifies the error).
- Trigger regeneration of Device Capability Evidence (the derived consumer-facing view) when underlying assignments change.

**Phase 1 holders:** CIXCI System Admin only.

**Phase 1 source provenance:** Device Feature Assignments created in Phase 1 carry one of the following `assignment_source` values:

- `csv_import` - created or updated through the Phase 1 CSV import workflow (per `phase-1-csv-import.md`, full workflow defined in PR-B).
- `system_admin_direct_edit` - created or updated by CIXCI System Admin direct edit through an administrative surface.
- `compatibility_marker_normalization` - created or updated as a result of Compatibility Marker normalization during Phase 1 CSV import.

`manufacturer_api` and `distributor_api` are reserved for future phases and must not appear in Phase 1.

**Audit requirements:**

- Every assignment action produces an audit record with actor reference, action type, source provenance, before/after state, and reference to the source evidence (CSV import job ID, admin action ID, or Compatibility Marker ID).
- Withdrawals and corrections additionally carry a reason reference. Whether the reason reference is structured (controlled values) or freeform is an open question for PR-B.

**Override discipline:**

- Any assignment that bypasses normal validation expectations (e.g., assigning a Feature Value within a Feature Group that is `unsupported` per the Device Capability Profile) requires an explicit override reference. The override is permitted only when authorized by Feature Taxonomy Authority *or* when a Data Quality Exception resolution explicitly directs the assignment. Override workflows are defined in PR-B.

### Cross-class invariants

- Holding **Feature Taxonomy Authority** does not implicitly grant **Device Feature Assignment / Correction Authority**, or vice versa. The classes are independent.
- In Phase 1 both classes route to CIXCI System Admin. In practice, all System Admins hold both classes in Phase 1. This invariant exists to make Phase 2+ ingestion separable.
- Both classes evaluate against Tenant Company `check_access`. Device Catalog does not duplicate authority logic.

### Explicit exclusions

The following actors must not hold either authority class, and must not perform the actions covered by either class:

- **Buyers** - buyers cannot edit feature truth through My Devices, through any buyer-facing surface, or through any indirect mechanism. Buyer interactions with Device Catalog are read-only with respect to feature evidence. Buyers may add devices to their portfolio (per PR #86 Buyer Device Portfolio Reference), but adding a device to a portfolio does not assert feature evidence about the device - the feature evidence is the Device Catalog's pre-existing assertion.
- **Product Catalog** - Product Catalog must not create, update, deprecate, retire, supersede, or otherwise mutate Feature Groups, Feature Values, Device Capability Profiles, Device Feature Assignments, or Device Capability Evidence records. Product Catalog consumes Device Catalog evidence; it does not produce or modify it. This exclusion is symmetric with the Product-Catalog-side declarations expected from accepted / in-flight Product Catalog Section 12 boundary work (PR #85), where present; PR-A does not require those Product Catalog declarations to be on main.
- **AI Agent Services (Phase 1)** - Phase 1 does not include AI-assisted Device Catalog operations. If AI-assisted feature suggestion or AI-assisted correction is added in a later phase, AI Agent Services must not bypass either authority class; AI suggestions require explicit Accept / Edit / Reject action by a holder of the appropriate authority class.
- **Manufacturer / distributor / API ingestion sources (Phase 1)** - not enabled in Phase 1. When enabled in a future phase, ingestion sources would receive Device Feature Assignment / Correction Authority at most; they would not receive Feature Taxonomy Authority.

### Authority class evolution note

PR-A intentionally declares two classes even though they route to a single actor in Phase 1. The rationale:

- It makes the authority surface explicit and reviewable.
- It avoids restructuring `permissions.md` when later phases introduce additional ingestion sources.
- It mirrors Product Catalog's pattern of separating taxonomy authority from operational authority.

Future evolution may introduce additional authority classes (e.g., Data Quality Exception Resolution Authority, if resolution turns out to require a distinct class). PR-A does not anticipate the resolution authority class; PR-B resolved Phase 1 to use Device Feature Assignment / Correction Authority.

### What PR-A permissions do NOT cover

- Data Quality Exception lifecycle authority beyond the Phase 1 assignment/correction authority decision.
- Read access (e.g., which actors may read Feature Group records, Device Capability Evidence records, or Data Quality Exception references) - read access is governed by the consuming module's own scope evidence and Tenant Company `check_access`; Device Catalog does not declare read-side authority in PR-A.
- API-level rate limiting, surface-level access control, or transport-level authentication - covered by contracts/signals placeholders and Integration Management boundaries.
- Cross-tenant System Admin override audit attribution (i.e., the `crossTenantOverrideAttribution` pattern from PR #78) - declared by reference here as applicable; full pattern lives in Product Catalog and platform standards.

## Feature Evidence Workflow Authority Decisions and Override Discipline (PR-B)

PR-A introduced two authority classes (Feature Taxonomy Authority, Device Feature Assignment / Correction Authority). PR-B does not introduce additional authority classes. PR-B introduces the **Override Discipline** pattern that applies to a defined set of validation-bypassing actions across PR-B's workflows.

### Resolution Authority - no new class

PR-A OQ 4 deferred the question of whether Data Quality Exception resolution requires a separate Resolution Authority class. **PR-B decision:** Phase 1 routes Data Quality Exception resolution to the existing **Device Feature Assignment / Correction Authority** class. No new authority class is introduced.

Rationale (preserved from PR-B scoping):

- In Phase 1, the resolver and the assignment-corrector are almost always the same person.
- Both classes route to CIXCI System Admin in Phase 1.
- Adding a class for a distinction without practical separation invites class proliferation.
- If Phase 2 ingestion sources are added and need to resolve exceptions through different paths (e.g., a manufacturer API providing the missing value resolves an exception automatically), that is the moment to introduce a distinct Resolution Authority class.

Holders of Device Feature Assignment / Correction Authority may, for Data Quality Exceptions:

- Transition `created -> under_review` (acknowledgement).
- Apply correction actions (auditable history during `under_review`): approve Suggested Normalizations; create Feature Values (additionally requires Feature Taxonomy Authority); supersede Device Feature Assignments; trigger Device Capability Evidence regeneration retry.
- Transition `under_review -> resolved` (closure with verification).
- Transition `under_review -> dismissed` (false-positive closure).
- Transition `under_review -> unresolved` (override-required closure; see Override Discipline below).
- Transition any terminal state back to `under_review` (reopening).

### Override Discipline - reusable pattern

PR-B introduces an Override Discipline pattern for actions that bypass standard validation. Override is a controlled, audit-evidenced bypass - not a silent override and not an automatic override. Each override case has identical evidence requirements; the cases differ only in what validation rule is being bypassed.

**All override actions require, without exception:**

- **Actor reference** - the System Admin performing the override. Must hold the appropriate authority class (Device Feature Assignment / Correction Authority for most cases; Feature Taxonomy Authority where the override touches taxonomy).
- **Reason** - explicit textual reason for the override. Whether structured (controlled values) or freeform is an open question (PR-B OQ 7).
- **Timestamp** - when the override was performed.
- **Affected entity / reference** - the Device, Device Feature Assignment, Compatibility Marker, Suggested Normalization, Feature Value, Feature Group, Device Capability Profile, Data Quality Exception, or other entity the override applies to. Required.
- **Before / after where applicable** - the state before and after the override. Required when the override changes entity state; may be empty when the override is a process-level bypass (e.g., force-commit with warnings).
- **Audit reference** - the audit record produced by the override action. Emitted to Logs & Audit per the platform pattern.

**Validation failure on missing override evidence:**

When an override action is detected without complete override evidence, validation **fails**. The override is rejected; the underlying standard rule is reasserted. This is the protection against silent overrides:

- A System Admin who attempts to assign a retired Feature Value without an `override_audit_reference` has their action blocked at validation. The retired-value rule's standard error fires.
- A System Admin who attempts to close a Data Quality Exception as `unresolved` without an `unresolved_override_audit_reference` has their transition blocked at validation. The exception remains in `under_review`.

**Validation rule:** `OVERRIDE_AUDIT_EVIDENCE_MISSING` is the cross-cutting reason code for an override action lacking complete evidence. PR-B does not assign an OpenAPI error model name; that mapping remains OpenAPI implementation scope.

### Named override cases

PR-B identifies five named cases where the Override Discipline applies. Each case bypasses one specific standard validation rule. The mechanism (evidence requirements, audit, validation-fail-on-missing) is identical across cases.

#### Case 1 - Retired Feature Value override

**Standard rule (PR-B validation):** Device Feature Assignments must not reference retired Feature Values. Attempted assignment with a retired-value reference produces validation error `RETIRED_FEATURE_VALUE_REFERENCED`.

**Override:** A System Admin holding Device Feature Assignment / Correction Authority may override the retired-value block for a specific assignment. Common case: a Feature Value was retired but the System Admin determines that an in-flight Device's CSV import legitimately needs the retired value (e.g., older device firmware that still has the retired feature). Override permits the assignment to be created; the resulting Device Feature Assignment carries the override audit reference.

**Evidence required:** All standard Override Discipline evidence (actor, reason, timestamp, affected entity = the Device Feature Assignment being created; before / after = the pre-state of the assignment vs. the post-state; audit reference).

**Side effect:** A Data Quality Exception of category `retired_feature_value_referenced` may still be created alongside the assignment, depending on the workflow context (typically yes, for visibility), with the override audit reference attached.

#### Case 2 - Device Capability Profile mismatch override

**Standard rule (PR-B validation):** When a Device Capability Profile marks a Feature Group as `unsupported` for the Device's Device Type, Device Feature Assignments for that Feature Group are not permitted. Attempted assignment produces validation error `FEATURE_VALUE_NOT_VALID_FOR_DEVICE_CAPABILITY_PROFILE`.

**Override:** A System Admin may override the Profile mismatch for a specific assignment. Common case: a Profile was authored conservatively; an actual Device of the Device Type does carry the feature; the System Admin determines the assignment is legitimate. Override permits the assignment; the override audit captures the Profile mismatch.

**Evidence required:** All standard Override Discipline evidence. `affected entity` is the Device Feature Assignment plus the Device Capability Profile entry being overridden. `before / after` reflects the assignment's pre-state and post-state.

**Side effect:** May produce a Data Quality Exception of category `device_capability_profile_mismatch_review_required` for visibility, with the override audit reference attached. May also surface a signal to Feature Taxonomy Authority that the Profile content may need revision (Profile revision itself is a separate Feature Taxonomy Authority action, not part of this override).

#### Case 3 - Unresolved acceptance override

**Standard rule (PR-B validation):** Data Quality Exception transitions to `unresolved` require explicit override evidence. Attempted transition without evidence produces validation error `OVERRIDE_AUDIT_EVIDENCE_MISSING` (the cross-cutting reason code).

**Override:** A System Admin may close a Data Quality Exception as `unresolved` when the underlying data degradation cannot be fixed and the exception must be accepted in a degraded state. The override audit captures the acceptance decision.

**Evidence required:** All standard Override Discipline evidence. `affected entity` is the Data Quality Exception. `reason` is the explicit reason the data cannot be fixed. `before / after` is the exception's pre-transition state (`under_review`) and post-transition state (`unresolved`). The override audit reference is recorded in the exception's `unresolved_override_audit_reference` field per `data-model.md`.

**Side effect:** Downstream consumers (Product Catalog) read the exception's `unresolved` state and the override audit reference; they may choose to filter the affected Device differently than a `resolved` Device. This is Product Catalog's decision per the consumption boundary.

#### Case 4 - Force-commit with warnings override

**Standard rule (PR-B validation):** Phase 1 CSV imports with warning-classified rows surface the warnings during preview. By default, commit proceeds for warning-only rows without requiring override (warnings are non-blocking per platform standard). However, when warnings cluster around a single workflow concern (e.g., many rows reference deprecated values, many rows touch `review_required` Profile entries, or System Admin chooses to commit despite a high warning count), the System Admin may explicitly invoke force-commit-with-warnings as an explicit override action that records the choice.

**Override:** This case differs from the others in that the standard rule does not *block* - warnings are non-blocking by default. The override exists to record the explicit decision to commit despite material warning content, for audit and post-commit review. This is process-level, not validation-blocking.

**Evidence required:** All standard Override Discipline evidence. `affected entity` is the import job. `before / after` may be empty (process-level override). `reason` is the explicit reason for choosing to commit despite warning content.

**Side effect:** The import job carries the force-commit override audit reference; downstream review can see the commit was made under explicit override discipline rather than as default warning-only commit.

#### Case 5 - Regeneration failure continuation override

**Standard rule (PR-B validation):** A Device Capability Evidence Regeneration with `outcome = failure` does not, by default, raise the compatibility-impacting review signal - the failure produces a Data Quality Exception; the signal is reserved for successful or partial-success outcomes where consumer-safety-affecting changes occurred (per `workflows.md` Workflow 6).

**Override:** When a regeneration failure leaves the Device's evidence in a state where Product Catalog's previously-asserted compatibility may now be incorrect (e.g., the regeneration was attempting to refresh evidence that was already known stale; the failure means stale evidence persists when fresh evidence was needed), the System Admin may force the compatibility-impacting review signal to be raised with explicit override evidence. This is a request to Product Catalog to re-review; Product Catalog still decides what to do.

**Evidence required:** All standard Override Discipline evidence. `affected entity` is the Device and the failed regeneration record. `reason` is the explicit reason consumer safety may be affected despite the regeneration failure. `before / after` is the prior regeneration state vs. the failed-and-overridden state.

**Side effect:** The compatibility-impacting review signal is raised with `outcome = failure` plus the override audit reference. Product Catalog consumes the signal and decides what to do (it may choose to filter the Device, mark its compatibility assertions as stale, or take no action - that is Product Catalog's downstream decision).

### Override audit cross-cutting reason code

`OVERRIDE_AUDIT_EVIDENCE_MISSING` is the validation reason code that fires whenever any override action is detected without complete override evidence (any of the five cases). The validation rule is single - the cases are different *standard rules being bypassed*; the validation that fails the bypass is the same `OVERRIDE_AUDIT_EVIDENCE_MISSING` check.

### What PR-B does NOT change in `permissions.md`

- Does not introduce new authority classes beyond PR-A's two.
- Does not modify PR-A's authority class definitions.
- Does not modify PR-A's explicit exclusions (buyers cannot edit feature truth; Product Catalog cannot create / mutate Device Catalog taxonomy or assignments; AI Agent Services not enabled in Phase 1; manufacturer / distributor / API ingestion not enabled in Phase 1).
- Does not introduce read-access permissions. Read access is governed by consuming-module scope evidence and Tenant Company `check_access`.
- Does not contract API surface authority enforcement beyond the contracts/signals placeholders and Integration Management boundary references.

## Permission Sets

- Placeholder: view canonical device records.
- Placeholder: view source record and normalization metadata.
- Placeholder: submit Phase 1 System Admin-only CSV import batches.
- Placeholder: select Phase 1 import mode: Import New Devices or Update Existing Devices.
- Placeholder: view Phase 1 header validation, row validation, correction, log, and audit results.
- Placeholder: correct or reject Phase 1 import rows if correction workflow is approved.
- Placeholder: approve or reject source conflicts, merges, splits, aliases, and lifecycle changes.
- Placeholder: mark Buyer Visibility Status Hidden or Visible where authorized.
- Placeholder: view or update image-readiness dependency state where Device Catalog tracks the gating signal.
- Placeholder: request buyer device export/download.
- Placeholder: manage buyer device portfolio references if this module owns the reference contract.
- Placeholder: view audit history for device changes, imports, exports, and portfolio references.

## Phase 1 Import Boundary

- Phase 1 CSV import is System Admin-only.
- Manufacturers, vendors, buyers, and external integrations must not receive self-service import permissions in Phase 1.
- Non-System Admin import attempts should be denied and audited.
- Phase 1 import permission does not imply permission to manage image storage, public image URLs, Media Asset Management, Product Catalog compatibility, Pricing, Order Routing, Fulfillment, or Procurement behavior.

## Tenant Boundaries

- Canonical device records may be platform-wide, but buyer-visible, export, portfolio, and audit access must be evaluated against Tenant Company tenant scope, role, entity access, relationship eligibility, and regional eligibility where applicable.
- Buyer export permissions must not allow one buyer, parent company, or child entity to infer another buyer's portfolio, export activity, or eligibility state.
- Manufacturer or integration actors should be scoped to their authorized source systems and records in future phases.
- Device Reference lookup for downstream modules should avoid exposing tenant-specific state unless the request is tenant-scoped and authorized.

## Admin Overrides

- Placeholder: define who may override normalization conflicts, duplicate detection, merge/split decisions, lifecycle states, import row validation, visibility gating, image-readiness gating, and export blocks.
- Placeholder: every override should include scope, reason, approver, expiration or review interval, affected records, and audit metadata.
- Placeholder: admin override should not bypass Tenant Company permissions or buyer relationship eligibility unless a separate approved exception exists in the owning context.
- Placeholder: System Admin may mark a future Launch Date device Visible only through an audited visibility change.

## Audit Requirements

- Placeholder: audit device create, update, merge, split, retire, restore, import, export, and portfolio reference changes.
- Placeholder: audit Phase 1 CSV import attempts, denied import attempts, mode selection, header validation failures, row validation failures, corrections, created records, updated records, visibility changes, and image-readiness dependency changes.
- Placeholder: audit denied access, denied export, failed import, and failed event publication.
- Placeholder: audit actor, source, tenant scope, changed fields, previous reference, successor reference, and reason where applicable.
- Placeholder: define audit retention and who may view audit entries for manufacturer, buyer, admin, and integration actions.

## My Devices Portfolio Change Authority Notes

This section documents authority notes for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. All authority decisions flow through Tenant Company `check_access` per existing baseline. **This PR introduces NO new tenant capabilities, NO new role bundles, and NO new service identity profiles.** The existing Tenant Company buyer / company / entity capability set is sufficient.

### Authority discipline (locked)

- Tenant Company `check_access` is the canonical authority surface for all Device Catalog My Devices portfolio actions:
  - Add device to portfolio (buyer / admin per existing buyer / company / entity capabilities).
  - Remove device from portfolio (buyer / admin per existing capabilities).
  - Update / deactivate / supersede / correct device reference (buyer / admin per existing capabilities; some operations may be admin-only per existing baseline).
  - Bulk portfolio import (typically admin or service identity per existing baseline).
  - Read portfolio snapshot / change records (buyer / admin per existing capabilities).
- Buyer-facing actions use existing buyer / company / entity capabilities.
- Admin actions (admin-on-behalf changes) use existing Tenant Company act-on-behalf authority per existing baseline.
- Service identity actions (scheduled sync, integration-driven import) use existing Tenant API integration user authority.
- Lifecycle blocking applies per existing PR #103 baseline (suspended / pending / inactive cannot initiate portfolio changes).
- All authority decisions are logged via existing Logs & Audit PR-D hardened Audit Access Record discipline.

### Tenant Company `audit_export.*` non-use (locked)

Device Catalog MUST NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for My Devices portfolio actions unless future Tenant / Device capability coordination explicitly says so. Rationale identical to Product Catalog `audit_export.*` non-use: `audit_export.*` governs COMPLIANCE / audit report exports per Logs & Audit PR-E Audit Report Export Record; My Devices portfolio actions are buyer-facing operational surfaces with different consumer and authority.

This boundary is locked here and in `boundary-contracts.md`. Future Tenant / Device capability coordination MAY introduce explicit portfolio-specific capabilities (e.g., `buyer_device_portfolio.read`, `buyer_device_portfolio.modify`); NOT in this PR.

### Lifecycle blocking (existing baseline applies)

- Active actor + active target: normal evaluation.
- Suspended actor: cannot initiate portfolio changes (add / remove / update / deactivate / supersede / correct / bulk import).
- Pending Setup actor: cannot initiate portfolio changes.
- Inactive actor: cannot initiate portfolio changes.
- Suspended target company in admin-on-behalf scenarios: blocked unless CIXCI System Admin override applies per existing PR #103 baseline.
- Inactive target: actor MAY access historical portfolio snapshots / change records per existing baseline lifecycle blocking rules.

### Service identity authority

- Service identity portfolio changes: use existing Tenant API integration user authority per existing baseline.
- Service identity portfolio changes require registered scope and expiring credentials.
- Service identity portfolio changes are logged via existing Logs & Audit discipline.
- Service identity portfolio changes do NOT use `service_identity.audit_export` (which is for compliance audit report exports per PR #103); they use existing Tenant API integration user authority for buyer / company / entity scope.

### Admin-on-behalf authority

- Admin-on-behalf portfolio changes require Tenant Company act-on-behalf authority per existing baseline.
- Open business decision: whether explicit buyer consent is required IN ADDITION to act-on-behalf authority for projection-affecting My Devices changes; default per PR #103: act-on-behalf sufficient unless tenant policy requires explicit consent.
- Admin-on-behalf changes are logged via existing Logs & Audit discipline with `actor_reference` recorded.
- The `admin_on_behalf_change` discriminator value on `change_type` MAY be used to surface admin-initiated changes distinctly; alternatively, the specific add/remove/update type with `actor_reference` set to admin and `change_source = admin_on_behalf` is used. Implementation owns the convention.

### Capability propagation latency

- Capability changes during in-flight portfolio operations are governed by existing PR #103 Workflow 12 discipline.
- Next `check_access` call re-evaluates current capability assignment.
- Concrete propagation latency is implementation.

### Bulk portfolio import authority

- Bulk imports (CSV per `phase-1-csv-import.md` or API per existing baseline) require appropriate authority per existing baseline.
- This PR does NOT modify `phase-1-csv-import.md` authority semantics.
- Bulk imports produce a single Buyer Device Portfolio Change Record with `change_type = bulk_portfolio_import`.

### Snapshot / change record read authority

- Buyer / admin / service identity can read their own (or their scope's) Buyer Device Portfolio Snapshots and Change Records per existing buyer / company / entity capability assignments.
- Cross-buyer reads are architecturally impossible.
- Admin access via System Admin Buyer Context for projection view is governed by Product Catalog Workflow 12 (System Admin Buyer Context Compatibility Projection); the underlying snapshot read still flows through existing Device Catalog authority.

### What this permissions section intentionally does NOT introduce

- No new audit capabilities.
- No new buyer-facing capabilities.
- No new role bundles.
- No new service identity profiles.
- No use of `audit_export.*` for portfolio actions.
- No new tenant-scoped permission structures.
- No concrete permission UI or admin assignment flow.
- No modifications to existing Device Catalog authority discipline.
- No modifications to `phase-1-csv-import.md` authority semantics.
- No buyer-scope triad enforcement at the permissions layer beyond what existing Tenant Company `check_access` already provides. The buyer-scope triad is enforced at the DATA-MODEL layer in `data-model.md`; the permissions layer enforces who can add / remove / update / read.
