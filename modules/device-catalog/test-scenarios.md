# Device Catalog Test Scenarios

## Functional Scenarios

- Create a canonical Device Master Record from a manufacturer or integration source record.
- System Admin imports new devices through Phase 1 CSV import mode.
- System Admin updates existing devices through Phase 1 CSV update mode.
- Validate Phase 1 CSV header exact field names and exact order.
- Validate Phase 1 row-level required fields, recognized manufacturer, controlled Device Type, valid Launch Date, uniqueness/matching, and compatibility-preparation fields.
- Resolve a Device Reference by identifier for Product Catalog compatibility mapping use.
- Update manufacturer, brand, model, variant, taxonomy, lifecycle, launch, release, or discontinued metadata.
- Merge duplicate device records and preserve predecessor reference behavior.
- Split one device record into multiple variants and publish successor reference information.
- Export authorized buyer-visible device data.
- Create and remove a buyer device portfolio reference if this module owns the reference contract.

## Phase 1 CSV Validation Scenarios

- CSV with exact required headers in exact order passes header validation.
- CSV with missing, extra, duplicate, misspelled, or incorrectly ordered headers fails before row processing.
- Import New Devices creates a device when Manufacturer + Device Model + Device Type does not match an existing device.
- Import New Devices rejects or routes to correction when the uniqueness key already exists.
- Update Existing Devices updates a device when Manufacturer + Device Model + Device Type matches exactly one existing device case-insensitively.
- Update Existing Devices rejects or routes to correction when no matching device exists.
- Update Existing Devices rejects or routes to correction when multiple ambiguous matches exist.
- Future Launch Date device imports as Active system status but Hidden Buyer Visibility Status.
- Device remains absent from All Devices and My Devices until image readiness and buyer visibility are both satisfied.

## Permission Scenarios

- Authorized Device Catalog Admin can approve a normalization conflict.
- System Admin can submit Phase 1 CSV import and view validation results.
- Non-System Admin cannot submit Phase 1 CSV import.
- Manufacturer, vendor, buyer, or external integration cannot self-service import devices in Phase 1.
- Buyer Export Actor can request export only for authorized buyer/company/entity scope.
- Product Catalog service can resolve Device References without seeing buyer-specific export or portfolio state.
- Manufacturer Integration Actor cannot modify records outside its authorized source scope.
- Unauthorized caller cannot view source record metadata or audit history.

## Tenant Isolation Scenarios

- Buyer A export activity is not visible to Buyer B.
- Parent and child entity eligibility differences are respected for export and portfolio reference operations.
- Region-specific eligibility from Tenant Company blocks or marks device export as review-required without changing canonical device data.
- Shared Device Reference remains platform-wide while buyer portfolio references remain tenant-scoped.
- Buyer Visibility Status and image-readiness gating do not leak tenant-specific My Devices state across buyers.

## Integration Scenarios

- API import succeeds and emits device import and device change events.
- CSV fallback import partially fails and records failed rows for review.
- Phase 1 CSV import emits validation-failed, correction-required, completed, or failed events as appropriate.
- Internal image upload flow marks image readiness and enables downstream visibility gating.
- Product Catalog receives a Device Reference lifecycle event and can refresh compatibility mappings.
- Product Catalog or future Compatibility Authority receives Compatibility Markers without Device Catalog deciding accessory compatibility.
- Analytics consumes device lifecycle events without becoming source-of-truth for device data.
- Future Procurement request references a Device Reference while procurement approval and status remain outside Device Catalog.

## Regression Scenarios

- A merge does not break existing Product Catalog compatibility mappings without a defined predecessor/successor path.
- A split does not expose unauthorized buyer portfolio or export state.
- A retired device remains available for historical references where required.
- Replayed import or event messages do not create duplicate canonical records, aliases, exports, or portfolio references.
- Phase 1 duplicate import submission does not create duplicate devices.
- Phase 1 update mode does not create new devices when matching fails.
- Device Catalog API changes preserve Device Reference contract versioning for downstream modules.

## Feature Evidence Import and Review Workflow Scenarios (PR-B)

Lightweight architecture / review scenarios for PR-B's six workflows. These are state assertions and contract-shape scenarios, not implementation test cases. Implementation tests for each workflow are deferred to developer-owned test suites.

### Two-Layer Structure Preservation

1. Every Compatibility Marker is captured as a separate record from any Device Feature Assignment it eventually produces. Approving a Suggested Normalization does not collapse the marker into the assignment; both records persist with cross-references.

2. Every Suggested Normalization is a separate record from the Device Feature Assignment it eventually produces (if approved). Approving the Suggested Normalization transitions the Suggested Normalization to `approved` *and* creates / updates the Device Feature Assignment; the two records remain distinct.

3. A rejected Suggested Normalization does not produce a Device Feature Assignment. The underlying Compatibility Marker remains in `pending_normalization` (or transitions to `normalization_unmappable` per workflow rules).

4. The chain Raw CSV -> Compatibility Marker -> Suggested Normalization -> Device Feature Assignment -> Device Capability Evidence -> Product Catalog accessory compatibility is never short-circuited in the workflow.

### Workflow 1 - Phase 1 CSV Import

5. CSV upload with malformed UTF-8 BOM in the first header row fails header validation (platform standard); row validation does not run.

6. CSV upload with required header missing fails header validation; the import surfaces the missing header to the System Admin.

7. CSV upload with an unrecognized header is rejected by the strict Catalog contract; the import surfaces the unrecognized header.

8. CSV upload with a deprecated header before its removal date produces warning; commit allowed.

9. CSV upload with a deprecated header after its removal date produces error; commit blocked.

10. Header validation passes; row validation runs per row.

11. Row with missing Device identifier blocks the row; commit excludes the row.

12. Row with Date / Time field with ambiguous format routes to review per platform standard.

13. Row with a Direct Feature Group column populated produces a candidate Compatibility Marker at preview; commit captures the marker.

14. Row with the Compatibility Markers column populated produces one or more candidate Compatibility Markers per the Master Device Import Template separator convention.

15. Row with a Direct Feature Group column populated *and* the Compatibility Markers column populated produces one candidate Compatibility Marker from each; markers do not interact.

16. Excluded rows do not commit any state (per PR #78 pattern; PR-B preserves).

17. Preview is marked `informational_only`; downstream consumers must not treat preview state as commit.

18. Pre-commit events do not trigger Device Capability Evidence regeneration (Workflow 5).

19. Pre-commit events do not raise the compatibility-impacting review signal (Workflow 6).

20. The confirmation-request state (pre-commit confirmation intent) is pre-commit and does not produce feature truth.

21. The confirmed import commit state (post-commit import confirmation) is post-commit; regeneration may trigger for affected Devices.

22. Cancelling an import after preview does not produce Compatibility Markers, Suggested Normalizations, or any other persistent record beyond the cancelled import job audit.

23. Pre-commit validation runs again at commit gate to detect drift since preview (e.g., a Feature Value retired between preview and confirmation).

24. Pre-commit validation failure at commit gate blocks commit; the System Admin is returned to correction state.

### Workflow 2 - Compatibility Marker Normalization

25. A Compatibility Marker in `pending_normalization` may have zero, one, or multiple Suggested Normalizations.

26. Multiple Suggested Normalizations for the same Compatibility Marker do not produce ambiguity by themselves; the System Admin reviews each and approves at most one.

27. A System-Admin-proposed Suggested Normalization (`system_admin_proposal`) requires the same approval action as any other source before producing a Device Feature Assignment.

28. An automated-rule-proposed Suggested Normalization (`automated_rule_proposal`) requires explicit System Admin approval before producing a Device Feature Assignment. Auto-approval is not enabled.

29. Approving a Suggested Normalization transitions the marker to `normalization_approved`, transitions the Suggested Normalization to `approved`, and produces / updates the Device Feature Assignment with `assignment_source = compatibility_marker_normalization`.

30. Rejecting a Suggested Normalization transitions the Suggested Normalization to `rejected`; the marker is not affected unless other rules apply.

31. If a marker has multiple proposals and the System Admin approves one then approves a second, the first transitions to `superseded`.

32. Applicability check against Device Capability Profile: if the Profile marks the proposed Feature Group as `required` or `optional`, the assignment is permitted without override.

33. Applicability check: if the Profile marks the proposed Feature Group as `unsupported`, the assignment requires Override Discipline (Case 2 - Profile mismatch override) or routes to Data Quality Exception.

34. Applicability check: if the Profile marks the proposed Feature Group as `review_required`, the assignment is permitted but commit produces a Data Quality Exception alongside.

35. Applicability check: if the Device's Device Type has no populated Capability Profile (PR-A OQ 1 deferred content), the applicability check returns "no applicable Profile rule"; assignment is permitted without applicability gating.

36. Conflict check: if the Device already has an active Device Feature Assignment for the proposed Feature Group, approving the new normalization supersedes the prior assignment with full before / after audit.

37. Approval audit reference is required; transition to `approved` fails without it.

38. Retired Feature Value referenced in a Suggested Normalization blocks approval without Override Discipline (Case 1 - retired Feature Value override).

39. Deprecated Feature Value referenced produces warning; approval permitted without override; commit may produce a Data Quality Exception per source rule.

### Workflow 3 - Feature Value Creation Through Import / Review

40. New Feature Values may be created only by an actor holding Feature Taxonomy Authority. Authority check via Tenant Company `check_access`.

41. New Feature Groups are not creatable through PR-B's import flow. If an imported value cannot map to any existing Feature Group, the row routes to Data Quality Exception (`unmappable_compatibility_marker`).

42. Creating a new Feature Value requires: actor, reason, source import row / job reference, before / after, timestamp, audit reference. Missing any of these blocks creation.

43. A new Feature Value may not be created in a `deprecated` or `retired` Feature Group; the parent must be `active`.

44. A new Feature Value with a key colliding with an existing Feature Value in the same parent Feature Group is rejected (uniqueness rule from PR-A `data-model.md`).

45. A new Feature Value is created with state `active` in PR-B's import flow (not `draft`; PR-B's import flow does not include a `draft -> active` curation cycle).

46. Feature Value creation produces audit per `permissions.md` Feature Taxonomy Authority requirements. Audit references the import job, the import row, the originating Compatibility Marker, and the action's reason.

47. Unknown imported values do not auto-create Feature Values. The System Admin must explicitly invoke creation; the raw value alone is not creation evidence.

48. After a new Feature Value is created, the System Admin may use it in a Suggested Normalization. The two actions are sequential: creation first, then normalization approval.

### Workflow 4 - Data Quality Exception Lifecycle

49. A Data Quality Exception is created with `created` state. Subject references are populated per applicability (Device, Feature Group, Feature Value, marker, assignment, evidence, import job, import row).

50. Exception transitions `created -> under_review` on explicit System Admin acknowledgement.

51. Correction actions during `under_review` produce history entries (actor, timestamp, action type, affected entity, before / after, audit reference) but do not transition the exception out of `under_review`.

52. The exception remains in `under_review` until explicit closure (`resolved` / `dismissed` / `unresolved`).

53. `corrected` is never a persistent lifecycle state. Implementations that model `corrected` as state violate the discipline.

54. Resolution requires `resolution_action_reference`; transition `under_review -> resolved` fails without it.

55. Dismissal requires `dismissal_reason_reference`; transition `under_review -> dismissed` fails without it.

56. Unresolved closure requires `unresolved_override_audit_reference` per Override Discipline (Case 3). Transition `under_review -> unresolved` fails without complete override evidence (`OVERRIDE_AUDIT_EVIDENCE_MISSING`).

57. Reopening a terminal-state exception to `under_review` preserves history and requires reopen reason reference.

58. An exception may be `resolved` with zero correction history entries (e.g., when the underlying issue resolved itself - a deprecated value was retired, eliminating the conflict).

59. An exception with multiple correction history entries may still be closed as `dismissed` if the corrections turned out unnecessary (false-positive determination).

60. Reopening preserves prior correction history; correction history is append-only.

61. Direct closure from `created` to `dismissed` or `unresolved` (bypassing `under_review`) is permitted but discouraged; requires the same evidence as the equivalent `under_review ->` transition.

### Workflow 5 - Device Capability Evidence Regeneration

62. Regeneration is post-commit only. Preview workflows do not produce Device Capability Evidence records or transition regeneration state.

63. Regeneration trigger fires for each Device whose Device Feature Assignment was changed in a commit.

64. Regeneration outcome is one of `success`, `failure`, `partial_success`.

65. `outcome = success` produces a new Device Capability Evidence record; the prior evidence is superseded.

66. `outcome = failure` does not produce a new evidence record; the prior evidence is marked `stale` or `unknown` per source-rule; a Data Quality Exception of category `device_capability_evidence_regeneration_failed` is created.

67. `outcome = partial_success` updates the evidence record for succeeded Feature Groups; per-Feature-Group Data Quality Exceptions are created for failures.

68. A zero-change regeneration (no feature evidence changed since prior regeneration) does not raise the compatibility-impacting review signal.

69. Regeneration audit is produced regardless of outcome.

70. Regeneration failure does not block subsequent regeneration attempts for the same Device.

71. Regeneration triggered by Compatibility Marker normalization commit (Workflow 2 -> Workflow 5) succeeds in normal case; the new assignment is reflected in updated evidence.

72. Regeneration triggered by Feature Value lifecycle transition (e.g., a Feature Value was retired) re-evaluates `assignment_status` for affected Devices; assignments referencing the retired value transition to `retired_value_referenced` status.

### Workflow 6 - Compatibility-Impacting Review Signal

73. The signal is raised by Device Catalog. Device Catalog is the producer.

74. The signal is consumed by Product Catalog read-only. Product Catalog is the consumer.

75. The signal is raised only on `outcome = success` or `outcome = partial_success` regenerations where consumer-safety-affecting changes occurred.

76. The signal is *not* raised on `outcome = failure` regenerations by default. The Data Quality Exception captures the failure.

77. `outcome = failure` may raise the signal only with Override Discipline (Case 5 - regeneration failure continuation override) and explicit audit evidence.

78. The signal's consumer-safety rule errs on the side of raising in doubt. Product Catalog filters / ignores signals it doesn't care about.

79. Device Catalog does not maintain a list of "Product-Catalog-filtered Feature Groups." The rule is generic.

80. Device Catalog does not directly mutate Product Catalog state. The signal is one-way (Device Catalog -> Product Catalog). No return signal from Product Catalog.

81. Product Catalog is unavailable at signal-raise time: the transport-layer concern (delivery / retry) is Integration Management's; PR-B does not contract retry behavior. Device Catalog records the raise-attempt audit reference.

82. PR-B does not name the signal as an event, contract its payload, or define transport semantics. PR-C territory.

83. Use of the phrase "compatibility-impacting review signal" is consistent throughout the spec. Shortening to "the review signal" is permitted only when context is unambiguous.

### Cross-Workflow and Override Discipline

84. Override Discipline applies to five named cases. The mechanism is identical across cases (actor / reason / timestamp / affected entity / before / after / audit reference).

85. Missing override evidence triggers `OVERRIDE_AUDIT_EVIDENCE_MISSING` validation; the override is rejected.

86. Retired Feature Value override (Case 1) permits a Device Feature Assignment to be created referencing a retired value; the assignment carries the override audit reference and may produce a Data Quality Exception alongside.

87. Profile mismatch override (Case 2) permits an assignment in an `unsupported` Feature Group; the assignment carries the override audit reference.

88. Unresolved acceptance override (Case 3) permits a Data Quality Exception to close as `unresolved`; the exception carries the override audit reference.

89. Force-commit with warnings override (Case 4) is a process-level override; the import job carries the override audit reference.

90. Regeneration failure continuation override (Case 5) permits the compatibility-impacting review signal to be raised despite `outcome = failure`; the signal carries the override audit reference.

91. Overrides are not chained automatically. Each override is an independent action with independent evidence.

### Authority and Permission Discipline

92. Feature Taxonomy Authority is required for Feature Value creation, Feature Group lifecycle action, Feature Value lifecycle action, Device Capability Profile update.

93. Device Feature Assignment / Correction Authority is required for Suggested Normalization approval / rejection, Device Feature Assignment creation / update / supersession / withdrawal, Data Quality Exception lifecycle transition.

94. Both authority classes route to CIXCI System Admin in Phase 1.

95. No new Resolution Authority class is introduced in PR-B (PR-A OQ 4 resolved: use existing Assignment Authority).

96. Authority checks consult Tenant Company `check_access` per PR-A `permissions.md`.

97. Buyers cannot perform any of the above actions (PR-A explicit exclusion preserved).

98. Product Catalog cannot perform any of the above actions (PR-A explicit exclusion preserved).

### Boundary Discipline (preserved from PR-A; PR-B specifics)

99. Compatibility Markers are not consumed by Product Catalog as authoritative compatibility evidence (PR-A normative; PR-B preserved).

100. Suggested Normalizations are not consumed by Product Catalog (PR-B internal).

101. Suggested Normalizations are not consumed by any other module (PR-B internal-only).

102. Data Quality Exception references are consumed by Product Catalog read-only; Product Catalog does not transition exception state.

103. Override audit references are produced by Device Catalog and consumed by Logs & Audit. Product Catalog does not consume override audit references.

104. The compatibility-impacting review signal is the *only* compatibility-related signal Device Catalog raises in PR-B. PR-B does not raise other named signals.

105. Device Catalog does not mutate Product Catalog state under any workflow path. All compatibility-impacting changes flow through the signal; Product Catalog decides.

106. Device Catalog does not consult Product Catalog before raising the signal. Product Catalog's downstream decisions are Product Catalog's own.

### Phase 1 Reaffirmations

107. Manufacturer / distributor / API ingestion is not enabled. `manufacturer_api` and `distributor_api` `assignment_source` values are reserved but not produced.

108. AI Agent Services is not consulted in Phase 1 PR-B workflows. `automated_rule_proposal` is a non-AI automation source.

109. Auto-approval of Suggested Normalizations is not enabled.

110. Buyers do not interact with PR-B workflows through any surface.

### What PR-B Does NOT Do

111. PR-B does not introduce API contracts (covered by the contracts/signals layer).

112. PR-B does not introduce OpenAPI schemas.

113. PR-B does not introduce event names (covered by the contracts/signals layer).

114. PR-B does not introduce event payload contracts (covered by the contracts/signals layer).

115. PR-B does not introduce transport / broker / idempotency / replay / retry semantics (covered by the contracts/signals layer and Integration Management boundaries).

116. PR-B does not modify Product Catalog files.

117. PR-B does not modify Tenant Company files.

118. PR-B does not modify downstream module specs, ADRs, platform standards, code, schema, migrations, or runtime files.

119. PR-B does not invent Device Capability Profile content (PR-A OQ 1 deferred).

120. PR-B does not specify Data Quality Exception retention, notification routing, or SLA / escalation (PR-B OQ 1, OQ 2, OQ 3, OQ 4 deferred).

## Feature Evidence Contracts and Signals Scenarios (PR-C)

Lightweight architecture / review scenarios for PR-C's contract / signal layer. These are state assertions and contract-shape scenarios, not implementation tests. Implementation tests are developer-owned.

### Event naming discipline

1. All 20 PR-C event names follow the pattern `device.<entity>.<verb-past-tense>`. Examples: `device.feature-group.created`, `device.feature-value.retired`, `device.capability-evidence.regenerated`.

2. PR-C does not rename any legacy Device Catalog event name. Legacy events (e.g., `device.import.validation-failed`, `device.buyer-portfolio.changed`) remain in the taxonomy unchanged.

3. PR-C does not deprecate or replace any legacy event name. PR-C is additive only.

4. PR-C does not introduce events that collide with legacy event names by spelling or by concern. If a collision exists (theoretical - none expected), PR-C application stops before commit.

5. The compatibility-impacting review signal event is named `device.compatibility-impacting-review-signal.raised` (not `device.compatibility-impacting-review.raised`) to preserve PR-B terminology consistency.

### Reference-first payload discipline

6. Every PR-C event payload carries entity references, not embedded entity content. Example: `device.feature-group.updated` carries `featureGroupReference`, `version`, `sourceHash`, `priorState`, `currentState` - not the Feature Group's display label, description, or full audit history.

7. Consumers wanting full entity content read it via PR-C `api-contracts.md` placeholders. The event payload alone is not sufficient for full state reconstruction.

8. The compatibility-impacting review signal payload (`device.compatibility-impacting-review-signal.raised`) carries `changedFeatureGroupReferences` and `changedFeatureValueReferences` as references, plus a `categoricalDelta` summary - not embedded Feature Group or Feature Value content.

9. No PR-C event payload embeds full Device Capability Evidence snapshots. Evidence content is retrieved via API (Placeholder 2).

10. No PR-C event payload embeds full Data Quality Exception history (correction action history). Exception detail is retrieved via API (Placeholder 4a System Admin scope).

### Raw Compatibility Marker non-exposure

11. No PR-C event payload carries raw Compatibility Marker values. Markers are Device Catalog-internal ingestion artifacts per PR-A and PR-B.

12. The compatibility-impacting review signal does not surface raw markers, even when the underlying assignment change originated from a marker normalization.

13. The Device Feature Assignment lookup API (Placeholder 3) does not return raw Compatibility Marker content. It may return a marker reference identifier for audit correlation, but not the raw cell value or unnormalized form.

14. Audit consumers querying Logs & Audit may read raw marker content; that is Logs & Audit scope, not Device Catalog API scope. PR-C surfaces do not expose markers.

### Buyer portfolio and tenant eligibility non-leakage

15. All PR-C events are `internal` redaction class. None are `buyer_scoped` or `tenant_scoped`.

16. No PR-C event payload includes buyer portfolio references, Buyer Device Portfolio Reference content, or buyer-specific identifiers.

17. No PR-C event payload includes tenant-specific eligibility content (e.g., "Tenant T may consume this Device"). Eligibility is enforced at the consumer side via `check_access` consultation, not via event payload.

18. If a future event needs buyer-portfolio context, it must declare `buyer_scoped` redaction class and be handled by transport with explicit buyer-scope enforcement. PR-C does not enable any `buyer_scoped` event.

### `consumerActionHint` advisory discipline

19. The `consumerActionHint` field on the compatibility-impacting review signal is advisory. Allowed values: `no_action_expected`, `review_recommended`, `review_required_for_consumer_safety`.

20. `review_required_for_consumer_safety` does not legally require Product Catalog to review. It indicates Device Catalog's strongest expectation of consumer-safety impact, which Product Catalog may verify or disregard.

21. A signal may carry no hint or `no_action_expected`; consumers may still elect to act.

22. Device Catalog does not consume `consumerActionHint` acknowledgement. Whether Product Catalog acts on a hint is Product Catalog's internal state.

23. The hint is not a command. PR-C does not introduce any field named `action_required`, `command`, `mandate`, or similar command-style metadata.

### No Product Catalog command semantics

24. The compatibility-impacting review signal does not carry Product Catalog state. No accessory compatibility mappings, buyer-visible accessory lists, newly-compatible indicators, or blocked export / readiness flags appear in the signal payload.

25. PR-C does not introduce a "Device Catalog instructs Product Catalog" API path. Placeholder 5b (acknowledgement) is explicitly architecture-level only with no command endpoint.

26. Product Catalog decides accessory mapping, buyer-visible accessory list, newly compatible indicator, and blocked export / readiness impacts. Device Catalog does not.

27. Device Catalog does not mutate Product Catalog state via any PR-C event or API. The signal is one-way.

28. No PR-C event family raises a return signal from Product Catalog to Device Catalog. Product Catalog's downstream decisions are recorded in Product Catalog's own state.

### Idempotency / replay / retry expectations stay architecture-level

29. `eventId` is the consumer-side dedup key. Consumers processing the same `eventId` twice should treat redelivery as no-op.

30. PR-C does not contract producer-side dedup. Producers may emit duplicates under transport failure or retry conditions; consumers absorb redelivery.

31. PR-C does not contract strict-ordering delivery. Consumers absorb out-of-order events using `eventVersion`, `occurredAt`, and entity `version` fields.

32. PR-C does not contract replay windows, replay-on-demand authorization, or replay retention. These are Integration Management / platform broker concerns.

33. PR-C does not contract retry tuning (max attempts, backoff strategy, dead-letter routing). Integration Management concern.

34. Transport failure during event emission does not roll back the originating state transition. The transition is recorded in Logs & Audit; emission failure is logged via observability.

### Read-only API placeholders

35. All five PR-C API placeholders are read-only. None mutate feature truth.

36. Feature taxonomy lookup (Placeholder 1) returns taxonomy state at read time. It does not modify Feature Group, Feature Value, or Device Capability Profile records. Mutation is Feature Taxonomy Authority workflow surface per PR-B.

37. Device Capability Evidence retrieval (Placeholder 2) returns derived evidence at read time. It does not trigger regeneration. Regeneration is PR-B Workflow 5 territory.

38. Device Feature Assignment lookup (Placeholder 3) returns assignment records at read time. It does not create, update, withdraw, or supersede assignments. Mutation is PR-B Workflow 2 territory.

39. Data Quality Exception lookup (Placeholder 4) returns exception records at read time. It does not transition exception state. Lifecycle transitions are PR-B Workflow 4 territory.

40. Compatibility-impacting review signal read model (Placeholder 5a) returns historical or current signal records at read time. It does not raise signals. Raising is PR-B Workflow 6 territory.

### Acknowledgement remains transport-layer

41. PR-C does not expose a command-style acknowledgement endpoint. There is no PR-C API path for "Product Catalog tells Device Catalog it has consumed the signal."

42. Acknowledgement, if implemented, is at the broker / Integration Management layer. The broker consumes acknowledgement to remove the message from the consumer's queue. Device Catalog does not consume the acknowledgement.

43. Product Catalog acknowledgement does not command Device Catalog behavior.

44. Product Catalog acknowledgement does not tell Device Catalog what Product Catalog will do downstream.

45. PR-C event payloads do not include an "acknowledgement-required" field, "expected-consumer-response" field, or similar command-style metadata.

### Product Catalog consumption boundary preserved

46. Product Catalog consumes PR-C events read-only. Product Catalog does not write to Device Catalog's feature taxonomy, assignments, evidence, or exceptions in response to events.

47. Product Catalog consumes PR-C APIs read-only. Product Catalog does not have a PR-C API path that mutates Device Catalog state.

48. Product Catalog decides whether accessory compatibility mappings, buyer-visible accessory lists, newly compatible indicators, or blocked export / readiness states need updates. These decisions are recorded in Product Catalog's own state.

49. Device Catalog does not consult Product Catalog before raising the compatibility-impacting review signal. The consumer-safety determination is Device Catalog's.

50. PR-A boundary discipline (Device Catalog owns device feature truth; Product Catalog owns accessory compatibility assertions) is preserved across all PR-C event names, payload shapes, and API placeholders.

## My Devices Portfolio Test Scenarios

This section adds architecture-level acceptance scenarios for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Product Catalog side has matching scenarios in `modules/product-catalog/test-scenarios.md`. All existing Device Catalog baseline scenarios are preserved without modification.

### Scenario format

Each scenario is architectural; concrete request / response shapes, error codes, and timings are out of scope. Scenarios assert observable state transitions, event emission, evidence emission, boundary enforcement, and consumer outcomes.

---

### Buyer Device Portfolio Snapshot creation

- A buyer with two active devices has a Buyer Device Portfolio Snapshot with `active_device_references` containing exactly those two devices, `inactive_device_references` empty (or containing prior inactive entries), `snapshot_timestamp` populated.
- Buyer-scope triad is REQUIRED on every snapshot.
- An Evidence Record is emitted with evidence kind `buyer_device_portfolio_snapshot`.

### Buyer Device Portfolio Change Record creation

- Every portfolio-affecting operation produces a Buyer Device Portfolio Change Record.
- The Change Record carries `change_type` (one of 8), `prior_portfolio_snapshot_reference`, `new_portfolio_snapshot_reference`, `affected_device_references`, `change_source`, and either `actor_reference` or `service_trigger_reference`.
- An Evidence Record is emitted with evidence kind `buyer_device_portfolio_change`.

### Device added scenario (Workflow 1)

- Buyer adds device D to portfolio.
- Change Record created with `change_type = device_added`, `affected_device_references = [D]`.
- New Snapshot created with D in `active_device_references`.
- Buyer Device Portfolio Reference for D: `active_flag = true`, `change_source = buyer_action` (or appropriate), `last_change_timestamp` updated, `current_portfolio_snapshot_reference` points to new snapshot.
- Event `device-catalog.my-devices.portfolio-changed` emitted with `change_type = device_added`.
- Product Catalog consumes; Workflow 4 triggers projection recalculation.

### Device removed scenario (Workflow 2)

- Buyer removes device D.
- Change Record created with `change_type = device_removed`, `affected_device_references = [D]`.
- New Snapshot created without D in `active_device_references` (D may appear in `inactive_device_references`).
- Buyer Device Portfolio Reference for D: `active_flag = false`.
- Event emitted with `change_type = device_removed`.
- Product Catalog consumes; produces Buyer Accessory Compatibility Impact Records for activated accessories per its Workflow 6.
- **Device Catalog does NOT decide commercial state.** Buyer Selling Status is NOT auto-transitioned by Device Catalog.

### Device updated scenario (Workflow 3 - compatibility-relevant)

- Buyer updates device D's compatibility-relevant field (e.g., firmware variant).
- Change Record created with `change_type = device_updated`.
- New Snapshot created.
- Event emitted.
- Product Catalog determines the update is compatibility-relevant and triggers Workflow 4.

### Device updated scenario (Workflow 3 - not compatibility-relevant)

- Buyer updates device D's non-compatibility-relevant field (e.g., friendly name label).
- Change Record created with `change_type = device_updated`.
- New Snapshot created (because the snapshot includes the updated entry).
- Event emitted (Device Catalog ALWAYS emits on portfolio change; Product Catalog decides whether to recalculate).
- Product Catalog determines the update is NOT compatibility-relevant and MAY skip recalculation.

### Device deactivated scenario (Workflow 3)

- Device D deactivated; `active_flag = false`.
- Change Record at `change_type = device_deactivated`.
- Equivalent to remove for Product Catalog projection purposes.
- Product Catalog produces impact records for affected activated accessories.

### Device superseded scenario (Workflow 3)

- Device D superseded by device D' (existing Device Catalog baseline supersession mechanism).
- Change Record at `change_type = device_superseded`; `affected_device_references` includes both D and D'.
- New Snapshot reflects supersession (D in `superseded_device_references`; D' in `active_device_references` if appropriate per existing baseline).
- Event emitted.
- Product Catalog recalculates against the successor's compatibility profile; impact records produced where the profile differs.

### Device reference corrected scenario (Workflow 3)

- Device reference for an entry is corrected (e.g., wrong variant originally assigned).
- Change Record at `change_type = device_reference_corrected`; `affected_device_references` includes both prior and corrected references.
- New Snapshot reflects the corrected reference.
- Event emitted.
- Product Catalog recalculates if the corrected reference points to a device with a different compatibility profile.

### Bulk portfolio import scenario (Workflow 3)

- Admin imports 50 devices for buyer B (via existing CSV per `phase-1-csv-import.md` or existing API).
- ONE Change Record created with `change_type = bulk_portfolio_import`; `affected_device_references` lists all 50.
- ONE new Snapshot created.
- Event emitted ONCE with `change_type = bulk_portfolio_import`.
- Product Catalog Workflow 4 runs ONCE per snapshot (NOT per device); recalculation produces one projection version supersession.

### Admin-on-behalf scenario (Workflow 1, 2, or 3)

- Admin makes a portfolio change on behalf of buyer per Tenant Company act-on-behalf authority.
- Change Record carries `change_source = admin_on_behalf` and `actor_reference` set to admin.
- Implementation MAY use `change_type = admin_on_behalf_change` discriminator OR use the specific add/remove/update type with `change_source = admin_on_behalf`.
- Event emitted.
- Product Catalog recalculates; for low-confidence cases (e.g., bulk admin-on-behalf), Product Catalog routes to `projection_status = review_required`.

### Service identity sync scenario (Workflow 1, 2, or 3)

- Service identity (e.g., Tenant API integration user) syncs portfolio changes from an external source.
- Change Record carries `change_source = service_identity_sync` and `service_trigger_reference`.
- Event emitted.
- Product Catalog recalculates.

### Empty portfolio scenario

- Buyer with zero active devices.
- Buyer Device Portfolio Snapshot exists with empty `active_device_references`.
- Product Catalog produces a valid empty-portfolio projection per its Workflow 11.

### Cross-buyer non-interference

- Buyer 1 adds device D to portfolio.
- Buyer 2's portfolio snapshots and change records are UNCHANGED.
- The same device D may appear in Buyer 1's portfolio and Buyer 2's portfolio (or only one or neither) independently.

### Canonical Device record preservation

- A portfolio change (add / remove / update / deactivate / supersede / correct / bulk) does NOT mutate the canonical Device record or Device Reference.
- Canonical Device records remain Device-Catalog-owned and unmutated.

### Append-only Change Record discipline

- Buyer Device Portfolio Change Records are append-only.
- Removing a device produces a NEW Change Record at `change_type = device_removed`; it does NOT delete prior `device_added` Change Records for the same device.
- Historical Change Records remain referenceable for evidence.

### Snapshot supersession

- Each new Snapshot's `prior_snapshot_reference` points to the previous Snapshot.
- Prior Snapshots remain referenceable for evidence (specifically: Buyer Accessory Compatibility Impact Records may reference Snapshots from the past via `triggering_buyer_device_portfolio_change_record_reference`).

### Lifecycle blocking

- Suspended buyer attempting to add a device: `check_access` denies; no Change Record created.
- Pending Setup buyer: cannot initiate portfolio changes.
- Inactive target company in admin-on-behalf scenarios: blocked per existing PR #103 baseline.

### `audit_export.*` non-use

- Adding a device: existing buyer / company / entity capabilities consulted; `audit_export.*` NOT consulted, NOT consumed.
- Bulk import via service identity: existing Tenant API integration user authority consulted; `audit_export.*` NOT consulted.

### Evidence emission (cross-reference Workflow 13)

- Every Snapshot creation emits `buyer_device_portfolio_snapshot` evidence.
- Every Change Record creation emits `buyer_device_portfolio_change` evidence.
- Both via existing `service_identity.evidence_emit` discipline.
- Logs & Audit indexes per PR-A; retention applies per PR-D.

### Event-record consistency

- Every Change Record has a corresponding `portfolio-changed` event.
- Every event payload references the Change Record ID and the new snapshot ID.
- No information loss between record and event.

### Discriminator-based subscriber routing

- Product Catalog subscribes to ALL `change_type` values; triggers Workflow 4.
- Future Notification Platform consumers MAY subscribe to specific `change_type` values.
- Subscribers handle unknown discriminator values gracefully.

### Idempotency

- Same add request submitted twice: implementation owns idempotency (e.g., reject duplicate by idempotency_key, or no-op if device already active). Architectural intent: idempotent per existing baseline.

### Re-parenting deferred

- A buyer entity re-parenting under a different company (existing PR #103 OQ-PC-2 deferred): portfolio / snapshot / change record handling governed by existing deferred discipline; not locked here.

### What this scenario set intentionally does NOT lock

- Concrete numeric snapshot retention / archival policy.
- Concrete numeric Change Record retention beyond existing PR-D retention discipline.
- Concrete bulk import batching numerics.
- Concrete API request / response shapes.
- Concrete UI surfaces.
- Concrete propagation latency for `portfolio-changed` events to Product Catalog.
- Concrete idempotency cache shape, TTL.
- AI-Agent-initiated change scenarios (future PR).
- Re-parented buyer portfolio scenarios (existing deferred discipline).
- Modifications to `phase-1-csv-import.md` semantics (out of scope).
