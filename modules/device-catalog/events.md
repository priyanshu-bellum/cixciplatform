# Device Catalog Events

## Published Events

- `device.device.created` placeholder
- `device.device.updated` placeholder
- `device.device.retired` placeholder
- `device.device.merged` placeholder
- `device.device.split` placeholder
- `device.device.superseded` placeholder
- `device.reference.changed` placeholder
- `device.reference.deprecated` placeholder
- `device.lifecycle.changed` placeholder
- `device.visibility.changed` placeholder
- `device.image-readiness.changed` placeholder
- `device.taxonomy.changed` placeholder
- `device.identifier.changed` placeholder
- `device.source.changed` placeholder
- `device.import.started` placeholder
- `device.import.validation-failed` placeholder
- `device.import.correction-required` placeholder
- `device.import.completed` placeholder
- `device.import.failed` placeholder
- `device.export.completed` placeholder
- `device.export.failed` placeholder
- `device.buyer-portfolio.changed` placeholder

## Feature Evidence Contracts and Signals - Additive Event Names (PR-C)

PR-C introduces 20 additive event names for the Device Catalog Feature Evidence Contracts and Signals layer. These names cover five event families: feature taxonomy lifecycle, feature assignment changes, capability evidence regeneration, Data Quality Exception lifecycle, and the compatibility-impacting review signal.

All PR-C event names follow the convention **`device.<entity>.<verb-past-tense>`**, consistent with existing legacy Device Catalog event names (e.g., `device.import.validation-failed`, `device.buyer-portfolio.changed`). PR-C events are **additive**; PR-C does not rename, replace, or modify any legacy event name.

Contract shape for all PR-C events is defined in `modules/device-catalog/event-contracts.md` (PR-C section). API contract placeholders for related lookups are defined in `modules/device-catalog/api-contracts.md` (PR-C section). The compatibility-impacting review signal concept and producer/consumer boundary are defined in `modules/device-catalog/workflows.md` and `modules/device-catalog/boundary-contracts.md` (PR-B).

PR-C event entries below carry, per event:

- **Name** - the event identifier.
- **Family** - for grouping and subscription.
- **Purpose** - what state transition the event represents.
- **When raised** - the workflow trigger (per `workflows.md` PR-B).
- **Redaction class** - one of `internal`, `tenant_scoped`, `buyer_scoped` per `event-contracts.md` (PR-C).
- **Contract reference** - pointer to the contract shape in `event-contracts.md`.
- **Consumer notes** - what downstream modules (notably Product Catalog) may do with the event. PR-C describes consumption *boundaries*, not consumer implementation.

PR-C does not contract the broker, the delivery mechanism, the retry / replay machinery, or the dead-letter behavior. Those are Integration Management concerns. PR-C describes architecture-level expectations only.

---

### Event family 1 - Feature Taxonomy Lifecycle (8 events)

Events raised when CIXCI System Admin (per PR-A Feature Taxonomy Authority) creates, updates, deprecates, or retires Feature Group or Feature Value records.

#### `device.feature-group.created`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A new Feature Group has entered `draft` state (or has been created and is `active` per the taxonomy administration workflow).
- **When raised:** Post-commit of a Feature Taxonomy Authority action creating a Feature Group.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Consumers (notably Product Catalog) may use this to refresh their taxonomy reference caches if they maintain any. Consumers must not infer applicability or required-features-by-Device-Type from this event; that is governed by Device Capability Profile (Device Catalog-owned).

#### `device.feature-group.updated`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Group's taxonomy-administered fields (display label, value structure kind, lifecycle state below `retired`) were changed.
- **When raised:** Post-commit of a Feature Taxonomy Authority update action that increments the Feature Group's `version` and `source_hash`.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Consumers may refresh references. Consumers must respect the new version; references that ignore version may drift.

#### `device.feature-group.deprecated`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Group transitioned to `deprecated` state.
- **When raised:** Post-commit of the Feature Taxonomy Authority deprecation action.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Consumers may surface a deprecation warning in their UX or filter queue. New Device Feature Assignments referencing the group should not be created post-deprecation; consumers reading existing assignments may continue to do so until retirement.

#### `device.feature-group.retired`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Group transitioned to `retired` (terminal) state.
- **When raised:** Post-commit of the Feature Taxonomy Authority retirement action.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Consumers must treat the Feature Group as terminal. Active Device Feature Assignments referencing the retired group may be surfaced as `retired_value_referenced` per PR-A Device Capability Evidence and per PR-B Data Quality Exception (category `retired_feature_value_referenced`).

#### `device.feature-value.created`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A new Feature Value has been created within a Feature Group.
- **When raised:** Post-commit of a Feature Taxonomy Authority creation action - including PR-B Workflow 3 (Feature Value Creation Through Import / Review).
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Consumers may refresh references. PR-B's import-flow creation source is recorded; consumers should not branch logic on creation source.

#### `device.feature-value.updated`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Value's taxonomy-administered fields changed.
- **When raised:** Post-commit of a Feature Taxonomy Authority update action.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** As with `device.feature-group.updated`.

#### `device.feature-value.deprecated`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Value transitioned to `deprecated` state.
- **When raised:** Post-commit of the Feature Taxonomy Authority deprecation action.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Existing Device Feature Assignments referencing the value continue to be honored; new assignments should not be created. Consumers may surface warning per PR-B Workflow 1 step 5 / row classification.

#### `device.feature-value.retired`

- **Family:** Feature Taxonomy Lifecycle
- **Purpose:** A Feature Value transitioned to `retired` (terminal) state.
- **When raised:** Post-commit of the Feature Taxonomy Authority retirement action.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Feature Taxonomy Lifecycle contract shape.
- **Consumer notes:** Affected Device Feature Assignments may be surfaced in Data Quality Exceptions per PR-B. Consumers reading evidence may see `retired_value_referenced` assignment status.

---

### Event family 2 - Device Feature Assignment Changes (3 events)

Events raised when a Device Feature Assignment is created, updated, superseded, or withdrawn.

#### `device.feature-assignment.changed`

- **Family:** Device Feature Assignment Changes
- **Purpose:** A Device Feature Assignment has been created or updated (excluding supersession and withdrawal, which have dedicated events).
- **When raised:** Post-commit of a Device Feature Assignment / Correction Authority action that produces or modifies an assignment per PR-B Workflow 2 (Compatibility Marker Normalization) or direct administrative edit.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Feature Assignment Changes contract shape.
- **Consumer notes:** Consumers (notably Product Catalog) may use this as input to whether their accessory compatibility filtering needs re-evaluation, but **the authoritative consumer-facing trigger remains the compatibility-impacting review signal** (`device.compatibility-impacting-review-signal.raised`). Feature assignment changes do not always rise to consumer-safety-affecting; the review signal carries that determination.

#### `device.feature-assignment.superseded`

- **Family:** Device Feature Assignment Changes
- **Purpose:** A prior `active` Device Feature Assignment has been superseded by a newer assignment for the same (Device, Feature Group) pair.
- **When raised:** Post-commit of an approval action (per PR-B Workflow 2) that creates a new assignment where one already existed.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Feature Assignment Changes contract shape.
- **Consumer notes:** Consumers reading active assignments should treat `superseded` records as audit history, not current state. Consumers caching assignment references should invalidate.

#### `device.feature-assignment.withdrawn`

- **Family:** Device Feature Assignment Changes
- **Purpose:** A Device Feature Assignment has been withdrawn (explicitly removed via correction) without being replaced.
- **When raised:** Post-commit of a withdraw action per PR-B Workflow 2 / Workflow 4.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Feature Assignment Changes contract shape.
- **Consumer notes:** The Device may no longer have an active assignment for the affected Feature Group. Consumers should re-read Device Capability Evidence for the latest state; the assignment removal may itself raise the compatibility-impacting review signal per PR-B Workflow 6.

---

### Event family 3 - Device Capability Evidence Regeneration (3 events)

Events raised when Device Capability Evidence regeneration completes (success, failure, or marked stale).

#### `device.capability-evidence.regenerated`

- **Family:** Device Capability Evidence Regeneration
- **Purpose:** A Device Capability Evidence record was successfully regenerated (`outcome = success` or `outcome = partial_success`).
- **When raised:** Post-commit of PR-B Workflow 5 with a non-failure outcome.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Capability Evidence Regeneration contract shape.
- **Consumer notes:** A successful regeneration may have changed feature evidence consumer-safety-affecting; the compatibility-impacting review signal (separate event) carries that determination. Consumers may use this regeneration event for cache invalidation and freshness tracking; for consumer-safety decisions, prefer the review signal.

#### `device.capability-evidence.stale`

- **Family:** Device Capability Evidence Regeneration
- **Purpose:** A Device Capability Evidence record has been marked `stale` because upstream taxonomy versions have advanced without regeneration, or because a regeneration failure left it in an inconsistent state.
- **When raised:** Post-staleness-detection per PR-B Workflow 5 staleness rules (event-driven, not time-based).
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Capability Evidence Regeneration contract shape.
- **Consumer notes:** Consumers reading evidence should respect `freshness_state` per PR-A; the stale event is an explicit signal that the read-side state has degraded. Consumers may filter / surface the Device differently; that is consumer's downstream decision.

#### `device.capability-evidence.regeneration-failed`

- **Family:** Device Capability Evidence Regeneration
- **Purpose:** A Device Capability Evidence regeneration attempt failed (`outcome = failure`).
- **When raised:** Post-commit of PR-B Workflow 5 with `outcome = failure`.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Device Capability Evidence Regeneration contract shape.
- **Consumer notes:** By default, regeneration failure does **not** raise the compatibility-impacting review signal (per PR-B Workflow 6). The failure event is for observability and operations consumers; consumer-safety decisions remain anchored on the review signal. If a regeneration failure leaves evidence in a consumer-safety-affecting state, PR-B Override Discipline (Case 5 - regeneration failure continuation override) may explicitly raise the review signal with `outcome = failure`.

---

### Event family 4 - Data Quality Exception Lifecycle (5 events)

Events raised across the Data Quality Exception lifecycle per PR-B Workflow 4.

#### `device.data-quality-exception.created`

- **Family:** Data Quality Exception Lifecycle
- **Purpose:** A Data Quality Exception has been created (entered `created` state).
- **When raised:** Post-creation by PR-B Workflow 1 commit, PR-B Workflow 5 failure, or direct System Admin flagging.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Data Quality Exception Lifecycle contract shape.
- **Consumer notes:** Product Catalog and other consumers may consume this for read-only awareness of feature data degradation. PR-B OQ 3 (notification routing) is out of PR-C scope; notification delivery is Notification Platform Service's concern.

#### `device.data-quality-exception.resolved`

- **Family:** Data Quality Exception Lifecycle
- **Purpose:** A Data Quality Exception transitioned to `resolved` (terminal - closed with verification).
- **When raised:** Post-commit of explicit System Admin closure with `resolution_action_reference`.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Data Quality Exception Lifecycle contract shape.
- **Consumer notes:** Consumers may use this to clear filter / surface state for the affected Device. The Device Capability Evidence may have been updated as part of resolution; the compatibility-impacting review signal (separate event) carries consumer-safety determination.

#### `device.data-quality-exception.dismissed`

- **Family:** Data Quality Exception Lifecycle
- **Purpose:** A Data Quality Exception transitioned to `dismissed` (terminal - closed without correction; false-positive determination).
- **When raised:** Post-commit of explicit System Admin closure with `dismissal_reason_reference`.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Data Quality Exception Lifecycle contract shape.
- **Consumer notes:** Consumers may use this to clear filter state. Dismissal indicates the original detection was incorrect; the underlying data is accepted as-is.

#### `device.data-quality-exception.unresolved`

- **Family:** Data Quality Exception Lifecycle
- **Purpose:** A Data Quality Exception transitioned to `unresolved` (terminal - closed despite degradation; explicit override-evidenced acceptance).
- **When raised:** Post-commit of explicit System Admin closure with Override Discipline Case 3 (Unresolved acceptance override) evidence.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Data Quality Exception Lifecycle contract shape.
- **Consumer notes:** Consumers may apply distinct filter / surface treatment for `unresolved` Devices vs. `resolved` Devices. The data remains in a degraded state, accepted intentionally; consumers may choose to treat the Device as having reduced compatibility confidence. The override audit reference is carried in the event payload.

#### `device.data-quality-exception.reopened`

- **Family:** Data Quality Exception Lifecycle
- **Purpose:** A Data Quality Exception in a terminal state has been reopened to `under_review`.
- **When raised:** Post-commit of an explicit System Admin reopen action per PR-B Workflow 4.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Data Quality Exception Lifecycle contract shape.
- **Consumer notes:** Consumers may revert any clear-filter actions they took when the exception was closed. The reopen event signals that prior closure may have been incorrect or that new evidence has surfaced.

---

### Event family 5 - Compatibility-Impacting Review Signal (1 event)

The single event that names the PR-B compatibility-impacting review signal concept.

#### `device.compatibility-impacting-review-signal.raised`

- **Family:** Compatibility-Impacting Review Signal
- **Purpose:** Device Catalog has determined that recent Device Capability Evidence changes are consumer-safety-affecting per PR-B Workflow 6, and is raising the signal for downstream consumer review.
- **When raised:** Post-commit of Device Capability Evidence Regeneration with `outcome = success` or `outcome = partial_success` where the consumer-safety rule (per PR-B Workflow 6) determines the signal should fire, or with `outcome = failure` plus Override Discipline Case 5 (Regeneration failure continuation override) evidence.
- **Redaction class:** `internal`
- **Contract reference:** `event-contracts.md` PR-C Section - Compatibility-Impacting Review Signal contract shape (the minimum-shape contract).
- **Consumer notes:**
  - **Product Catalog is the primary consumer.** Product Catalog reads the signal and decides for itself whether accessory compatibility mappings, buyer-visible accessory lists, newly compatible indicators, or blocked export / readiness states need updating.
  - **The signal is not a command.** The `consumer_action_hint` field is advisory. Product Catalog may use it for prioritization. Product Catalog is not commanded by Device Catalog to take any action; Product Catalog's downstream decisions are recorded in Product Catalog's own state.
  - **The signal is one-way.** Product Catalog does not return a signal to Device Catalog. Any acknowledgement is transport-layer (Integration Management) and does not command Device Catalog behavior.
  - **The signal carries references, not snapshots.** Changed Feature Group and Feature Value references are carried, with a categorical delta / change category / reason summary. Full Device Capability Evidence snapshots are not embedded. Consumers wanting current evidence detail use the Device Capability Evidence retrieval API (PR-C `api-contracts.md`).
  - **Consumer-safety determination is Device Catalog's.** Device Catalog raises the signal when the consumer-safety rule (per PR-B Workflow 6) fires. Consumers may filter signals they do not care about, but they cannot demand Device Catalog raise additional signals on their behalf.
  - **No raw Compatibility Marker exposure.** Compatibility Markers are Device Catalog-internal ingestion artifacts (per PR-A and PR-B). The review signal does not carry raw marker values.

---

## PR-C event inventory summary

## Proposed Event Taxonomy

This taxonomy is proposal-level and does not finalize event payloads, delivery guarantees, or business rules.

### Global Canonical Device Events

These events describe platform-wide canonical device state and should not include tenant-scoped export, portfolio, relationship, or eligibility data.

- `device.device.created`: published when a canonical Device Master Record is created.
- `device.device.updated`: published when canonical device attributes, source confidence, or CIXCI-governed metadata changes.
- `device.device.retired`: published when a device is discontinued, retired, hidden, or no longer available for new references.
- `device.lifecycle.changed`: published when launch, release, active, discontinued, replaced, retired, or related lifecycle state changes.
- `device.visibility.changed`: published when Buyer Visibility Status changes between Hidden and Visible.
- `device.image-readiness.changed`: published when the internal image upload dependency becomes ready, not ready, or review-required.
- `device.taxonomy.changed`: published when category, hierarchy, or classification metadata changes.

### Reference Lifecycle Events

These events describe Device Reference behavior for downstream modules that may store references.

- `device.reference.changed`: published when a Device Reference target, state, alias, or lookup behavior changes.
- `device.reference.deprecated`: published when a Device Reference remains resolvable for history but should not be used for new associations.
- `device.identifier.changed`: published when identifier, alias, namespace, or external ID mappings change.
- Placeholder: define whether immutable, redirected, deprecated, or unresolved references require separate event names.

### Phase 1 Import / Source Events

These events describe System Admin-only Phase 1 CSV import, source data ingestion, enrichment, and review outcomes.

- `device.import.started`: published when a System Admin begins a Phase 1 CSV import job.
- `device.import.validation-failed`: published when strict header validation or row-level validation fails.
- `device.import.correction-required`: published when an import row or batch needs correction before canonical changes.
- `device.import.completed`: published when an API-first or fallback import batch completes.
- `device.import.failed`: published when an import batch fails or requires manual review.
- `device.source.changed`: published when manufacturer, external feed, admin, or other source record data changes.
- Placeholder: define whether source conflict, low-confidence enrichment, or manual review state requires specialized events.

### Merge / Split / Supersession Events

These events describe identity transitions that may affect stored references.

- `device.device.merged`: published when duplicate records are consolidated into one canonical record.
- `device.device.split`: published when one record is separated into multiple canonical records.
- `device.device.superseded`: published when a device is replaced by a successor, successor generation, or lifecycle replacement relationship.
- Placeholder: merge, split, and supersession events should include predecessor and successor reference metadata without forcing downstream compatibility, routing, pricing, or procurement decisions.

### Tenant-Scoped Export / Portfolio Events

These events describe authorized tenant-scoped usage and must not be treated as global canonical device source-of-truth.

- `device.export.completed`: published when an authorized buyer device export/download completes.
- `device.export.failed`: published when an export fails, is denied, or requires review.
- `device.buyer-portfolio.changed`: published when a buyer device portfolio reference changes if Device Catalog owns this reference event.
- Placeholder: define whether buyer-facing modules, rather than Device Catalog, should publish workflow-state events for export UX, task progress, or buyer decisions.

## Payload Redaction Rules By Consumer Class

- Product Catalog consumers should receive Device Reference identifiers and safe canonical device attributes needed for accessory compatibility references, but not tenant-scoped export or portfolio state.
- Product Catalog or future Compatibility Authority consumers may receive Compatibility Markers as preparation context, but Device Catalog events must not decide accessory compatibility.
- Pricing consumers should receive only device context needed for pricing interpretation; Device Catalog events must not carry pricing decisions, discounts, quotes, or overrides.
- Order Routing consumers should receive reference validation context only; events must not carry route, vendor selection, warehouse selection, or fulfillment-path decisions.
- Fulfillment consumers should receive device metadata references only where needed; events must not carry shipment, return, inventory, or execution state.
- Analytics consumers may receive broader canonical snapshots or read-model deltas where authorized, but tenant-scoped export and portfolio data should be redacted or separated by event family.
- Buyer-facing consumers should receive tenant-scoped export, portfolio, visibility, or image-readiness events only for authorized buyer/company/entity scope.
- Future Procurement consumers may receive Device References for purchase order line references, but events must not carry PO approval, PO status, invoice, or reconciliation data.

## Consumed Events

- Placeholder: Tenant Company events for company/entity scope, relationship eligibility, regional eligibility, and permission changes that affect device visibility or export authorization.
- Placeholder: internal image readiness references or Media Management events for image readiness gating.
- Placeholder: Product Catalog events if compatibility reference usage needs validation or dependency tracking.
- Placeholder: future Procurement / Purchase Orders events if purchase order references require lifecycle awareness without moving procurement ownership here.

## Retry Behavior

- Placeholder: define retry behavior for failed event publication.
- Placeholder: define retry behavior for consumed Tenant Company scope or eligibility events that cannot be applied.
- Placeholder: define retry and dead-letter behavior for Phase 1 import job events, validation failures, correction-required events, and image-readiness events.
- Placeholder: define dead-letter or manual review flow for repeated import, export, or downstream event failures.

## Idempotency

- Placeholder: define event identifiers and deduplication keys.
- Placeholder: Phase 1 import events should deduplicate by import job id, file reference, mode, row hash, and affected Device Reference where applicable.
- Placeholder: consumers should handle repeated lifecycle, reference, merge, split, supersession, import, and export events without duplicate effects.
- Placeholder: merge, split, and supersession events need stable predecessor and successor reference semantics before implementation.

## Audit Events

- Placeholder: define which create, update, merge, split, supersede, retire, import, export, visibility, image-readiness, and portfolio reference changes require audit records.
- Placeholder: define who can view audit entries for manufacturer, buyer, admin, and integration actions.
- Placeholder: define retention for Device Reference, Phase 1 import, correction, validation, visibility, image-readiness, and buyer export audit events.

## My Devices Portfolio Event Discipline

This section documents the Device Catalog event discipline for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. **Exactly 1 new Device Catalog event** is introduced, discriminator-based and additive to the existing Device Catalog event surface. The Product Catalog side introduces 5 new events (documented in `modules/product-catalog/events.md`). Total new events across both modules: 6. All existing Device Catalog events are preserved without modification.

### Core discipline

- **Exactly 1 new Device Catalog event introduced.** No more, no less.
- **Combined with the 5 Product Catalog events, total new events = 6** across this Foundation.
- **Discriminator-first design** consistent with PR-D, PR-E, PR #103, and PR #104 discipline.
- **No event explosion.** All 8 portfolio change types are observable via the single `change_type` discriminator.
- **Existing Device Catalog events preserved.** No baseline event is renamed or removed.

### The 1 new Device Catalog event

#### Event - `device-catalog.my-devices.portfolio-changed`

**Emission trigger:** every Buyer Device Portfolio Change Record creation. Each event corresponds to one Change Record.

**Discriminator:** `change_type` (string-enum; 8 values).

**Audit-coordination semantics carried:**

- All portfolio change types via the discriminator.
- Buyer-scope triad on the change.
- Prior portfolio snapshot reference.
- New portfolio snapshot reference.
- Affected device references.
- Actor reference OR service trigger reference.

**Subsumes (no separate events needed for):**

- Device added (use `change_type = device_added` discriminator).
- Device removed (use `change_type = device_removed` discriminator).
- Device updated (use `change_type = device_updated` discriminator).
- Device deactivated (use `change_type = device_deactivated` discriminator).
- Device superseded (use `change_type = device_superseded` discriminator).
- Device reference corrected (use `change_type = device_reference_corrected` discriminator).
- Bulk portfolio import (use `change_type = bulk_portfolio_import` discriminator).
- Admin-on-behalf change (use `change_type = admin_on_behalf_change` discriminator OR the specific add/remove/update type with `actor_reference` set to admin per implementation convention).

### Events explicitly NOT introduced

The following proposed events are REJECTED because they would create event explosion. Each is subsumed by the `portfolio-changed` event's `change_type` discriminator.

| Proposed event | Status | Subsumed by |
|---|---|---|
| `device-catalog.my-devices.device-added` | REJECTED | `portfolio-changed` + `change_type = device_added` |
| `device-catalog.my-devices.device-removed` | REJECTED | `portfolio-changed` + `change_type = device_removed` |
| `device-catalog.my-devices.device-updated` | REJECTED | `portfolio-changed` + `change_type = device_updated` |
| `device-catalog.my-devices.device-deactivated` | REJECTED | `portfolio-changed` + `change_type = device_deactivated` |
| `device-catalog.my-devices.device-superseded` | REJECTED | `portfolio-changed` + `change_type = device_superseded` |
| `device-catalog.my-devices.device-reference-corrected` | REJECTED | `portfolio-changed` + `change_type = device_reference_corrected` |
| `device-catalog.my-devices.bulk-import-completed` | REJECTED | `portfolio-changed` + `change_type = bulk_portfolio_import` |
| `device-catalog.my-devices.admin-on-behalf-change` | REJECTED | `portfolio-changed` + `change_type = admin_on_behalf_change` OR specific type + actor_reference |
| `device-catalog.buyer-device-portfolio-snapshot.created` | REJECTED | Snapshot creation is observable via `portfolio-changed` (every Change Record references a new snapshot) |
| `device-catalog.buyer-device-portfolio.compatibility-impact.*` | REJECTED | Compatibility impact is Product Catalog's concern; Product Catalog emits its own events |

### Portfolio change record and event: records + events

Portfolio changes are BOTH records AND events:

- **Records:** Buyer Device Portfolio Change Record (with `change_type`), Buyer Device Portfolio Snapshot are the sources of truth.
- **Event:** `portfolio-changed` is the observability surface.

Subscribers consume the event; Logs & Audit indexes records via existing `service_identity.evidence_emit`; UI reads records. There is no information loss between record and event; both surfaces are kept synchronized.

### Existing Device Catalog events preserved (no edits)

All existing Device Catalog events are preserved without modification. (Refer to existing `events.md` baseline content for the canonical inventory.)

### Net Device Catalog event inventory after this PR

- **New Device Catalog events: 1.**
- Existing Device Catalog events: preserved without modification.
- New Product Catalog events: 5 (documented in `modules/product-catalog/events.md`).
- **Total new events across this Foundation: 6.**
- Existing Tenant Company / Logs & Audit / Integration Management / Notification Platform / Analytics events: preserved by reference; no file modified.

### Event boundary discipline

- Device Catalog emits Device Catalog events for Device Catalog state changes (1 new event: portfolio-changed).
- Product Catalog emits Product Catalog events for Product Catalog state changes (5 new events).
- Logs & Audit emits Logs & Audit events for Logs & Audit lifecycle.
- Tenant Company emits Tenant Company events for Tenant authority changes.
- Integration Management emits Integration Management events for transport / dispatch outcomes.
- None of these modules emit events on behalf of the others.
- Cross-module correlation via `correlation_reference` per PR-A discipline.
- Subscribers handle discriminator-based filtering per existing event-contract discipline.

### Forbidden event modifications

- No Device Catalog baseline event is renamed, removed, or version-bumped.
- No Product Catalog baseline event (PR #104 or earlier) is modified.
- No Logs & Audit, Tenant Company, Integration Management, Notification Platform, or Analytics event is modified.
- No new top-level event identifier outside the 1 Device Catalog (combined with 5 Product Catalog; total 6) listed.
- No discriminator value is removed from the existing `change_type` catalog (extensions are additive only).

### Subscriber composition guidance

Subscribers consuming the portfolio change surface:

- Subscribe to `device-catalog.my-devices.portfolio-changed` with `change_type` filter for specific change types of interest.
- Product Catalog subscribes to ALL `change_type` values to trigger projection recalculation per its Workflow 4.
- Notification Platform consumers (when added in future coordination) MAY subscribe to specific `change_type` values for portfolio-change-confirmation notifications.
- Analytics consumers MAY subscribe per existing baseline.

Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
