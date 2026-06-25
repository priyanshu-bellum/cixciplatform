# Device Catalog Edge Cases

## Permissions

- Non-System Admin attempts to submit a Phase 1 CSV import.
- Manufacturer, vendor, buyer, or external integration requests self-service import during Phase 1.
- Buyer export request is made by a user with product catalog access but without device export permission.
- Admin can edit canonical device metadata but cannot view buyer-specific export history.
- Manufacturer integration attempts to modify devices outside its source authority.
- Downstream service requests Device Reference detail without tenant scope where tenant-scoped export or portfolio data is involved.

## Tenant Isolation

- Platform-wide canonical device data is visible, but buyer portfolio references and export activity must remain tenant-scoped.
- Parent company and child entity have different regional eligibility for a device export.
- Buyer relationship is approved, but regional eligibility is denied or unresolved.
- Device Reference is shared across tenants, but one tenant has buyer-specific alias, portfolio, or export metadata.
- Buyer Visibility Status or image readiness changes should not expose one buyer's My Devices state to another buyer.

## Phase 1 CSV Import

- Header has correct names but wrong order.
- Header is missing a required field.
- Header contains an extra unsupported field.
- Header contains duplicate fields.
- Header has spelling, whitespace, or casing differences from the required template.
- Row has missing Manufacturer, Device Model, Device Type, or Launch Date.
- Manufacturer is not recognized.
- Device Type is not in the controlled value set.
- Launch Date is invalid, ambiguous, or in an unsupported format.
- Storage Variants, Connectivity, Charger Type, Feature Group, or Compatibility Markers are missing even though future compatibility workflows depend on them.
- Import New Devices row matches an existing device by Manufacturer + Device Model + Device Type.
- Update Existing Devices row matches no existing device.
- Update Existing Devices row matches multiple existing devices because of case-insensitive or alias ambiguity.
- Duplicate rows appear inside the same import file.
- Correction changes a row so it now conflicts with a previously accepted row.

## Device Status / Visibility / Image Readiness

- Phase 1 imported device has system status Active but Buyer Visibility Status Hidden.
- Device has future Launch Date and remains Hidden by default.
- System Admin marks a future Launch Date device Visible before launch.
- Device has buyer visibility enabled but image readiness is not satisfied.
- Device image is uploaded through the internal flow but buyer visibility remains Hidden.
- Device should be excluded from All Devices and My Devices until both image readiness and buyer visibility are satisfied.
- Image readiness event is delayed, duplicated, or revoked after a device became visible.

## Integrations

- Manufacturer source data uses a different model name, identifier, or variant hierarchy than existing records.
- Two external feeds disagree on manufacturer, brand, model, variant, carrier, release date, or discontinued date.
- CSV fallback import contains duplicate identifiers or records already imported through API.
- Device Reference lookup is unavailable when Product Catalog validates compatibility mappings.
- Future compatibility-driven accessory workflow consumes Compatibility Markers but must not treat Device Catalog as compatibility authority.
- Future Procurement references a retired or merged Device Reference during purchase order drafting.

## Reporting

- Analytics needs historical device taxonomy after a device is reclassified.
- Import counts need to distinguish submitted, accepted, rejected, correction-required, created, updated, and skipped rows.
- Export counts need to exclude retries or failed export attempts.
- Merge or split events must preserve historical reporting across predecessor and successor Device References.
- Buyer portfolio reporting must not expose another buyer's portfolio state.

## Data Lifecycle

- Device is announced but not released.
- Device is released in one region but unavailable in another.
- Device is discontinued by manufacturer but still referenced by Product Catalog compatibility mappings.
- Device record is merged after downstream modules already stored the old Device Reference.
- Device record is split into regional or carrier variants after buyer exports were produced.
- Device source record is corrected after buyer export, requiring a decision on whether to notify or regenerate exports.
- Phase 1 import job is superseded by a corrected upload and needs historical audit retention.

## Feature Evidence Import and Review Workflow Edge Cases (PR-B)

Lightweight edge case references for PR-B's six workflows. These supplement (not replace) the platform standard's edge cases for header validation, identifier governance, and date / time handling.

### Phase 1 CSV Import Edge Cases

- **Malformed CSV / header conflict.** Header validation rejects the file; row validation does not run. PR-B inherits the platform standard's edge cases for header parsing (UTF-8 BOM, trailing whitespace, duplicate headers, unrecognized headers) and adds none beyond the platform standard.

- **Direct Feature Group column populated with a value matching multiple Feature Values.** The cell value resolves ambiguously to multiple known Feature Values within the Feature Group. Multiple Suggested Normalizations are proposed (one per candidate); the System Admin must pick one explicitly. If the System Admin attempts to approve multiple for the same marker, only one transitions to `approved`; the others remain `proposed` or are explicitly rejected.

- **Direct Feature Group column populated with a value that maps to a Feature Value in a different Feature Group than the column's `intended_feature_group_hint`.** Example: a `Charger Type` column cell contains "USB-C" which (in a hypothetical taxonomy) also exists as a value in a `Port Type` Feature Group. The hint takes precedence at suggestion time; the System Admin may override by proposing a Suggested Normalization for the other Feature Group manually.

- **Compatibility Markers column with a separator-rich value that produces ambiguous segmentation.** The Master Device Import Template's separator convention is followed; if the cell uses an unrecognized separator, the whole cell becomes a single Compatibility Marker. The System Admin may correct by editing the row in preview / correction state.

- **Same Device referenced by multiple rows in one import.** Each row produces Compatibility Markers per its own cells. Markers from multiple rows for the same Device do not interact during preview; Workflow 5 regeneration at commit consolidates per-Device.

- **Conflicting Feature Values across multiple rows for the same Device.** Row A says the Device has Feature Value X; Row B says the Device has Feature Value Y in the same Feature Group. Pre-commit validation flags the conflict; the System Admin must resolve by approving exactly one Suggested Normalization for the affected Feature Group. Unresolved conflicts at commit produce Data Quality Exception of category `conflicting_feature_values`.

- **Row references a Feature Value that does not exist at preview time but exists at commit time** (because System Admin created the Feature Value during preview via Workflow 3). The preview's validation reflects the Feature Value's existence at preview time; pre-commit re-validation at commit gate confirms the value still exists and is `active`.

- **Row references a Feature Value that exists at preview time but is retired before commit.** Pre-commit re-validation detects the retirement; the row's affected Suggested Normalizations are blocked unless Override Discipline (Case 1) is applied. Without override, commit blocks for the affected rows.

- **CSV upload includes a column whose header matches a Pricing-owned field name.** Platform-standard locked field protection (PR #78 pattern) rejects the column; the entire import fails header validation. PR-B does not introduce Pricing-owned columns; Device Catalog CSV has no Pricing fields.

- **System Admin cancels the import after recording pre-commit confirmation intent.** Pre-commit cancellation (the confirmation-request state is reverted before commit). No Compatibility Markers persist; no Suggested Normalizations persist; no Device Feature Assignment changes occur. The cancelled import job carries audit per platform standard.

### Compatibility Marker Normalization Edge Cases

- **Marker with zero Suggested Normalizations after preview / review.** The marker's source field was not required-for-Profile: the marker transitions to `normalization_unmappable` on commit; Data Quality Exception of category `unmappable_compatibility_marker` is created. The marker's source field was required-for-Profile: same disposition, with the additional context that a `missing_required_feature_data` exception may also be created if no marker for the required Feature Group exists for the Device.

- **Marker with one Suggested Normalization, System Admin rejects.** The Suggested Normalization transitions to `rejected`. The marker remains in `pending_normalization`. If a subsequent normalization workflow run produces a new Suggested Normalization, the cycle repeats. If no further proposals materialize and the workflow concludes, the marker transitions to `normalization_unmappable`.

- **Marker with multiple Suggested Normalizations, System Admin approves one then approves another.** The second approval supersedes the first. Both Suggested Normalizations retain history; only the latest `approved` produces or updates the Device Feature Assignment.

- **Suggested Normalization approved with stale Feature Value reference.** The Feature Value was retired between proposal and approval. Pre-approval re-validation detects the retirement; approval requires Override Discipline (Case 1) or fails.

- **Suggested Normalization references a Feature Value in a Feature Group whose lifecycle transitioned to `retired` between proposal and approval.** The Feature Group is retired; the Feature Value retains its own state, but assignments referencing values in retired groups are blocked. Override Discipline (Case 1 - retired Feature Value override) applies broadly to retired-value references; whether retired-Feature-Group override needs its own case is open (consider PR-B OQ for future Device Catalog amendment).

- **`prior_history_proposal` source - not enabled in Phase 1.** Reserved. If invoked during Phase 1, workflow rejects the proposal as not-applicable-for-Phase-1.

- **`automated_rule_proposal` produces a proposal that matches an existing approved assignment for the same Device + Feature Group exactly.** The proposal is a no-op if approved. Workflow may surface it for review as "no-change" but does not block.

### Feature Value Creation Edge Cases

- **System Admin attempts to create a Feature Value in a `deprecated` Feature Group.** Validation rejects. The System Admin must either restore the Feature Group to `active` (separate Feature Taxonomy Authority action) or route the marker to Data Quality Exception.

- **System Admin attempts to create a Feature Value with a key matching an existing Feature Value in the same parent Feature Group.** Uniqueness check fails; creation is rejected. The System Admin must choose a different key or use the existing Feature Value.

- **System Admin attempts to create a Feature Value with a key matching an existing Feature Value in a *different* Feature Group.** Allowed (key uniqueness is per parent Feature Group, not global). Audit captures the cross-Feature-Group key reuse for visibility.

- **System Admin creates a Feature Value, then before approving any Suggested Normalization, retires the same Feature Value.** Allowed (Feature Taxonomy Authority can retire what it just created). The Suggested Normalization that was waiting on the new value now references a retired value; approval requires Override Discipline (Case 1).

- **System Admin attempts to create a Feature Value without Feature Taxonomy Authority** (e.g., a System Admin whose Tenant Company `check_access` does not grant the class). The authority check fails; creation is rejected for **missing required authority** (Feature Taxonomy Authority required). This is an authority-class failure; it is **not** an Override Discipline failure. The validation rule name is `FEATURE_TAXONOMY_AUTHORITY_REQUIRED` or similar - exact name TBD per `permissions.md`.

- **System Admin attempts to perform an override action (any of the five named cases per `permissions.md`) without complete override evidence** (missing actor, reason, timestamp, affected entity, before / after where applicable, or audit reference). The override action is rejected with `OVERRIDE_AUDIT_EVIDENCE_MISSING`; the underlying standard validation rule is reasserted. This is distinct from the authority-class failure above - the actor may hold the correct authority class but still have the override rejected because audit evidence is incomplete.

- **System Admin creates a Feature Value with `feature_value_key` containing characters outside PR-A OQ 5's deferred syntax rules.** PR-B's validation is liberal (syntax rules not yet normalized). Future syntax-rule normalization may retroactively flag the value; affected Devices may surface in Data Quality Exceptions of a category to be added when rules normalize.

### Data Quality Exception Lifecycle Edge Cases

- **Exception bounces `under_review -> resolved -> under_review -> resolved -> ...`.** Lifecycle thrash. PR-B's reopening preserves history; full history shows the thrash. SLA / escalation (PR-B OQ 4) does not yet backstop. Audit visibility is the discipline.

- **Exception created at CSV commit; never acknowledged.** Remains in `created` state indefinitely. Notification routing (PR-B OQ 3) is the missing piece; PR-B does not auto-acknowledge.

- **Exception closed as `dismissed`, then the underlying issue resurfaces in a later import.** A new Data Quality Exception is created (new identifier, new lifecycle). The prior dismissed exception is unchanged. Cross-exception relationship is implicit (both reference the same Device / Feature Group / Feature Value) but not formally linked. Whether to link related exceptions is open.

- **Exception closed as `unresolved`, then a subsequent action makes the underlying data fixable.** The System Admin may reopen (`unresolved -> under_review`) and pursue resolution. The override audit reference from the original `unresolved` closure remains in history.

- **Correction action applied during `under_review` fails partway through (e.g., approving a Suggested Normalization fails because the underlying Compatibility Marker was concurrently deleted).** The correction action's audit entry records the failure; the exception remains in `under_review`; a new correction action may be attempted.

- **Multiple correction actions applied for the same exception within the same `under_review` session.** Each correction is a separate history entry; the exception remains in `under_review` until explicit closure. The full history is audit-visible.

- **System Admin attempts to close as `resolved` without a `resolution_action_reference`.** Validation rejects. The transition requires explicit pointer to the correction(s) in history.

- **System Admin attempts to close as `unresolved` without complete override evidence.** `OVERRIDE_AUDIT_EVIDENCE_MISSING` validation fires; the override is rejected; the exception remains in `under_review`.

### Device Capability Evidence Regeneration Edge Cases

- **Regeneration triggered but no upstream change actually affects the Device's evidence.** Zero-change regeneration. The Device Capability Evidence record may be re-emitted with a new `evidence_generated_at` but no content change. The compatibility-impacting review signal is *not* raised.

- **Regeneration fails for one Feature Group out of many for the Device.** `outcome = partial_success`. The evidence record is updated for the succeeded Feature Groups; a Data Quality Exception is created for the failed Feature Group; whether the signal is raised depends on whether the failed Feature Group is consumer-safety-affecting (per Workflow 6 rule, the signal may be raised conservatively).

- **Regeneration fails because the Device's Device Capability Profile cannot be located.** `outcome = failure` with a specific cause; a Data Quality Exception of category `device_capability_evidence_regeneration_failed` is created with reference to the missing Profile context. If the Device Type has no Profile content (PR-A OQ 1 deferred), regeneration may proceed without applicability gating (per `workflows.md` Workflow 5) - this is *not* a failure case.

- **Multiple commits within a short time window trigger multiple regenerations for the same Device.** Each commit triggers a regeneration. Whether regenerations can be coalesced (one regeneration covering multiple commits) is an implementation concern not specified by PR-B. From the workflow's perspective, each commit independently triggers; the resulting Device Capability Evidence record reflects the latest state.

- **Regeneration mid-run when upstream taxonomy changes again** (e.g., a Feature Value referenced during evidence assembly is retired between assembly start and assembly end). Implementation-level concurrency concern; PR-B's audit captures the evidence-generation time and the Feature Value version at that moment. Cross-cutting consistency is an implementation responsibility.

- **Stale evidence detection.** Evidence is marked `stale` when underlying taxonomy versions advance without re-running regeneration. Consumers (Product Catalog) read `freshness_state` and may filter / surface accordingly. PR-B does not define a time-based staleness window; staleness is event-driven (taxonomy version change without regeneration).

### Compatibility-Impacting Review Signal Edge Cases

- **Signal raised but Product Catalog is unavailable.** Transport / Integration Management concern. PR-B does not specify retry; Device Catalog's raise-attempt audit reference is recorded. When Product Catalog returns, transport delivers (per PR-C / Integration Management); Product Catalog consumes.

- **Signal raised, Product Catalog consumes, decides not to act.** Product Catalog's downstream decision is recorded in Product Catalog state; Device Catalog is not informed. The cycle ends.

- **Signal raised twice for the same Device Capability Evidence change** (e.g., implementation bug causes duplicate signal raise). Idempotency / replay behavior is PR-C territory. PR-B does not contract duplicate-handling; Product Catalog must be defensive.

- **Signal raised with `outcome = failure` plus regeneration failure continuation override (Case 5).** Product Catalog consumes the signal with the explicit `outcome = failure` indicator and the override audit reference. Product Catalog may interpret this as "the Device's evidence is now in a state where prior compatibility may be incorrect; treat as worth reviewing."

- **Multiple signals raised in rapid succession for the same Device.** Each signal is an independent occurrence; Product Catalog may consume in order or coalesce. Coalescence is Product Catalog's decision.

- **Consumer-safety rule produces no signal for a regeneration that changed feature evidence in a Feature Group Product Catalog actually filters on.** The consumer-safety rule erred on the side of *not* raising (under-raising risk per PR-B R8). Product Catalog's evidence freshness state still reflects current evidence; Product Catalog may detect the change through routine re-evaluation. The signal is a convenience, not the only path.

### Cross-Workflow Edge Cases

- **CSV import preview shows proposed signal impact, but signal is not raised at preview time.** Preview is `informational_only`. Pre-commit events do not raise the signal. The proposed signal impact is for human review only.

- **System Admin starts a CSV import preview, walks away, comes back two days later, attempts to commit.** Preview state is preserved per platform standard; pre-commit re-validation at commit gate detects any drift (e.g., a Feature Value retired in the interim). If drift is detected, the System Admin is returned to correction state.

- **Two System Admins work on the same import preview concurrently.** Implementation-level concurrency concern; PR-B does not specify locking. Per platform standard, an import job has an owner; concurrent edits may be permitted with last-write-wins semantics or rejected per implementation.

- **System Admin approves a Suggested Normalization for Device A; concurrently, another System Admin retires the referenced Feature Value.** Race condition. Pre-approval re-validation should detect the retirement; if it doesn't (implementation race), the approval may succeed with stale state. PR-B's audit captures the Feature Value version at approval time; reconciliation is a Data Quality Exception path.

- **Override applied to a workflow that subsequently fails before the audit reference is recorded.** Operational concern. If the override action's audit reference is not recorded, the override discipline is breached. Implementation must ensure audit is recorded transactionally with the override.

- **Product Catalog unavailable during signal consumption causes signal backlog.** Transport / Integration Management concern; PR-B does not specify. When Product Catalog returns, backlog is delivered per Integration Management semantics.

### What PR-B Does NOT Cover

- Event-level edge cases (idempotency keys, replay, deduplication) - PR-C.
- API surface edge cases (rate limiting, pagination, version negotiation) - PR-C.
- Storage edge cases (database constraint violations, transaction rollback semantics) - implementation.
- Notification edge cases (alert routing, escalation chain) - Notification Platform Service / PR-B OQ 3 / PR-B OQ 4.
- Multi-tenant edge cases beyond `check_access` consultation - Tenant Company / PR-A.
- Logs & Audit retention edge cases - Logs & Audit / PR-B OQ 1 / PR-B OQ 2.

## Feature Evidence Contracts and Signals Edge Cases (PR-C)

Lightweight edge case references for PR-C's contract / signal layer. These supplement (not replace) PR-B's workflow edge cases.

### Event-shape and versioning edge cases

- **Consumer receives an event with an `eventVersion` it does not recognize.** PR-C does not contract version-skip rules; behavior is consumer-side. Recommended discipline: consumer logs and skips rather than partially processing. Strict version handling rules are platform-standard scope per PR-C OQ 1.

- **Consumer receives an event with `eventVersion = 1` (the PR-C initial version) after a future PR has introduced `eventVersion = 2`.** PR-C events bump versions per future PR amendments; consumers should accept any version up to their supported version. Replay of historical `v1` events after `v2` introduction is normal and consumers must handle.

- **Event payload missing one or more Common Required Fields** (`eventId`, `eventType`, `eventVersion`, `occurredAt`, `redactionClass`, `sourceWorkflowReference`, `auditReference`). PR-C does not contract how transport reacts to malformed payloads; transport-layer concern. Producers must not emit incomplete payloads; if they do, consumers may treat as transport corruption.

- **Two events with identical `eventId` but different content.** Should never occur under PR-C discipline; if it does, treated as transport corruption. Consumers may surface as anomaly via observability; PR-C does not contract reconciliation behavior.

### Reference-callback and lookup edge cases

- **Consumer receives a PR-C event with a Device reference; calls Device Capability Evidence retrieval API (Placeholder 2a) for that Device, gets `404` or "no evidence available."** Possible cause: regeneration failure for that Device leaves it without a current evidence record. Consumer should respect the API's response and not assume the event implied evidence is available. PR-B Workflow 5 failure handling covers the Device Catalog side; consumer must handle the read-side absence.

- **Consumer reads Device Capability Evidence via API; while reading, a new evidence regeneration commits.** Eventual-consistency window. Consumer's read may return stale evidence; subsequent events (e.g., `device.capability-evidence.regenerated` for the same Device) trigger re-read. PR-C does not contract read-time consistency guarantees; eventual consistency is the architecture-level expectation.

- **Consumer batch-queries Device Capability Evidence (Placeholder 2c) for 10,000 Devices.** PR-C does not specify batch size limits, pagination semantics, or streaming behavior. Implementation may impose limits; consumer behavior on rejection (request too large) is implementation concern. Bulk lookup is a placeholder; concrete behavior is deferred.

- **Consumer queries Data Quality Exception lookup (Placeholder 4b downstream surface) with insufficient scope evidence.** `check_access` denies the query. Consumer must handle authorization failure; PR-C does not contract failure-response shape (platform standard / PR-C OQ 7).

### Delivery and replay edge cases

- **Event delivery failure mid-batch.** Producer emits a batch of 100 events; transport delivers 60, fails on remaining 40. Integration Management retry handles. Device Catalog records the originating state transition audit; transport-side delivery state is Integration Management's. Consumers see the 60 delivered, then see the 40 retried (potentially duplicating with the 60 already delivered if the transport's retry semantics are at-least-once). Consumer idempotency (Scenario 29) absorbs.

- **Replayed signal arrives after the underlying state has changed.** Consumer receives a replayed `device.compatibility-impacting-review-signal.raised` event from 24 hours ago; reads current Device Capability Evidence and finds it has changed since the signal was originally raised. Consumer should not assume the replayed signal reflects current state. Replay is for record-replay purposes, not for current-state triggering. PR-C event-contracts notes apply.

- **Consumer queue backlog causes delayed event consumption.** Event broker holds events; consumer eventually drains queue and processes events from minutes-to-hours ago. Each event's `occurredAt` reflects original transition time; `eventId` is stable. Consumer processing logic should reference `occurredAt` for ordering, not delivery time. Transport-layer SLAs are Integration Management scope.

### Compatibility-impacting review signal edge cases

- **Signal raised with `consumerActionHint = review_required_for_consumer_safety` but Product Catalog implementation has its own internal queue depth limits.** Product Catalog may queue or defer review even on `review_required_for_consumer_safety` hints. PR-C does not enforce timing; consumer-side prioritization is consumer's decision. The hint is advisory.

- **Signal raised with `outcome = failure` plus Override Discipline Case 5 evidence.** PR-B's regeneration failure continuation override caused the signal to fire despite the underlying regeneration failure. The signal payload carries `categoricalDelta = regeneration_failure_continuation_override_applied` and references the override audit. Consumer interprets per its own logic; PR-C does not specify how consumer treats `failure`-classed signals.

- **Two near-simultaneous signal events for the same Device.** Both arrive at the consumer; both carry different `eventId`s; both reference different Device Capability Evidence versions. Consumer may process in order received or coalesce; PR-C does not contract coalescence. Each signal is independent.

- **Signal carries empty `changedFeatureGroupReferences` and `changedFeatureValueReferences` arrays but non-zero `dataQualityExceptionReferences`.** Possible when a Data Quality Exception was introduced or resolved without changing the assignment set (e.g., the exception's lifecycle transitioned in a way that affects consumption but not assignments). PR-C does not contract behavior; consumer interprets per the `categoricalDelta` and Data Quality Exception reference.

### API placeholder edge cases

- **API placeholder consumed before PR-C events are implemented.** Read-only APIs may be called before any PR-C event flows. The APIs return current state; PR-C does not require events to be flowing for APIs to function. PR-C's read-only API surfaces are independent of PR-C's event surfaces.

- **API caller queries Feature Group lookup (Placeholder 1a) immediately after a `device.feature-group.updated` event.** Read may return state matching the new event or, if eventual consistency permits, state from before. PR-C does not contract read-after-write consistency; consumer absorbs.

- **Bulk Device Capability Evidence lookup (Placeholder 2c) request straddles a regeneration window.** Some Devices in the request batch may have evidence regenerated during the request processing; response may return mixed-version evidence per Device. Per-Device versioning (`evidence_source_versions`) reflects the version at response time per Device; consumer reconciles via subsequent events if it needs strict consistency.

### Acknowledgement and command-leakage edge cases

- **Consumer attempts to send an "acknowledgement" payload to a non-existent Device Catalog API endpoint.** PR-C does not expose a command-style acknowledgement endpoint. Consumer receives transport-layer "404" or equivalent; behavior is consumer concern. Acknowledgement is exclusively transport-layer (Integration Management broker).

- **Future PR proposes adding "Product Catalog action-required" field to a PR-C event.** Would violate PR-C non-command discipline. Reviewer should reject. The `consumerActionHint` field exists for advisory hints; no command-style metadata fields beyond this are introduced by PR-C.

### What PR-C does NOT cover

- Implementation-level edge cases (HTTP status codes, retry backoff timing, broker connection pool sizing, dead-letter routing, observability instrumentation, distributed tracing propagation).
- Storage-level edge cases (database constraint violations, transaction rollback semantics, cache invalidation timing).
- Multi-tenant edge cases beyond `check_access` consultation at API boundary (Tenant Company scope).
- Notification-layer edge cases for Data Quality Exception events (deferred to Notification Platform Service per PR-B OQ 3).
- Buyer-scoped edge cases - PR-C events do not carry buyer-portfolio data; buyer-scoped surfaces remain buyer-facing module concerns.
- Product-Catalog-side edge cases - what Product Catalog does on consumption is Product Catalog's concern; PR-C contracts the Device-Catalog producer side only.

## My Devices Portfolio Edge Cases

This section documents Device Catalog edge cases for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Product Catalog side has matching edge cases in `modules/product-catalog/edge-cases.md`. All existing Device Catalog baseline edge cases are preserved without modification.

### Empty portfolio

- Buyer with zero active devices: Buyer Device Portfolio Snapshot exists with empty `active_device_references`; Product Catalog produces a valid empty-portfolio projection. Not an error.

### First-time portfolio creation

- Buyer's first device add: `prior_portfolio_snapshot_reference` on the Change Record is null; `prior_snapshot_reference` on the new Snapshot is null. This is a valid first-time creation case.

### Duplicate device add

- Buyer attempts to add a device that is already active in their portfolio: implementation owns idempotency (reject as duplicate, or no-op). Architectural intent: idempotent.

### Remove device not in portfolio

- Buyer attempts to remove a device that is not active in their portfolio: implementation owns (reject as not-found, or no-op). No Change Record at `change_type = device_removed` is created if the device was not active.

### Bulk import with mix of new and existing devices

- Bulk import contains some devices already in the buyer's portfolio and some new: net effect computed against the resulting snapshot. ONE Change Record at `change_type = bulk_portfolio_import` covers the batch. `affected_device_references` lists all devices in the batch including no-op ones (implementation may filter).

### Bulk import with all no-ops

- Bulk import contains only devices already active: net effect is no change; implementation MAY skip Change Record / Snapshot creation, or create a no-op record for traceability. Architectural intent: skip is acceptable; recording for traceability is acceptable.

### Concurrent portfolio changes from multiple actors

- Buyer initiates add via UI; admin-on-behalf initiates remove via admin tool simultaneously. Device Catalog applies each change in order per existing baseline concurrency. Two Change Records produced; two Snapshots produced; two events emitted; Product Catalog Workflow 4 may dedupe to one recalculation per resulting snapshot.

### Concurrent add / remove of the same device

- Buyer adds device D; before the operation completes, buyer / admin removes D. Operations are serialized per existing baseline concurrency. Net effect: D may or may not be in the final snapshot depending on order.

### Device deactivation followed by re-activation

- Device D deactivated; subsequently re-activated. Two Change Records: `device_deactivated` then `device_added` (or a new add operation). Snapshots reflect the intermediate state.

### Device supersession with successor not in portfolio

- Device D superseded by successor D'; D' is NOT in the buyer's portfolio. `change_type = device_superseded`; `affected_device_references = [D, D']`. The buyer's portfolio's `active_device_references` no longer includes D; D' is NOT auto-added unless explicit (implementation owns).

### Device supersession with successor already in portfolio

- Device D superseded by D'; D' is already in the buyer's portfolio. `change_type = device_superseded`; `affected_device_references = [D, D']`. D moves to `superseded_device_references`; D' remains active.

### Device reference correction with no compatibility impact

- Reference corrected from D1 to D2; D1 and D2 have the SAME compatibility profile. Change Record at `change_type = device_reference_corrected`; new Snapshot reflects the corrected reference. Product Catalog recalculates; net effect: no `compatible_accessory_references` change.

### Device reference correction with compatibility impact

- Reference corrected from D1 to D2; D1 and D2 have DIFFERENT compatibility profiles. Change Record at `change_type = device_reference_corrected`; Product Catalog recalculates; impact records produced for accessories whose compatibility surface changed.

### Snapshot supersession chain depth

- Many successive portfolio changes create a long `prior_snapshot_reference` chain. Implementation MAY archive old snapshots per PR-D retention; the chain remains traceable through references.

### Change Record retention

- Buyer Device Portfolio Change Records are append-only operational evidence. Retention is governed by Logs & Audit PR-D retention policies via the `buyer_device_portfolio_change` evidence kind. Concrete retention duration: CPA / legal / DevOps review.

### Snapshot retention

- Buyer Device Portfolio Snapshots are append-only operational evidence. Retention governed by PR-D via the `buyer_device_portfolio_snapshot` evidence kind.

### Bulk import partial success

- Bulk import where some devices are invalid (e.g., bad device references). Implementation owns: either reject the entire batch (atomic) or apply valid ones and emit error references for invalid ones (existing baseline). Architectural intent: implementation per existing `phase-1-csv-import.md` discipline.

### Bulk import with admin-on-behalf authority

- Admin runs bulk import on behalf of buyer per Tenant Company act-on-behalf authority. Change Record at `change_type = bulk_portfolio_import`; `change_source = admin_on_behalf`; `actor_reference` set to admin. Product Catalog MAY route to `projection_status = review_required` per Workflow 4.

### Service identity sync arriving while buyer is editing

- Service identity sync triggers a portfolio change while buyer is concurrently editing via UI. Operations are serialized per existing baseline. Two Change Records produced; two events emitted. Implementation MAY consolidate via idempotency or per-operation ordering.

### Service identity credential expiration mid-bulk-import

- Service identity attempts bulk import; credentials expire mid-batch. Existing baseline credential expiration handling applies. Partial Change Record may be produced for completed devices; rest fails. Implementation owns recovery.

### Tenant suspension mid-operation

- Buyer's tenant is suspended while a portfolio change is in progress. Implementation owns: either fail the operation (existing PR #103 lifecycle blocking) or complete the in-flight operation. Default per existing baseline: lifecycle blocking applies on next `check_access` call.

### Tenant reactivation after suspended period

- Tenant reactivated; buyer initiates portfolio change. Existing PR #103 baseline applies; portfolio change proceeds normally.

### Canonical Device record deactivation

- Canonical Device record D is deactivated globally (Device Catalog admin action; existing baseline). Buyers with D in their portfolio: Device Catalog MAY create `device_deactivated` Change Records for each affected buyer's portfolio, OR retain the portfolio entry as-is and rely on Product Catalog's projection recalculation to detect the deactivation. Architectural intent: explicit Change Records per affected buyer (one per buyer scope), to maintain audit trail.

### Canonical Device record reference correction

- Canonical Device record has its reference corrected globally. Buyers with the prior reference: Device Catalog MAY create `device_reference_corrected` Change Records per affected buyer. Architectural intent: explicit per-buyer Change Records for audit trail.

### Vendor-side compatibility mapping change (no Device Catalog action)

- Vendor updates compatibility mappings in Product Catalog. NO Device Catalog Change Record is created (the buyer's portfolio is unchanged). Product Catalog recalculates per its Workflow 4 triggered by the vendor-side change. No `portfolio-changed` event is emitted (because the portfolio didn't change).

### Cross-tenant boundary

- Buyer A in tenant T1 and buyer B in tenant T2 have entirely independent portfolios; cross-tenant reads / mutations are architecturally impossible (existing Tenant Company baseline).

### Re-parented buyer entity

- Buyer entity re-parented under a different company (existing PR #103 OQ-PC-2 deferred discipline): portfolio / snapshot / change record handling governed by existing deferred discipline; no concrete behavior locked here.

### AI-Agent-initiated portfolio change

- Future AI Agent Services module initiates a portfolio change on behalf of buyer (future PR if module exists): same authority discipline (Tenant Company `check_access`); same workflow surfaces; `actor_reference` or `service_trigger_reference` records the AI agent identity. Not in scope for this PR.

### High-volume portfolio change events

- Mass portfolio changes (e.g., tenant bulk import affecting many buyers): each buyer's Change Record / Snapshot is independent (buyer-scope triad). Implementation owns event delivery throughput per existing baseline.

### Notification of portfolio change

- This PR does NOT introduce Device-Catalog-side notification intent. Product Catalog emits compatibility-impact notification intent per its Workflow 14 if the portfolio change affects activated accessories. Direct portfolio-change-confirmation notifications (e.g., "device D added") are future Notification Platform coordination.

### Bulk import via `phase-1-csv-import.md` path

- Existing CSV import path is preserved by reference and NOT modified. When invoked, it produces a Buyer Device Portfolio Change Record at `change_type = bulk_portfolio_import` per the architectural shape locked here.

### What this edge-cases section intentionally does NOT lock

- Concrete numerics for: bulk import batch size, dedupe windows, retention.
- Concrete API request / response shapes.
- Concrete UI for any edge case.
- Concrete propagation latency for `portfolio-changed` events.
- Concrete snapshot garbage collection policy beyond existing PR-D retention discipline.
- Concrete idempotency cache shape, TTL.
- AI-Agent-initiated change concrete behavior (future PR).
- Re-parenting concrete portfolio behavior (existing PR #103 deferred discipline).
- Modifications to `phase-1-csv-import.md` semantics (out of scope).
