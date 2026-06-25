# Device Catalog Workflows

## Primary Workflows

### Phase 1 System Admin CSV Device Import

1. System Admin selects Phase 1 import mode: Import New Devices or Update Existing Devices.
2. System Admin uploads a CSV using the exact Phase 1 template.
3. Device Catalog validates headers before row processing: exact fields, exact order, no missing fields, no extra fields, and no duplicate fields.
4. Device Catalog validates rows for required fields, recognized manufacturer, controlled Device Type values, valid Launch Date, mode-specific uniqueness/matching rules, and compatibility-preparation fields.
5. Device Catalog applies Phase 1 uniqueness using Manufacturer + Device Model + Device Type with case-insensitive matching.
6. For Import New Devices, matching existing devices should be rejected or routed to correction.
7. For Update Existing Devices, rows that do not match exactly one existing device should be rejected or routed to correction.
8. Accepted imported devices receive system status Active.
9. Buyer Visibility Status remains separate as Hidden or Visible. Future Launch Date devices remain Hidden by default unless a System Admin marks them Visible.
10. Device Catalog records import job, validation, correction, log, and audit records.
11. Device Catalog emits import and device change events where required.

### Device Import

1. Manufacturer, distributor, or API ingestion remains a future-facing placeholder and is not a Phase 1 enabled workflow.
2. Device Catalog validates required identifiers, source metadata, taxonomy hints, lifecycle fields, and source authority placeholders.
3. Device Catalog compares submitted data with existing Device Master Records, identifiers, and aliases.
4. Device Catalog creates, updates, queues for review, or rejects records according to proposal-level validation rules.
5. Device Catalog emits import and device change events where required.

Phase 1 exception: CSV import is System Admin-only and does not grant manufacturer, vendor, buyer, or external integration self-service import.

### Device Image Readiness For Buyer Visibility

1. Device image is uploaded through a separate internal image upload flow.
2. Device Catalog records or consumes image readiness status needed for buyer visibility gating.
3. Device remains excluded from All Devices and My Devices until image readiness is satisfied and buyer visibility is enabled.
4. Device Catalog must not create public image URL requirements in Phase 1.
5. Media Management owns image upload, processing, validation, storage, matching, renditions, media audit, public image URL policy, transformations, CDN behavior, approval, and rights.

### Device Normalization And Reference Resolution

1. Device Catalog receives or detects a potential duplicate, alias, merge, split, or conflicting source record.
2. Normalization workflow evaluates manufacturer, brand, model, variant, carrier, region, identifier, and lifecycle data.
3. Confirmed changes update Device Master Records and Device References.
4. Downstream modules receive reference change events or must refresh through lookup APIs.

### Buyer Device Export

1. Authorized caller requests a device export for a buyer, parent company, child entity, or relationship scope.
2. Device Catalog checks Tenant Company scope, role, relationship, and regional eligibility signals.
3. Device Catalog produces a buyer-exportable device dataset or asynchronous export record.
4. Buyer-facing modules own buyer UX/state where applicable.
5. Device Catalog logs export activity and emits export completion or failure events.

### Buyer Device Portfolio Reference

1. Authorized caller links a buyer scope to a Device Reference.
2. Device Catalog validates the Device Reference and Tenant Company scope signals.
3. Device Catalog records the Buyer Device Portfolio Reference.
4. Buyer-facing modules manage screen behavior, layout, filters, empty states, display behavior, UX/state, and any buyer workflow tasks.

### Future Purchase Order Device Reference

1. Future Procurement / Purchase Orders requests or stores Device References for manufacturer purchase order workflows.
2. Device Catalog resolves canonical device references and lifecycle status.
3. Procurement owns purchase order creation, approval, submission, status, invoice, and reconciliation behavior.

## Alternate Flows

- Placeholder: source data matches an existing alias and requires no canonical update.
- Placeholder: source data conflicts with an existing canonical record and requires manual review.
- Placeholder: Phase 1 CSV row fails validation and is routed to correction without changing canonical records.
- Placeholder: Phase 1 import is accepted with partial success if business rules allow partial commit.
- Placeholder: buyer export request is accepted asynchronously because the dataset is large.
- Placeholder: Device Reference is retired, merged, or split after Product Catalog has compatibility mappings.
- Placeholder: manufacturer source data is incomplete but can be staged pending enrichment.

## Failure Flows

- Phase 1 header validation fails due to missing, extra, duplicate, misspelled, or incorrectly ordered fields.
- Phase 1 row validation fails due to missing required values, unrecognized manufacturer, invalid Device Type, invalid Launch Date, duplicate match, no match in update mode, or ambiguous match.
- Phase 1 compatibility-preparation fields are missing or malformed.
- Import correction is abandoned, rejected, or superseded by a later upload.
- Import validation fails due to missing identifiers, invalid hierarchy, or unsupported taxonomy.
- Normalization conflict cannot be resolved automatically.
- Tenant Company scope or relationship eligibility check fails for export.
- Export generation fails after acceptance.
- Event delivery fails and requires retry, dead-letter processing, or manual review.
- Downstream module requests an unknown, retired, merged, or split Device Reference.

## Operational Notes

- Phase 1 CSV import should be treated as an admin-controlled operational workflow. It does not enable manufacturer, distributor, or API ingestion.
- Manufacturer, distributor, and API ingestion should remain future-facing placeholders until a later approved design defines source authority, approval, validation, and audit boundaries.
- Header validation should complete before row-level validation.
- Import jobs should record submitted file reference, mode, actor, row counts, validation results, created/updated counts, rejected counts, correction history, log references, and audit references.
- Canonical device correction, merge, and split workflows need strong audit history because downstream references may be long-lived.
- Buyer export workflows need throttling and asynchronous handling for large datasets.
- Device Reference changes should be communicated in a way Product Catalog can process without requiring Device Catalog to own accessory compatibility decisions.

## Feature Evidence Import and Review Workflows (PR-B)

PR-B introduces six interlocking workflows that govern how Phase 1 System Admin CSV import and review turns raw compatibility-related fields into governed Device Catalog feature evidence. These workflows operate on entities defined in `data-model.md` (PR-A Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence; PR-B Compatibility Marker full entity, Suggested Normalization, Data Quality Exception full entity, Device Capability Evidence Regeneration). All workflows preserve the PR-A boundary discipline:

- Imported values are not feature truth.
- Approved normalized assignments become feature truth.
- Product Catalog compatibility is downstream interpretation, not Device Catalog-owned compatibility logic.
- Device Catalog owns device feature truth; Product Catalog owns accessory compatibility assertions.
- Device Catalog does not mutate Product Catalog. The compatibility-impacting review signal is one-way: Device Catalog raises, Product Catalog consumes and decides.

The six workflows are tightly coupled. PR-B does not split them into separate PRs because the coupling would create drift if defined separately. They are sequenced below in order of operational dependency.

The workflows are:

1. **Phase 1 CSV Import** - preview, validate, correct, confirm, commit. Covers header validation, row validation, capture of Compatibility Markers, and pre-commit / post-commit discipline.
2. **Compatibility Marker normalization** - suggest, review, approve, commit. The bridge between raw ingestion artifacts and feature truth.
3. **Feature Value creation through import / review** - when an imported value is unmapped and no existing Feature Value fits, the controlled flow for creating a new Feature Value, gated on Feature Taxonomy Authority.
4. **Data Quality Exception lifecycle** - created, under review, resolved, dismissed, unresolved (with `corrected` as auditable history rather than persistent state).
5. **Device Capability Evidence regeneration** - post-commit derivation of the consumer-facing view from underlying assignments and Profile applicability.
6. **Compatibility-impacting review signal** - raised by Device Catalog after Device Capability Evidence changes; consumed by Product Catalog read-only.

---

### Workflow 1 - Phase 1 CSV Import

**Purpose:** Capture device feature data from CIXCI System Admin CSV imports into auditable artifacts, run validation, allow human correction, and commit only after explicit System Admin confirmation.

**Pre-commit phase (no downstream side effects):**

1. **CSV upload and identification.** System Admin uploads a CSV file. The import job is created with `pending_validation` state per the platform standard `import-export-validation-governance.md`. No Device Catalog records are written.

2. **Header validation.** Per the platform standard. Required headers must be present. Recognized headers must match the Master Device Import Template version. Unrecognized headers are rejected by the strict Catalog contract. Deprecated headers produce warning before removal date, error after. PR-B does not define the Master Device Import Template content; that lives in `phase-1-csv-import.md`. Header validation failures block row validation per platform standard.

3. **Row validation.** Per row:
   - Device identification (per row's identifier columns) - required; row blocks if missing or unresolvable.
   - Date / time field validation per platform standard.
   - Feature-Group-related field capture: for each row column that corresponds to a known Feature Group or to a Compatibility Markers field, a candidate Compatibility Marker is identified for capture (capture itself happens at confirmation, not at validation).
   - Cross-field validation: Device Type required (per `data-model.md`); other cross-field rules per `phase-1-csv-import.md`.
   - Locked field protection per platform standard.

4. **Preview generation.** The import preview shows:
   - Per-row validation status (error / warning / review-required / pass).
   - Candidate Compatibility Markers per row (raw values that would be captured on confirmation).
   - **Suggested Normalizations per Compatibility Marker (proposal only; not committed).** Suggestions may come from `system_admin_proposal`, `automated_rule_proposal`, or `prior_history_proposal` per `data-model.md` Suggested Normalization. Preview is marked `informational_only` per PR #78 / PR #81 pattern.
   - Proposed Device Feature Assignment impact (would-be assignments if all suggested normalizations were approved).
   - Proposed Device Capability Evidence impact (would-be regeneration outcome).
   - Proposed Data Quality Exception impact (would-be exceptions for missing required features per Profile, retired-value references, unmappable markers, conflicts).
   - **No downstream consumer is triggered during preview.** No Product Catalog signal is raised. No Device Capability Evidence record is updated. No Device Feature Assignment is created.

5. **Correction.** System Admin may, within the preview / correction state:
   - Mark rows as excluded (rows are removed from the commit reference per PR #78 pattern).
   - Edit row values inline where the platform standard allows.
   - Approve or reject Suggested Normalizations (proposals stay attached to markers; approval / rejection is recorded as Suggested Normalization state transition; the marker is not committed until the import is confirmed).
   - Propose new Suggested Normalizations for markers that have none (System-Admin-proposed, per `data-model.md`).
   - Trigger a Feature Value creation flow for markers whose intended value does not exist in the controlled taxonomy (see Workflow 3).
   - Refresh validation after corrections.

6. **Confirmation request.** System Admin records pre-commit confirmation intent (a confirmation-request state; PR-C will contract the corresponding event). The platform records the confirmation intent; no commit has occurred. **The `informational_only` flag remains until commit; downstream consumers must not treat confirmation-request state as commit signal.**

7. **Commit gate.** Pre-commit validation runs again to detect drift since preview (e.g., a Feature Value was retired between preview and confirmation). Pre-commit validation failures block commit.

**Commit phase:**

8. **Commit.** Excluded rows are removed from the commit reference. For each remaining row:
   - Compatibility Markers are persisted from `pending_normalization` state (per `data-model.md`).
   - Approved Suggested Normalizations transition to `approved`, producing or updating the corresponding Device Feature Assignment.
   - Unapproved Suggested Normalizations remain `proposed`; their markers remain `pending_normalization` or transition to `normalization_unmappable` per validation rules.
   - Rows where markers have no Suggested Normalization at all and the field was required produce a Data Quality Exception of category `missing_required_feature_data` or `unmappable_compatibility_marker` (per source rule).
   - Rows where markers reference retired Feature Values produce Data Quality Exceptions of category `retired_feature_value_referenced`, unless override evidence per Override Discipline (see Workflow 3 and `permissions.md`).

**Post-commit phase:**

9. **Trigger regeneration.** For each Device whose Device Feature Assignment was changed by this commit, the Device Capability Evidence regeneration workflow is invoked (Workflow 5).

10. **Trigger compatibility-impacting review signal evaluation.** After regeneration completes, Workflow 6 determines whether the change warrants raising the review signal per consumer-safety rule.

11. **Trigger exception evaluation.** For each Data Quality Exception created at commit, Workflow 4 begins lifecycle.

12. **Audit reference.** The import job records its full audit trail per platform standard.

**Discipline (preserved from PR-A and PR #78):**

- Pre-commit events do not trigger downstream consumers.
- Excluded rows do not commit any state.
- Preview is informational only; downstream consumers must honor the `informational_only` flag.
- Sale-price / pricing fields are not in scope for Device Catalog CSV imports. (Pricing is Product-Catalog-side.)

---

### Workflow 2 - Compatibility Marker Normalization

**Purpose:** Transform Compatibility Markers (raw ingestion artifacts) into governed Device Feature Assignments (feature truth), via Suggested Normalizations (proposals) that require explicit System Admin approval.

**Trigger:** A Compatibility Marker has been captured during preview (or already exists in `pending_normalization` state from a prior import). Normalization may be invoked during the import preview workflow (Workflow 1 step 4-5), during standalone review (System Admin opens a queue of unnormalized markers), or as part of Data Quality Exception correction (Workflow 4).

**Steps:**

1. **Suggestion generation.** For a Compatibility Marker in `pending_normalization`, zero or more Suggested Normalizations may be proposed:
   - By a System Admin manually (`system_admin_proposal`).
   - By an automated rule, where the marker's raw value or hint matches a known Feature Group + Feature Value tuple (`automated_rule_proposal`).
   - Reserved: by `prior_history_proposal` (suggested based on prior approved normalizations for similar markers). Not enabled in PR-B Phase 1.
   - A marker may receive multiple suggestions across these sources. Multiple suggestions for the same marker do not produce ambiguity automatically - they produce a Suggested Normalization per proposal.

2. **Suggestion review.** Each Suggested Normalization is reviewable by System Admin. Review includes:
   - The marker's raw value, source field, target Device, import row reference.
   - The Suggested Normalization's proposed Feature Group + Feature Value tuple.
   - Validation context: whether the proposed tuple is valid against the Device's Device Capability Profile (Workflow 2 applicability check).
   - Conflict context: whether the Device already has a Device Feature Assignment for the proposed Feature Group, and if so, what the current assignment is.

3. **Applicability check.** The proposed Feature Group is checked against the Device's Device Capability Profile (from `data-model.md`):
   - Profile says `required` or `optional` for this Feature Group -> applicability allows the assignment.
   - Profile says `unsupported` -> assignment requires Override Discipline (Device Capability Profile mismatch override) or the suggestion is routed to Data Quality Exception of category `device_capability_profile_mismatch_review_required`.
   - Profile says `review_required` -> suggestion is permitted but routes through review (the Suggested Normalization is flagged; commit produces a Data Quality Exception alongside the assignment for tracking).
   - **Profile content not yet populated for this Device Type (PR-A OQ 1 deferral):** Applicability check returns "no applicable Profile rule"; the assignment is permitted without applicability gating. PR-B's applicability-driven validation rules activate only when Profile content exists.

4. **Conflict check.** If the target Device already has an active Device Feature Assignment for the proposed Feature Group:
   - Approving the new normalization will supersede the prior assignment per `data-model.md` Device Feature Assignment lifecycle.
   - Workflow records the supersession as part of approval, including before / after audit.

5. **Approval action.** A System Admin holding Device Feature Assignment / Correction Authority approves a Suggested Normalization. The approval action requires:
   - Actor reference.
   - Approval timestamp.
   - Approval audit reference per `permissions.md`.
   - Override reference, if applicable (e.g., when approving over a `unsupported` Profile, over a retired Feature Value, or over an existing conflicting assignment).
   - Approval transitions the Suggested Normalization to `approved` and, on commit (if the workflow is running inside the CSV import commit phase), produces or updates the Device Feature Assignment with `assignment_source = compatibility_marker_normalization`.

6. **Rejection action.** A System Admin may reject a Suggested Normalization. Rejection requires actor, timestamp, rejection reason reference. The marker remains in `pending_normalization` (or transitions to `normalization_unmappable` if no other suggestions exist and no further proposals are forthcoming, per workflow context).

7. **No-suggestion case.** If a Compatibility Marker has no Suggested Normalization after preview/review concludes, and the marker's source field was required-for-Profile, the marker transitions to `normalization_unmappable` on commit and produces a Data Quality Exception of category `unmappable_compatibility_marker`.

**Discipline:**

- A Suggested Normalization is not feature truth. It is a proposal.
- Approval of a Suggested Normalization is the act that produces feature truth. Approval requires explicit System Admin action and audit reference.
- Automated suggestion (`automated_rule_proposal`) does not produce feature truth without approval. Auto-approval is not enabled in PR-B Phase 1.
- A marker with multiple suggestions may have at most one approved at any time. Approving a second suggestion for the same marker supersedes the first.

---

### Workflow 3 - Feature Value Creation Through Import / Review

**Purpose:** Allow CIXCI System Admin to create new controlled Feature Values during the import / review flow when an imported value does not match any existing Feature Value and a suitable Feature Group already exists.

**Discipline (per scoping decision):**

- New Feature Values may be created **only** by an actor holding Feature Taxonomy Authority per `permissions.md`. Phase 1 routes this to CIXCI System Admin.
- New Feature Groups are **exceptional.** Row-level quick creation of Feature Groups is not permitted. If an imported value cannot map to any existing Feature Group at all, the row routes to Data Quality Exception (`unmappable_compatibility_marker`) and the System Admin must address the Feature Group gap separately via the standalone Feature Taxonomy Authority workflow (not part of PR-B's import flow). PR-B is not the workflow that creates new Feature Groups; PR-B only references the gating.
- **Unknown values must never auto-publish as feature truth.** A value that does not match any existing Feature Value cannot become a Device Feature Assignment until either (a) the System Admin maps it to an existing Feature Value via Suggested Normalization approval, or (b) the System Admin creates a new Feature Value via the explicit creation flow below and then approves a Suggested Normalization referencing the new value.

**Steps:**

1. **Trigger.** During Compatibility Marker review (Workflow 2 step 2), the System Admin determines that the marker's intended value is not currently a Feature Value in the proposed Feature Group's Feature Value set.

2. **Create Feature Value action.** The System Admin invokes the Feature Value creation flow. The action requires:
   - Actor reference (must hold Feature Taxonomy Authority per `permissions.md`).
   - Target Feature Group reference (must exist and be `active`).
   - Proposed `feature_value_key` (lowercase snake_case per `data-model.md`, syntax rules deferred per PR-A OQ 5).
   - Proposed `display_label`.
   - Reason reference - why this value needs to exist.
   - Source import row / job reference - what import surfaced the need.
   - Before / after - for tracking what the imported raw value was vs. the controlled key being created.
   - Timestamp.
   - Audit reference per platform standard.

3. **Validation.**
   - Feature Group must be `active` (not `draft`, `deprecated`, or `retired`).
   - Proposed key must not collide with an existing Feature Value key within the same Feature Group (per `data-model.md` uniqueness rule).
   - Proposed key must satisfy key syntax rules (PR-A OQ 5 deferred - until rules are normalized, the validation is liberal but the action still requires audit).
   - Actor authority check via Tenant Company `check_access` per `permissions.md`.

4. **Creation.** On validation pass, a new Feature Value record is created with state `active` (PR-B's import flow creates values directly in `active` because they're being created in response to immediate need; a `draft` -> `active` flow for taxonomy curation is out of scope for PR-B and remains within the standalone Feature Taxonomy Authority workflow).

5. **Use in Suggested Normalization.** The new Feature Value reference is immediately available to the Suggested Normalization the System Admin was reviewing. The System Admin may now propose / approve a normalization referencing the new value.

6. **Audit.** The Feature Value creation produces audit per `permissions.md` Feature Taxonomy Authority audit requirements. The audit entry references the import job, the import row, the originating Compatibility Marker, and the action's reason.

**Discipline:**

- A new Feature Value may not be created in a `deprecated` or `retired` Feature Group.
- A new Feature Value may not be created where its proposed key conflicts with an existing Feature Value.
- Raw Compatibility Markers do not become Feature Values automatically. The System Admin must explicitly invoke creation; the raw value alone does not constitute creation evidence.
- Feature Value creation is not a side effect of approval. The System Admin must create the Feature Value *before* approving a Suggested Normalization that references it.

---

### Workflow 4 - Data Quality Exception Lifecycle

**Purpose:** Manage Data Quality Exceptions from creation through resolution, dismissal, or unresolved closure, with `corrected` as auditable history rather than persistent lifecycle state.

**Steps:**

1. **Creation.** A Data Quality Exception is created by:
   - A Phase 1 CSV import commit that detected an unresolvable condition (Workflow 1 step 8).
   - A Device Capability Evidence regeneration that failed or produced partial-success (Workflow 5).
   - A direct System Admin action (e.g., flagging a known-bad assignment for review).
   - Created exceptions enter `created` state with full subject references per `data-model.md`.

2. **Acknowledgement.** A System Admin transitions a `created` exception to `under_review` by explicitly acknowledging it. The transition records: actor, timestamp, acknowledgement audit reference.

3. **Correction actions (auditable history, not persistent state).** While in `under_review`, the System Admin may apply zero or more correction actions:
   - Approve a Suggested Normalization for the affected marker.
   - Create a new Feature Value (Workflow 3) and then approve a Suggested Normalization.
   - Supersede the affected Device Feature Assignment via a corrected assignment.
   - Update or supersede the affected Feature Value (Feature Taxonomy Authority).
   - Trigger a Device Capability Evidence regeneration retry.
   - Apply an override (Override Discipline per `permissions.md`).
   - Each correction action is recorded in the exception's history with: actor, timestamp, action type, affected entity references, before / after, audit reference.
   - **The exception remains in `under_review` after correction actions.** Applying a correction does not transition the exception out of `under_review`. The exception is closed only by explicit `resolved`, `dismissed`, or `unresolved` action.

4. **Resolution.** When the System Admin verifies that the underlying issue is fixed, they transition the exception to `resolved`. The transition requires:
   - Actor reference.
   - Timestamp.
   - `resolution_action_reference` - pointer to the correction(s) in history that fixed the underlying issue.
   - Audit reference.

5. **Dismissal.** If the System Admin determines the exception was a false positive or otherwise not actionable, they transition to `dismissed`. Requires:
   - Actor.
   - Timestamp.
   - `dismissal_reason_reference` (PR-B OQ 7 on structured vs. freeform).
   - Audit reference.

6. **Unresolved closure.** If the System Admin determines the underlying data is degraded but the exception cannot be fixed and must be accepted, they transition to `unresolved`. Requires Override Discipline per `permissions.md`:
   - Actor.
   - Reason.
   - Timestamp.
   - `unresolved_override_audit_reference` - required; transition fails without it.
   - Affected entity references.
   - Before / after where applicable.

7. **Reopening.** A terminal-state exception (`resolved`, `dismissed`, or `unresolved`) may be reopened to `under_review` by explicit System Admin action. Reopening preserves the full history. Reopen requires: actor, timestamp, reopen reason reference, audit reference. Reopening is a normal-discipline action, not an override.

**Discipline:**

- `corrected` is **never a persistent lifecycle state.** It is a history action.
- Closure requires explicit terminal-state action; correction alone does not close the exception.
- An exception with zero correction history may still be `resolved` (when the underlying issue resolved itself, e.g., a deprecated value was retired and the exception is no longer applicable).
- An exception may have correction history without being `resolved` (e.g., a correction was applied but later determined insufficient).
- Reopening preserves history; it does not erase prior correction actions.

**Boundary preservation:**

- Product Catalog consumes Data Quality Exception references read-only as part of Device Capability Evidence consumption (per PR-A).
- Device Catalog does not consult Product Catalog when transitioning exception state. Product Catalog's downstream interpretation is its own; Device Catalog's exception lifecycle is internal.

---

### Workflow 5 - Device Capability Evidence Regeneration

**Purpose:** Recompute Device Capability Evidence for a Device after underlying changes, post-commit only, with explicit failure handling.

**Triggers (post-commit; one of):**

- New or updated Device Feature Assignment for the Device.
- Feature Value creation or mapping approval that affects the Device.
- Feature Group or Feature Value lifecycle transition (deprecation, retirement, supersession) that affects the Device.
- Compatibility Marker normalization commit that produces or updates an assignment for the Device.
- Data Quality Exception resolution that changes feature evidence for the Device.

**Pre-commit discipline:**

Preview workflows may compute *proposed* evidence impact (e.g., "if you approve all suggestions, the Device's evidence would become X"). Proposed-impact computations are display-only:

- Do not produce Device Capability Evidence records.
- Do not transition Device Capability Evidence Regeneration state.
- Do not raise the compatibility-impacting review signal.
- Are marked `informational_only`.

**Steps (post-commit):**

1. **Regeneration trigger.** A commit event surfaces; the Device is identified for regeneration. A Device Capability Evidence Regeneration record is created in `pending` state (operational state; full enumeration left to implementation).

2. **Derivation.** The regeneration reads:
   - All `active` Device Feature Assignments for the Device.
   - The Device's Device Type and its Device Capability Profile (if Profile content exists for the Device Type - see PR-A OQ 1 deferral).
   - Current Feature Group and Feature Value lifecycle states for all referenced taxonomy entities.

3. **Evidence assembly.** For each Feature Group referenced in the Device's Profile (or, if Profile content not populated, for each Feature Group the Device has assignments for), the new Device Capability Evidence record carries:
   - `applicability` - from Profile, or `optional` when Profile content not populated.
   - `assignment_status` - per `data-model.md` enumeration (`assigned`, `missing`, `unsupported_but_assigned`, `review_required_assigned`, `superseded_value_referenced`, `retired_value_referenced`).
   - `current_feature_value_references` - for `assigned` status.
   - `assignment_reference` - the Device Feature Assignment(s).
   - `freshness_state` - `current` for newly regenerated evidence.

4. **Outcome.** The regeneration completes with one of:
   - **`success`** - full evidence record produced; prior evidence superseded. The Device Capability Evidence Regeneration record records `outcome = success` with audit reference.
   - **`failure`** - derivation failed entirely (e.g., upstream entity reference broken, data store error). Device Capability Evidence is marked `stale` or `unknown` per source-rule. A Data Quality Exception of category `device_capability_evidence_regeneration_failed` is created.
   - **`partial_success`** - derivation succeeded for some Feature Groups but failed for others. The succeeded portions update the evidence record (with per-Feature-Group `assignment_status` reflecting success or failure). Per-Feature-Group Data Quality Exceptions are created for failures.

5. **Override discipline for continuation.** A `regeneration failure continuation override` (per `permissions.md` Override Discipline) may be applied to allow the workflow to continue downstream signal evaluation despite a failure. This is exceptional and requires full audit evidence.

6. **Compatibility-impacting review signal evaluation (Workflow 6).** Triggered after successful or partial-success regeneration.

7. **Audit.** Every regeneration produces audit regardless of outcome. Failures additionally produce Data Quality Exceptions. Success outcomes that raise the review signal carry a signal-raised audit reference.

**Discipline:**

- Regeneration is post-commit. Preview impact is informational only.
- Regeneration failures do not silently leave Device Capability Evidence in an inconsistent state. The evidence is marked stale / unknown and an exception is created.
- Regeneration may produce zero-change outcomes (no feature evidence changed since prior regeneration). Zero-change outcomes do not raise the review signal.

---

### Workflow 6 - Compatibility-Impacting Review Signal

**Purpose:** Notify downstream consumers (specifically Product Catalog) when Device Capability Evidence changes in a way that may affect their state.

**The compatibility-impacting review signal** is a generic, named-at-concept-level mechanism. PR-B defines the trigger, conceptual payload intent, and consumption boundary. PR-B does **not** define:

- The event name (covered by the contracts/signals layer).
- The event payload contract (covered by the contracts/signals layer).
- The transport / broker semantics (owned by Integration Management and referenced by the contracts/signals layer).
- The idempotency / replay / retry behavior (owned by Integration Management and referenced by the contracts/signals layer).

**Trigger:** A Device Capability Evidence Regeneration with `outcome = success` or `outcome = partial_success` is evaluated for whether the regeneration changed feature evidence in a way consumer-safety-affecting.

**Consumer-safety rule (architecture-level):**

The compatibility-impacting review signal is raised when the regeneration changed any of:

- The set of Feature Values assigned to the Device for any Feature Group that any Product Catalog accessory compatibility assertion currently filters on.
- The `assignment_status` of any Feature Group for the Device, transitioning between `assigned` and any non-`assigned` status, or vice versa.
- The `freshness_state` of the Device Capability Evidence, transitioning to or from `current`.
- The presence or absence of Data Quality Exceptions for the Device that affect feature evidence used in Product Catalog filtering.

The signal is **not** raised when the regeneration was a no-op (no feature evidence changed) or when the only changes are to fields Product Catalog does not consume (e.g., internal audit references).

The exact set of Feature Groups Product Catalog filters on is **not Device-Catalog-owned knowledge.** PR-B does not encode a list of "Product-Catalog-filtered Feature Groups." The consumer-safety rule is stated in terms of *any* Feature Group, leaving Product Catalog to decide for itself which signal occurrences are actionable. The rule errs on the side of raising the signal when in doubt; Product Catalog can ignore signals it does not care about.

**Conceptual payload intent (PR-B describes; PR-C contracts):**

- Device reference (the affected Device).
- Device Capability Evidence reference (the new evidence version).
- Change classification - what changed (e.g., assignment added / removed / changed; status transitioned; exception created / resolved). Categorical, not detailed.
- Audit reference (the regeneration audit entry).

**Consumption boundary (preserved from PR-A; reaffirmed):**

- Product Catalog consumes the signal read-only.
- Product Catalog decides whether accessory compatibility mappings, buyer-visible accessory lists, newly compatible indicators, or blocked export / readiness states need updates. **Device Catalog does not make these decisions.**
- Device Catalog does not directly rewrite Product Catalog compatibility mappings.
- Device Catalog does not directly rewrite Product Catalog buyer visibility.
- Device Catalog does not directly rewrite Product Catalog accessory readiness.
- Device Catalog does not directly rewrite Product Catalog accessory compatibility assertions.
- The signal is one-way (Device Catalog -> Product Catalog). Product Catalog does not raise a signal back; Product Catalog's decisions are recorded in Product Catalog's own state.

**Failure case:** If the compatibility-impacting review signal cannot be raised at the moment of trigger (e.g., Product Catalog consumer is unavailable, signal transport fails), this is a transport-layer concern. PR-B does not define retry semantics; transport reliability is PR-C territory. The Device Catalog side records the regeneration's audit reference; the signal-raised audit reference is recorded once the signal does succeed. If transport never succeeds, that is a transport / Integration Management concern, not a Device Catalog feature-truth concern.

**Discipline:**

- Use the phrase "compatibility-impacting review signal" consistently. Shorten to "the review signal" only when context is unambiguous.
- Do not refer to this signal as an event, event-name, message, or contract-level construct in PR-B language. PR-C will name and contract it.
- The signal is conceptual in PR-B and named-and-contracted in PR-C; the workflow definition in PR-B does not depend on PR-C having landed.

---

## Workflow dependency summary

The six workflows are sequenced as:

```
Workflow 1 (CSV Import)
    +-------- invokes Workflow 2 (Marker Normalization) during preview/correction
    |       +-------- may invoke Workflow 3 (Feature Value Creation) during normalization review
    +-------- on commit, triggers Workflow 5 (Evidence Regeneration) for each changed Device
    |       +-------- on success/partial-success, triggers Workflow 6 (Compatibility-Impacting Review Signal) per consumer-safety rule
    |       +-------- on failure, triggers Workflow 4 (Exception Lifecycle) with category `device_capability_evidence_regeneration_failed`
    +-------- on commit, may directly trigger Workflow 4 (Exception Lifecycle) for unmappable markers, retired-value references, profile mismatches, conflicts
```

Workflow 4 (Exception Lifecycle) can also be triggered independently of CSV import (direct System Admin action). Workflows 2, 3, and 4 may operate outside the CSV import flow when System Admin handles backlog items through a standalone review queue.

## My Devices Portfolio Workflows

This section adds **3 numbered workflows** (Workflows 1, 2, 3) for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. Workflows 4-15 live in `modules/product-catalog/workflows.md`. Total architectural workflows for this Foundation: 15. All existing Device Catalog baseline workflows are preserved without modification.

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

This wording is operationalized in Workflows 1, 2, and 3 below, and reaffirmed in cross-module hand-offs to Product Catalog Workflows 4-15.

---

### Workflow 1 - My Devices Device Added

**Purpose:** record a buyer's My Devices portfolio change when a device is added.

**Steps (architectural):**

1. Receive add request:
   - Buyer-initiated via existing buyer-facing surface.
   - Admin-on-behalf-initiated via Tenant Company act-on-behalf authority.
   - Service-identity-initiated via existing Tenant API integration user authority (e.g., external integration sync).
2. Validate device reference per existing Device Catalog baseline.
3. Validate authority via Tenant Company `check_access`. **Do NOT use `audit_export.*` capabilities.**
4. Apply lifecycle blocking per existing PR #103 baseline (suspended / pending / inactive actors / targets blocked appropriately).
5. Create a Buyer Device Portfolio Change Record:
   - `change_type = device_added` (or `admin_on_behalf_change` per implementation convention; both record `actor_reference`).
   - `change_timestamp` set.
   - `prior_portfolio_snapshot_reference` = current snapshot reference (if any).
   - `affected_device_references` = the single added device.
   - `change_source` populated (`buyer_action` / `admin_on_behalf` / `service_identity_sync` / `system_correction`).
6. Create a new Buyer Device Portfolio Snapshot reflecting the updated portfolio:
   - `active_device_references` updated to include the new device.
   - `snapshot_timestamp` set.
   - `prior_snapshot_reference` populated.
7. Update Buyer Device Portfolio Reference for the affected device: `active_flag = true`; `change_source` recorded; `last_change_timestamp` updated; `current_portfolio_snapshot_reference` updated.
8. Populate `new_portfolio_snapshot_reference` on the Change Record.
9. Emit Logs & Audit Evidence Records via existing `service_identity.evidence_emit`:
   - Evidence kind `buyer_device_portfolio_snapshot` (for the new snapshot).
   - Evidence kind `buyer_device_portfolio_change` (for the change record).
10. Emit `device-catalog.my-devices.portfolio-changed` with `change_type = device_added` discriminator. Payload references the prior + new snapshots and the affected devices.
11. Hand off to Product Catalog Workflow 4 (Buyer-Scoped Compatibility Projection Recalculation; Product Catalog consumes the event).

**Outputs:** Buyer Device Portfolio Change Record at `change_type = device_added`; new Buyer Device Portfolio Snapshot; updated Buyer Device Portfolio Reference; Evidence Records; event emitted.

**Boundary:** **Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.**

### Workflow 2 - My Devices Device Removed

**Purpose:** record a buyer's My Devices portfolio change when a device is removed.

**Steps (architectural):**

1. Receive remove request (buyer / admin-on-behalf / service-identity per Tenant Company authority).
2. Validate the operation per existing Device Catalog baseline.
3. Validate authority via Tenant Company `check_access`. **Do NOT use `audit_export.*` capabilities.**
4. Apply lifecycle blocking per existing PR #103 baseline.
5. Create a Buyer Device Portfolio Change Record:
   - `change_type = device_removed` (or `admin_on_behalf_change` per implementation convention).
   - `change_timestamp` set.
   - `prior_portfolio_snapshot_reference` = current snapshot.
   - `affected_device_references` = the single removed device.
   - `change_source` populated.
6. Create a new Buyer Device Portfolio Snapshot:
   - `active_device_references` updated to exclude the removed device.
   - The removed device may appear in `inactive_device_references` for evidence.
   - `snapshot_timestamp` set; `prior_snapshot_reference` populated.
7. Update Buyer Device Portfolio Reference: `active_flag = false`; `change_source` recorded; `last_change_timestamp` updated; `current_portfolio_snapshot_reference` updated.
8. Populate `new_portfolio_snapshot_reference` on the Change Record.
9. Emit Evidence Records.
10. Emit `device-catalog.my-devices.portfolio-changed` with `change_type = device_removed` discriminator.
11. Hand off to Product Catalog Workflow 4. Product Catalog produces Buyer Accessory Compatibility Impact Records for affected activated accessories per its Workflow 6.
12. **Device Catalog does NOT decide commercial state.** Buyer Selling Status / Accessory Added preservation is governed by Product Catalog per existing PR #104 baseline. **No automatic Stop Selling.**
13. **Removing a device MUST NOT delete historical Buyer Product Export Records, erase Logs & Audit evidence, affect another buyer, or mutate vendor-owned accessory facts or canonical Device Catalog records.** These guarantees are architectural and enforced by:
   - Buyer-scope triad on every portfolio record (cross-buyer impossibility).
   - Append-only change record discipline (no delete).
   - Product Catalog non-mutation boundary (no mutation of vendor-owned accessory facts or canonical Device records by Product Catalog or Device Catalog).
   - Historical Buyer Product Export Record preservation per PR #104.

**Outputs:** Buyer Device Portfolio Change Record at `change_type = device_removed`; new snapshot; updated reference; Evidence Records; event emitted.

**Boundary:** `Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Workflow 3 - My Devices Device Updated / Deactivated / Superseded

**Purpose:** record a buyer's My Devices portfolio change when a device is updated, deactivated, superseded, has its reference corrected, or when many devices change at once.

**Steps (architectural):**

1. Receive change request. Possible change types under this workflow:
   - `device_updated`: existing device entry updated (label / metadata; not necessarily compatibility-relevant).
   - `device_deactivated`: device `active_flag` set to false; equivalent to remove for Product Catalog projection.
   - `device_superseded`: device replaced by a successor device.
   - `device_reference_corrected`: device reference corrected (e.g., wrong variant assigned originally).
   - `bulk_portfolio_import`: many devices changed at once (typically admin or service identity).
2. Validate the operation per existing Device Catalog baseline.
3. Validate authority via Tenant Company `check_access`. **Do NOT use `audit_export.*` capabilities.**
4. Apply lifecycle blocking.
5. Create a Buyer Device Portfolio Change Record with the appropriate `change_type` discriminator:
   - For `device_updated`: Device Catalog determines whether the update is compatibility-relevant; the event is emitted regardless, but Product Catalog may decide not to recalculate per Workflow 4 if not compatibility-relevant.
   - For `device_deactivated`: same Change Record / Snapshot pattern as remove.
   - For `device_superseded`: `affected_device_references` includes both the superseded device and the successor; `change_reason_reference` MAY indicate the supersession.
   - For `device_reference_corrected`: `affected_device_references` includes both the prior reference and the corrected reference.
   - For `bulk_portfolio_import`: ONE Change Record covers the batch; `affected_device_references` lists all affected devices.
6. Create a new Buyer Device Portfolio Snapshot reflecting the net effect of the change.
7. Update Buyer Device Portfolio References for affected devices.
8. Populate `new_portfolio_snapshot_reference` on the Change Record.
9. Emit Evidence Records:
   - For `bulk_portfolio_import`: ONE pair of Evidence Records (snapshot + change) regardless of device count; concrete batching of Evidence Records is implementation per existing PR-A discipline.
10. Emit `device-catalog.my-devices.portfolio-changed` with the appropriate `change_type` discriminator.
11. Hand off to Product Catalog Workflow 4:
   - For `device_updated` not compatibility-relevant: Product Catalog MAY skip recalculation.
   - For `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`: Product Catalog recalculates per its Workflow 4; for low-confidence cases (e.g., bulk admin-on-behalf), Product Catalog MAY route to `projection_status = review_required`.
12. **Device Catalog canonical Device records remain Device-owned and unmutated.** Supersession recognizes the successor device as a separate canonical Device record (existing Device Catalog baseline); Device Catalog does NOT mutate canonical Device records as a side effect of portfolio change.

**Outputs:** Buyer Device Portfolio Change Record at appropriate `change_type`; new snapshot; updated references; Evidence Records; event emitted.

**Boundary:** `Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

---

### Workflow inventory summary (Device Catalog side)

- Existing Device Catalog baseline workflows: preserved.
- **PR additive numbered workflows: 3** (Workflows 1, 2, 3 above).
- Product Catalog side adds Workflows 4-15 (documented in `modules/product-catalog/workflows.md`).
- **Total architectural workflows for this Foundation: 15.**

### Workflows intentionally NOT introduced (Device Catalog side)

- Concrete bulk portfolio import workflow numerics. Implementation.
- Concrete admin-on-behalf consent workflow. Open business decision.
- Concrete service identity scheduled sync workflow. Implementation + Integration Management.
- Concrete UI workflow for adding / removing devices. Future UX.
- Concrete API endpoint workflow for portfolio operations. Future API.
- Automatic Stop Selling on device removal workflow. NOT introduced; locked default; Product Catalog does not auto-transition Selling state.
- Cross-buyer portfolio analytics workflow. Analytics owns BI; NOT in this PR.
- AI-Agent-initiated portfolio change workflow. Future PR when module exists.

### Workflow boundary discipline (this Foundation; Device Catalog side)

- All 3 Device Catalog workflows are owned by Device Catalog.
- All 3 workflows respect Tenant Company `check_access` as the canonical authority surface.
- All 3 workflows respect Logs & Audit as the owner of evidence persistence.
- All 3 workflows respect Notification Platform as the owner of delivery (Device Catalog does NOT emit notification intent directly in this PR; Product Catalog emits compatibility-impact notification intent per its Workflow 14).
- All 3 workflows respect Analytics as the owner of BI / reporting; portfolio change history is NOT a BI dashboard.
- All 3 workflows respect Integration Management as the owner of transport / sync; portfolio changes via external integration are recorded by Device Catalog regardless of transport.
- All 3 workflows respect Product Catalog as the owner of compatibility projection and impact decisions.
- No workflow mutates Product Catalog, Logs & Audit, Tenant Company, Integration Management, Notification Platform records.
- No workflow mutates canonical Device records.
- No workflow uses `audit_export.*` capabilities.
- No workflow creates cross-buyer portfolio state.
- No workflow auto-transitions Selling state to Stop Selling.
- No workflow deletes historical portfolio Change Records (append-only).
- No workflow modifies `phase-1-csv-import.md` (out of scope; existing CSV import path preserved by reference).

### Cleanup wording reaffirmed

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`
