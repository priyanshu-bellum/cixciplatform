# Assumptions / Open Questions

## Assumptions

- Device Catalog aligns with ADR-0004 and owns canonical device data.
- Product Catalog owns accessory products and references Device Catalog through Device Reference or Compatible Device Reference values.
- Tenant Company owns tenant scope, company/entity hierarchy, roles, permissions, relationship eligibility, and regional eligibility signals.
- Pricing, Order Routing, Fulfillment, Analytics, buyer-facing modules, and future Procurement may consume Device References but own their own decisions and workflows.
- Manufacturer, distributor, and API ingestion are future-facing placeholders and are not Phase 1 enabled workflows.
- Phase 1 device CSV import is System Admin-only.
- Manufacturers, vendors, buyers, and external integrations do not receive self-service import access in Phase 1.
- Phase 1 CSV import does not create public image URL requirements.
- Device Catalog owns the Buyer Device Portfolio Reference.
- Buyer-facing UX owns screen behavior, layout, filters, empty states, and display behavior.
- Product Catalog consumes My Devices / Buyer Device Portfolio References for compatibility filtering but does not own or mutate the buyer device portfolio.
- Media Management owns device image upload, processing, validation, storage, matching, renditions, and media audit.
- Device Catalog owns the Device Image Readiness Reference used for visibility gating.
- Device change communication should be event-driven where useful.

### PR-A Assumptions (Device Catalog Feature Evidence Foundation)

PR-A introduces architecture-level entities and ownership boundaries for Device Catalog feature evidence. The following assumptions are made by PR-A and should be flagged for confirmation during review:

- **A1.** The existing `modules/device-catalog/` directory contains the file set named in PR-A's brief (README, spec, workflows, data-model, api-contracts, openapi-contracts, events, event-contracts, permissions, boundary-contracts, assumptions-open-questions, test-scenarios, edge-cases, phase-1-csv-import). PR-A does not create any new file. If any expected target file is missing, PR-A application stops and surfaces to human review.

- **A2.** PR-A depends on PR #86 Device Catalog Phase 1 ownership boundary cleanup. The PR #86 clarifications (Device Catalog owns Buyer Device Portfolio Reference; Media Management owns image asset authority; Buyer-facing UX owns display behavior; Phase 1 is System Admin CSV import only) are now part of the merged Device Catalog baseline.

- **A3.** Device Type is an existing concept in Device Catalog. PR-A references "Device Type" without introducing it as a new entity. If Device Type does not exist as a discrete concept on main, PR-A application stops and surfaces to human review. (See PR-A OQ 7.)

- **A4.** The platform standard `architecture/standards/import-export-validation-governance.md` is the canonical reference for header validation, row validation, error / warning / review-required classification, locked field protection, UPC / text identifier preservation, and audit-ready import evidence. Device Catalog Phase 1 CSV import follows this platform standard. PR-A does not modify the standard; PR-B will reference it.

- **A5.** Product Catalog-side boundary declarations may be maintained separately by Product Catalog work where applicable. Device Catalog states its producer / ownership side independently: Product Catalog must not mutate Device Catalog feature truth; Product Catalog owns accessory compatibility assertions; Device Catalog owns device feature truth. Device Catalog does not modify Product Catalog files.

- **A6.** Tenant Company exposes `check_access` as the authority resolution mechanism. Device Catalog authority classes reference `check_access`; Device Catalog does not duplicate the authority model.

- **A7.** Logs & Audit is the canonical owner of immutable audit retention. Device Catalog produces audit references through its workflows and consumes Logs & Audit identifiers; the immutable record itself is Logs & Audit's.

- **A8.** The `assignment_source` enumeration values (`csv_import`, `system_admin_direct_edit`, `compatibility_marker_normalization`, reserved `manufacturer_api`, `distributor_api`, `migration`) are proposal-level and may be refined in PR-B. Reserved values exist to make Phase 2 ingestion sources additive rather than requiring schema changes.

- **A9.** Feature Group `value_structure_kind` enumeration (`enumerated`, `enumerated_multi`, `range_bounded`, `freeform_constrained`) is proposal-level. Phase 1 CSV import in PR-B will use `enumerated` and `enumerated_multi` only; the other kinds are reserved for future Feature Groups (e.g., scalar properties).

- **A10.** Feature Group and Feature Value lifecycle states (`draft`, `active`, `deprecated`, `retired`) are proposal-level. The exact transition rules (which transitions are allowed, blocked, or routed to review) remain taxonomy governance detail (see PR-A OQ 6).

- **A11.** Device Capability Profile is introduced as a separate lightweight entity per the decision in PR-A scoping (option alpha, mirroring Product Catalog PR #77's Product Type Capability Profile pattern). PR-A defines the shape; content (exact required Feature Groups per Device Type) is a product / business decision deferred per PR-A OQ 1.

- **A12.** Compatibility Marker is owned by Device Catalog and is not authoritative feature evidence. It is named "Compatibility Marker" in PR-A for consistency with the existing Device Catalog Phase 1 CSV context. The naming may be revisited per PR-A OQ 8 if confusion with Product Catalog compatibility terminology arises.

- **A13.** Data Quality Exception is declared as a concept-level evidence category in PR-A. PR-B defines lifecycle, resolver authority, and resolution workflow. Retention remains a Logs & Audit / platform retention policy question. PR-A's boundary declarations name Data Quality Exception as owned by Device Catalog.

- **A14.** No validation behavior is introduced in PR-A. Validation rules (e.g., "unknown Feature Group rejected at import," "deprecated Feature Value referenced in active assignment routes to review") live with the import/review workflows that produce them.

- **A15.** No API contract details, event names, or event-contract notes are introduced in PR-A. PR-C will define the consumption surfaces and event taxonomy. PR-A explicitly avoids `api-contracts.md`, `openapi-contracts.md`, `events.md`, and `event-contracts.md`.

### PR-B Assumptions (Device Catalog Feature Evidence Import and Review Workflow)

PR-B introduces the workflow layer on top of PR-A's Feature Evidence Foundation. The following assumptions are made by PR-B and should be flagged for confirmation during review:

- **PR-B A1.** PR-A (PR #87) is merged into main. PR-B's data-model additions promote PR-A's concept-only entities (Compatibility Marker, Data Quality Exception) to full entity definitions; PR-B's workflows depend on PR-A's entities (Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence) existing.

- **PR-B A2.** PR-A's two authority classes (Feature Taxonomy Authority, Device Feature Assignment / Correction Authority) are present in `permissions.md`. PR-B builds on these without introducing new classes; PR-B's Override Discipline references both classes by name.

- **PR-B A3.** Device Type is an existing concept in Device Catalog. PR-B's workflows reference Device Type for row identification and Device Capability Profile lookup.

- **PR-B A4.** `architecture/standards/import-export-validation-governance.md` is the canonical platform standard for header validation, row validation, error / warning / review-required classification, locked field protection, UPC / text identifier preservation, date / time / timezone governance, and audit-ready import evidence. PR-B delegates to the platform standard where applicable; PR-B does not modify the standard.

- **PR-B A5.** Tenant Company `check_access` is the authority resolution mechanism (assumed by PR-A A6). PR-B's authority-gated actions (taxonomy actions, assignment actions, exception transitions, override actions) consult `check_access`.

- **PR-B A6.** Logs & Audit owns the immutable audit record (assumed by PR-A A7). PR-B's audit references (CSV import audit, normalization approval audit, Feature Value creation audit, Data Quality Exception transition audit, regeneration audit, signal-raised audit, override audit) are produced by PR-B workflows and consumed by Logs & Audit.

- **PR-B A7.** PR-A's `assignment_source` enumeration (`csv_import`, `system_admin_direct_edit`, `compatibility_marker_normalization`, reserved `manufacturer_api`, `distributor_api`, `migration`) is unchanged. PR-B's workflows use `csv_import`, `system_admin_direct_edit`, and `compatibility_marker_normalization` only. Reserved values remain reserved.

- **PR-B A8.** PR-A's Compatibility Marker normative clarifications remain in force. PR-B does not change the meaning of "not final feature truth," "not authoritative compatibility evidence," "not a Product Catalog compatibility assertion," "not exposed to Product Catalog as compatibility decision." PR-B adds entity shape (fields, lifecycle, audit) without altering meaning.

- **PR-B A9.** PR-A's Data Quality Exception concept-only block remains in `data-model.md`. PR-B's full-entity block layers on top. The PR-A normative clarifications are preserved.

- **PR-B A10.** Device Capability Profile content (which Feature Groups are required / optional / unsupported / review-required per Device Type) remains a product / business decision deferred per PR-A OQ 1. PR-B's applicability-driven validation rules are well-defined at workflow level but activate only when Profile content exists; absent Profile content for a Device Type, the workflow proceeds without applicability gating.

- **PR-B A11.** The compatibility-impacting review signal is a *concept* in PR-B. PR-C defines the signal's named event and payload contract. Transport semantics, idempotency / replay / retry behavior, and broker / Integration Management implementation remain Integration Management / platform concerns.

- **PR-B A12.** Suggested Normalization is a Device Catalog-internal workflow-supporting entity. It is not consumed by Product Catalog. Other modules do not consume Suggested Normalization records. Phase 1's `automated_rule_proposal` source produces suggestions without AI Agent Services involvement.

- **PR-B A13.** "Corrected" is auditable history, not a persistent Data Quality Exception lifecycle state. The persistent states are `created`, `under_review`, `resolved`, `dismissed`, `unresolved`. Correction actions during `under_review` produce history entries but do not transition the exception out of `under_review`.

- **PR-B A14.** Override Discipline applies uniformly across the five named cases (retired Feature Value override, Profile mismatch override, unresolved acceptance override, force-commit with warnings override, regeneration failure continuation override). Evidence requirements are identical: actor, reason, timestamp, affected entity / reference, before / after where applicable, audit reference. Validation rule `OVERRIDE_AUDIT_EVIDENCE_MISSING` fires for any override missing complete evidence.

- **PR-B A15.** No Resolution Authority class is introduced in PR-B. Data Quality Exception lifecycle transitions are gated on Device Feature Assignment / Correction Authority. PR-A OQ 4 is hereby resolved: no separate Resolution Authority class in Phase 1.

- **PR-B A16.** The "Master Device Import Template" referenced in `phase-1-csv-import.md` is assumed to exist per that file's baseline content. PR-B does not introduce the template definition; it adds Feature-Group-related column mapping rules referencing the existing template.

- **PR-B A17.** PR-B does not introduce API contracts, OpenAPI schemas, event names, event payload contracts, or transport semantics. These remain PR-C territory. PR-B's references to the compatibility-impacting review signal use generic concept language only.

- **PR-B A18.** PR-B does not modify any Product Catalog file. The Product-Catalog side of the boundary (consumption discipline; refusal to mutate Device Catalog state; ownership of accessory compatibility assertions) is expected to be declared by Product Catalog's own boundary or validation work (in-flight Product Catalog Section 12 work / PR #85, where present). PR-B does not require Product Catalog files to be present on main.

### PR-C Assumptions (Device Catalog Feature Evidence Contracts and Signals)

PR-C introduces the contract / signal layer on top of PR-A and PR-B. The following assumptions are made by PR-C and should be flagged for confirmation during review:

- **PR-C A1.** PR #87 (PR-A - Feature Evidence Foundation) and PR #88 (PR-B - Feature Evidence Import and Review Workflow) are merged into main. PR-C's events and APIs reference PR-A entities (Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence) and PR-B workflows / entities (Compatibility Marker full entity, Suggested Normalization, Data Quality Exception full entity, Device Capability Evidence Regeneration).

- **PR-C A2.** PR-A's two authority classes (Feature Taxonomy Authority, Device Feature Assignment / Correction Authority) are present in `permissions.md`. PR-C events reference these authorities by name; PR-C APIs reference them for authority enforcement. PR-C does not introduce new authority classes.

- **PR-C A3.** PR-B's Override Discipline with `OVERRIDE_AUDIT_EVIDENCE_MISSING` cross-cutting reason code is present in `permissions.md`. PR-C events for `device.data-quality-exception.unresolved` and `device.compatibility-impacting-review-signal.raised` (when carrying `outcome = failure` plus Case 5 override) reference Override Discipline audit references in their payloads.

- **PR-C A4.** Logs & Audit owns the immutable audit record. PR-C events carry `auditReference` to the Logs & Audit record produced by the originating action. Audit content is owned by Logs & Audit, not by Device Catalog.

- **PR-C A5.** Tenant Company `check_access` is the authority resolution mechanism for both PR-C API calls and PR-C event scope enforcement at the consumer side. PR-C does not contract `check_access` semantics; PR-C references the consultation point.

- **PR-C A6.** Integration Management owns transport. Event broker, delivery guarantees, retry mechanics, dead-letter, replay machinery, broker-side acknowledgement are Integration Management's concerns. PR-C describes architecture-level expectations only.

- **PR-C A7.** Legacy Device Catalog event names (e.g., `device.import.validation-failed`, `device.buyer-portfolio.changed`) follow the `device.<entity>.<verb-past-tense>` convention or are sufficiently aligned that PR-C's additive events do not create style drift. If legacy names use materially different patterns, PR-C OQ on event-naming normalization captures the question without forcing PR-C to retrofit.

- **PR-C A8.** PR-C event names are **additive only**. PR-C does not rename, deprecate, replace, or modify any legacy event name. If a legacy event name covers a concern PR-C also covers (improbable, but flagged), PR-C does not deduplicate; both names remain in the taxonomy.

- **PR-C A9.** Product Catalog is the primary anticipated consumer of PR-C events and APIs. PR-C does not require Product Catalog to be present on main; PR-C contracts the Device-Catalog producer side independently. Product Catalog consumption discipline (idempotency, reference-callback, scope enforcement, no write-back to Device Catalog) is described in `event-contracts.md` PR-C section as **consumer responsibilities** - what consumers must do - without contracting Product Catalog implementation.

- **PR-C A10.** The compatibility-impacting review signal concept (PR-B Workflow 6) is unchanged by PR-C. PR-C names the event (`device.compatibility-impacting-review-signal.raised`), contracts its minimum payload shape, and describes consumer responsibilities. PR-C does not redefine when the signal is raised; PR-B's consumer-safety rule is authoritative.

- **PR-C A11.** Acknowledgement is transport-layer / Integration Management behavior. Device Catalog does not expose a command-style acknowledgement endpoint. Product Catalog acknowledgement, if implemented at the broker, does not command Device Catalog or tell Device Catalog what Product Catalog will do downstream. PR-C describes this at architecture level only.

- **PR-C A12.** Redaction class enumeration (`internal`, `tenant_scoped`, `buyer_scoped`) is a proposal-level starter set in PR-C. All PR-C events are `internal`. PR-C does not enable `buyer_scoped` event payloads; buyer portfolio references are not carried in PR-C event payloads.

- **PR-C A13.** Event versioning uses an integer scheme starting at `1` for all PR-C events. The exact versioning conventions (when to bump, how consumers handle unknown versions) are platform-standard scope; PR-C declares `eventVersion` exists and starts at `1` for PR-C events. Future events bump as needed; rules deferred per PR-C OQ.

- **PR-C A14.** PR-C events carry references, not embedded entity content. Consumers wanting content read it via the PR-C `api-contracts.md` placeholders. Reference-first discipline preserves single-source-of-truth integrity from PR-A and minimizes payload-redaction surface.

- **PR-C A15.** Raw Compatibility Markers are not surfaced externally. PR-C events do not carry raw marker values. PR-C APIs do not return raw marker content. PR-A's normative clarification (Compatibility Marker is not exposed to Product Catalog as compatibility decision) is preserved.

- **PR-C A16.** Idempotency on the consumer side is required; PR-C does not contract producer-side dedup. Consumers handle redelivery via `eventId` as dedup key. Strict-ordering delivery is not contracted; consumers absorb out-of-order events via `eventVersion`, `occurredAt`, and entity `version` fields.

- **PR-C A17.** No PR-C API mutates feature truth. PR-C surfaces are read-only / lookup-only. Mutation is PR-B workflow surface territory; mutation does not become a PR-C API. This preserves the workflow-vs-contract separation between PR-B and PR-C.

- **PR-C A18.** PR-C does not modify Product Catalog files. PR-C does not require Product Catalog to declare a corresponding consumption-side contract; the Product-Catalog side of the boundary is expected to be declared by accepted / in-flight Product Catalog work (Product Catalog Section 12 / PR #85) where present. PR-C states the Device-Catalog producer side independently.

- **PR-C A19.** PR-C does not modify `openapi-contracts.md`, `boundary-contracts.md`, `data-model.md`, `workflows.md`, `permissions.md`, or `phase-1-csv-import.md`. PR-C does not modify Tenant Company files, downstream module specs, ADRs, platform standards, or runtime / code / schema / migration files. PR-C target files are: `api-contracts.md`, `events.md`, `event-contracts.md`, `README.md`, `assumptions-open-questions.md`, `test-scenarios.md`, `edge-cases.md`.

## Scale Assumptions

These assumptions are placeholders for pressure testing architecture choices. They should be replaced with measured or business-approved targets before implementation.

### Devices Per Manufacturer

- Placeholder: define expected minimum, typical, and maximum canonical device counts per manufacturer.
- Placeholder: define expected active, discontinued, historical, announced, and region-limited device counts per manufacturer.
- Placeholder: define whether manufacturers with many brands or model families need separate partitioning or ownership review.

### Device Records

- Placeholder: define expected minimum, typical, and maximum canonical device counts across the platform.
- Placeholder: define expected manufacturer, brand, model, variant, carrier, region, and taxonomy breadth.
- Placeholder: define expected growth rate for historical, current, and announced devices.
- Placeholder: define expected merge, split, supersession, and retirement rates.

### Phase 1 CSV Import Volume

- Placeholder: define expected rows per Phase 1 CSV import.
- Placeholder: define maximum allowed CSV file size and row count.
- Placeholder: define expected frequency of System Admin imports.
- Placeholder: define whether imports are all-or-nothing, partial success, or correction-before-commit.
- Placeholder: define correction volume, validation failure rate, retry frequency, and audit retention needs.

### Identifiers And Aliases Per Device

- Placeholder: define expected identifiers per device across manufacturers, carriers, regions, feeds, vendors, and buyer aliases.
- Placeholder: define expected duplicate, merge, split, supersession, and alias rates.
- Placeholder: define expected identifier namespace count and collision rate.
- Placeholder: define lookup latency targets for Device Reference resolution.

### Aliases Per Buyer

- Placeholder: define expected buyer-specific aliases per buyer and per buyer device portfolio.
- Placeholder: define whether buyer aliases are used only for export formatting or also for buyer search/list behavior.
- Placeholder: define retention and audit expectations for buyer aliases after device merge, split, or supersession.

### Buyer Portfolios Per Tenant

- Placeholder: define expected number of buyer portfolios per tenant, parent company, and child entity.
- Placeholder: define expected Device References per buyer portfolio.
- Placeholder: define whether portfolios inherit from parent to child, are child-specific, or are managed by buyer-facing modules.
- Placeholder: define isolation and lookup targets for 100 enterprise buyers with distinct portfolios.

### Import Volume

- Placeholder: define expected records per API import batch.
- Placeholder: define expected CSV or file fallback size and row count.
- Placeholder: define concurrency expectations for multiple manufacturer or external feed imports in future phases.
- Placeholder: define partial success, retry, and manual review thresholds.

### Export Sizes And Concurrency

- Placeholder: define expected buyer export size, frequency, and concurrency.
- Placeholder: define whether exports are synchronous, asynchronous, or both.
- Placeholder: define download retention and regeneration expectations.
- Placeholder: define throttling, queueing, and backpressure behavior for concurrent large buyer exports.
- Placeholder: define export latency targets for buyer-visible device data.

### Event Fanout And Replay Volume

- Placeholder: define expected device events per import batch, merge, split, supersession, taxonomy update, visibility change, image-readiness change, and lifecycle update.
- Placeholder: define expected fanout to Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, buyer-facing modules, and future Procurement.
- Placeholder: define replay volume and retention needs for global canonical events versus tenant-scoped export or portfolio events.
- Placeholder: define consumer lag tolerance for Product Catalog compatibility reference refresh.
- Placeholder: define dead-letter and replay rules for high-volume merge, split, supersession, Phase 1 import, visibility, and image-readiness events.

### Device Reference Lookup Latency

- Placeholder: define lookup latency targets for single Device Reference resolution.
- Placeholder: define bulk lookup latency targets for Product Catalog compatibility validation, buyer exports, analytics rebuilds, and future procurement line references.
- Placeholder: define cache freshness and invalidation expectations after merge, split, supersession, or deprecation.
- Placeholder: define behavior when lookup is unavailable, stale, or returns unresolved reference state.

## Open Questions

- What is the canonical device granularity: model, variant, carrier/region variant, SKU, or another level?
- Which device identifiers are canonical across manufacturers, buyers, carriers, regions, and external feeds?
- Which device data fields are manufacturer-owned, CIXCI-governed, buyer-editable, externally sourced, or unresolved?
- Which source authority precedence rules should apply when manufacturer, vendor, buyer alias, CIXCI, and external feed values conflict?
- What exact controlled Device Type values are approved for Phase 1?
- Which fields are required versus conditionally required by Device Type?
- What date format is canonical for Launch Date?
- Should header casing and whitespace be normalized or treated as exact-match validation failures?
- Is Phase 1 import all-or-nothing, partial success, or correction-before-commit?
- What default Buyer Visibility Status applies to non-future imported devices?
- What Device Image Readiness Reference shape should Device Catalog record from Media Management-owned image evidence?
- How should Compatibility Markers be structured before Product Catalog or a future Compatibility Authority owns compatibility assertions?
- Which buyer device export/download workflows are owned by Device Catalog versus buyer-facing modules?
- What fields, versioning, authorization evidence, and audit references should Buyer Device Portfolio References carry now that Device Catalog owns the reference?
- How should Product Catalog react when a Device Reference is retired, merged, split, region-limited, deprecated, redirected, or changed?
- When does compatibility mapping need a separate Compatibility Authority context?
- When does cross-domain canonicalization need a future Identity Resolution context?
- What future Procurement / Purchase Orders module needs from Device Catalog without moving procurement workflow here?
- What device data volume, export volume, and manufacturer purchase order reference volume should the architecture assume?

### PR-A Open Questions (Device Catalog Feature Evidence Foundation)

Each PR-A open question is classified per the project's open-question discipline:

- **Decide now** - must be resolved before materially changing the PR-A foundation layer.
- **Defer with owner** - known unresolved; explicit owner / destination identified for resolution.
- **Defer to later section** - to be resolved by a later PR within Device Catalog or a related module.
- **Remove** - turned out to be unnecessary.

No PR-A open question is "Decide now" - PR-A is intentionally scoped as the foundational layer that establishes shape without resolving content or behavior. Resolution of "Decide now" items would expand PR-A's scope beyond the foundation.

- **PR-A OQ 1 - Exact required Feature Groups per Device Type.**
  - Classification: **Defer with owner - product / business decision team.**
  - Rationale: This is a content decision, not a spec decision. PR-A defines the shape (Device Capability Profile carries required / optional / unsupported / review-required applicability per Device Type per Feature Group); the content (which Feature Groups are required for phones, tablets, laptops, wearables, smart-home devices, etc.) requires real-world product and business input. PR-A must not invent this content.
  - Destination: A separate content-definition exercise feeding either a PR-B-adjacent content PR or a follow-up Device Catalog content PR.

- **PR-A OQ 2 - Whether a Device Catalog ADR is needed for the Device Type -> Device Capability Profile pattern.**
  - Classification: **Defer to later section - possible future ADR.**
  - Rationale: PR-A introduces a pattern that mirrors ADR-0007 (Category-Extensible Product Catalog) and PR #77 (Product Type Capability Profile Guardrail) on the device side. A symmetric Device Catalog ADR may be useful to codify the pattern. Not blocking for PR-A; surface to architecture review when next ADR review cycle runs.
  - Destination: ADR review cycle; not part of PR-A, PR-B, or PR-C.

- **PR-A OQ 3 - Device Capability Evidence freshness rules.**
  - Classification: **Resolved by PR-B import/review workflow layer.**
  - Rationale: PR-A declares that Device Capability Evidence carries a `freshness_state` (`current`, `stale`, `unknown`) and that consuming modules respect it. PR-B's workflow definitions now determine when regeneration is triggered and when evidence is marked stale.
  - Destination: Resolved in PR-B workflow documentation.

- **PR-A OQ 4 - Data Quality Exception lifecycle, resolver authority, and resolution workflow.**
  - Classification: **Resolved by PR-B import/review workflow layer, except retention.**
  - Rationale: PR-A declares Data Quality Exception as a concept-level evidence category and names Device Catalog as owner. PR-B defines lifecycle states, resolution workflow, and authority. Retention remains a Logs & Audit / platform retention policy question.
  - Destination: Lifecycle and authority resolved in PR-B workflow documentation; retention remains with Logs & Audit / platform retention policy.

- **PR-A OQ 5 - Feature Group and Feature Value key syntax rules.**
  - Classification: **Defer with owner - PR-B or platform standard normalization.**
  - Rationale: PR-A declares that `feature_group_key` and `feature_value_key` are lowercase snake_case but does not specify allowed character set, length bounds, reserved words, or collision detection. The exact syntax rules likely belong in the platform standard `architecture/standards/import-export-validation-governance.md` for consistency with other controlled key syntaxes, or in PR-B if Device-Catalog-specific.
  - Destination: Import/review workflow documentation and/or platform standard normalization.

- **PR-A OQ 6 - Taxonomy lifecycle transition rules.**
  - Classification: **Defer with owner - taxonomy governance / future workflow refinement.**
  - Rationale: PR-A declares proposal-level lifecycle states for Feature Group, Feature Value, and Device Capability Profile (`draft`, `active`, `deprecated`, `retired`). PR-A does not specify which transitions are allowed (e.g., can a `retired` Feature Group be restored to `active`?) or which transitions are blocked when active downstream references exist. Includes "what happens when a Feature Group is retired while active Device Feature Assignments reference it" - block, warn, route to Data Quality Exception, or all three.
  - Destination: Taxonomy governance / future workflow refinement.

- **PR-A OQ 7 - Device Type entity status on main.**
  - Classification: **Defer with owner - review against main during PR-A application.**
  - Rationale: PR-A assumes Device Type is an existing concept (Assumption A3). If Device Type does not exist on main as a discrete concept, PR-A's Device Capability Profile (which references Device Type) cannot be fully grounded. PR-A application should verify Device Type's presence on main. If absent, application stops; either Device Type is introduced first (a separate small PR) or PR-A is amended to lightly introduce Device Type as a stub.
  - Destination: Pre-application reconciliation, before PR-A is committed.

- **PR-A OQ 8 - Compatibility Marker naming.**
  - Classification: **Defer to later section - possible naming revisit.**
  - Rationale: "Compatibility Marker" has potential naming overlap with Product Catalog compatibility terminology (PR #79 Device Compatibility expression syntax, Compatibility Update Modes per PR #79, Compatibility-against-Device-Catalog orchestration in accepted / in-flight Product Catalog Section 12 boundary work from PR #85). The name is preserved in PR-A for consistency with the existing Phase 1 CSV context. If review or downstream PRs reveal that the naming creates persistent confusion, a rename to something like "Feature Hint," "Ingestion Marker," or "Phase 1 Feature Hint" is on the table. Device Catalog would lead the rename; consuming modules would follow.
  - Destination: Future naming cleanup, if naming friction surfaces.

### PR-B Open Questions (Device Catalog Feature Evidence Import and Review Workflow)

Each PR-B open question is classified per the project's open-question discipline:

- **Decide now** - must be resolved before materially changing the PR-B import/review workflow layer.
- **Defer with owner** - known unresolved; explicit owner / destination.
- **Defer to later section** - to be resolved by a later PR.
- **Remove because unnecessary** - turned out not to need resolution.

PR-B has no "Decide now" items. PR-B is the workflow layer; behavior is well-defined at architecture level. Remaining unknowns are content (Profile applicability), transport (PR-C event contracts), and retention / SLA (deferred specifically per the scope brief).

- **PR-B OQ 1 - Compatibility Marker retention period.**
  - Classification: **Defer with owner - Logs & Audit retention policy + platform standard normalization.**
  - Rationale: PR-A reserved retention as deferred. PR-B promotes Compatibility Marker to a full entity but does not assign a retention period. The right place for retention is the platform-standard import audit retention policy or a Logs & Audit retention class declaration.
  - Destination: Logs & Audit module spec or platform standard normalization.

- **PR-B OQ 2 - Data Quality Exception retention period for resolved / dismissed / unresolved states.**
  - Classification: **Defer with owner - Logs & Audit retention policy.**
  - Rationale: PR-B defines lifecycle states but does not assign retention. Resolved exceptions may be retained indefinitely for audit, archived after a period, or summarized; the policy is properly Logs & Audit's.
  - Destination: Logs & Audit module spec.

- **PR-B OQ 3 - Data Quality Exception notification routing.**
  - Classification: **Defer with owner - Notification Platform Service.**
  - Rationale: When a Data Quality Exception is created, who is alerted, how, and through what surface (in-app, email, ticket queue) is a notification-routing decision. PR-B specifies exception creation but not alert delivery.
  - Destination: Notification Platform Service spec.

- **PR-B OQ 4 - SLA / escalation behavior for unresolved Data Quality Exceptions.**
  - Classification: **Defer with owner - operations policy decision.**
  - Rationale: If a Data Quality Exception stays in `under_review` indefinitely, what happens? SLA-driven escalation is a business / operations policy concern, not a spec concern.
  - Destination: Operations policy; may eventually feed into a Notification Platform Service spec rule.

- **PR-B OQ 5 - Compatibility Marker retention strategy (preview vs. committed markers).**
  - Classification: **Defer with owner - Logs & Audit retention policy.**
  - Rationale: A Compatibility Marker produced during preview but never committed (the import was cancelled) - should it be retained for audit? PR-B is silent. The answer is a retention-policy decision.
  - Destination: Logs & Audit retention policy.

- **PR-B OQ 6 - Suggested Normalization confidence indicator semantics.**
  - Classification: **Defer to later section - PR-C or implementation.**
  - Rationale: PR-B leaves `proposal_confidence_indicator` opaque (for review-UX context only; no scoring semantics defined). When PR-C contracts the consumer-facing surface, the question of whether confidence has cross-module meaning or remains UX-only may need a decision.
  - Destination: Resolved by PR-C contracts/signals layer.

- **PR-B OQ 7 - Reason references: structured vs. freeform.**
  - Classification: **Defer with owner - UX / process design decision.**
  - Rationale: PR-B uses `reason reference` fields in multiple places (rejection_reason_reference, dismissal_reason_reference, override reason, reopen reason). Whether these are structured (controlled values) or freeform is open. Structured supports analytics; freeform supports nuance.
  - Destination: UX / process design decision, possibly feeding a later platform standard normalization.

- **PR-B OQ 8 - Compatibility-impacting review signal: granularity of payload.**
  - Classification: **Resolved by PR-C contracts/signals layer.**
  - Rationale: PR-B describes conceptual payload intent (Device reference, evidence reference, change classification, audit reference). PR-C now defines the compatibility-impacting review signal minimum shape using references plus categorical delta, not a full evidence snapshot.
  - Destination: Resolved in PR-C event-contract documentation.

- **PR-B OQ 9 - Master Device Import Template versioning.**
  - Classification: **Defer with owner - `phase-1-csv-import.md` template version content or platform-standard import template versioning.**
  - Rationale: PR-B references the Master Device Import Template by name but does not version it. When columns are added, removed, or renamed, the template needs a versioning convention. Likely lives in `phase-1-csv-import.md` or in a platform-standard import-template versioning section.
  - Destination: `phase-1-csv-import.md` evolution or platform standard.

- **PR-B OQ 10 - Concurrent System Admin actions on the same Device Feature Assignment.**
  - Classification: **Defer to later section - implementation / concurrency design.**
  - Rationale: PR-B states that a Device may have at most one `active` Device Feature Assignment per (Device, Feature Group) pair, and that approving a new assignment supersedes the prior. PR-B does not specify behavior when two System Admins approve different Suggested Normalizations for the same (Device, Feature Group) concurrently. Likely last-write-wins with audit visibility on the superseded; the implementation may choose stricter (optimistic locking with conflict resolution).
  - Destination: Implementation / concurrency design.

### PR-C Open Questions (Device Catalog Feature Evidence Contracts and Signals)

Each PR-C open question is classified per the project's open-question discipline:

- **Decide now** - must be resolved before materially changing the PR-C contracts/signals layer.
- **Defer with owner** - known unresolved; explicit owner / destination.
- **Defer to later section** - to be resolved by a later PR.
- **Remove because unnecessary** - turned out not to need resolution.

PR-C has no "Decide now" items. PR-C is the contract / signal layer; remaining unknowns are platform-wide normalizations (versioning, redaction classes, event naming style), implementation (broker, transport), and content (Profile applicability content per PR-A OQ 1, which PR-C inherits).

- **PR-C OQ 1 - Event versioning scheme normalization.**
  - Classification: **Defer with owner - platform event/versioning standard.**
  - Rationale: PR-C declares `eventVersion` starts at `1` for all PR-C events. Exact bump rules (additive-field-no-bump vs. additive-field-bumps-minor vs. breaking-change-bumps-major; how consumers handle unknown versions; deprecation windows) are platform-wide concerns, not Device-Catalog-specific. Likely belongs in a platform standard for event versioning.
  - Destination: Platform event/versioning standard normalization.

- **PR-C OQ 2 - Redaction class enumeration normalization.**
  - Classification: **Defer with owner - platform redaction-class standard.**
  - Rationale: PR-C uses a starter set (`internal`, `tenant_scoped`, `buyer_scoped`). The platform may have a broader enumeration (e.g., `public`, `audit_only`, `crypto_sensitive`) that PR-C does not anticipate. Normalization across all CIXCI events is a platform-standard concern.
  - Destination: Platform redaction-class standard.

- **PR-C OQ 3 - Event naming style platform normalization.**
  - Classification: **Defer to later section - platform event-naming standard, if needed.**
  - Rationale: Legacy Device Catalog event names use the `device.<entity>.<verb-past-tense>` pattern (or close variants). PR-C's additive events follow the same pattern. Whether all CIXCI modules should normalize to this convention is a platform-wide concern beyond Device Catalog scope. PR-C does not force the normalization; if needed, a follow-up platform standard captures the convention.
  - Destination: Platform event-naming standard, if needed.

- **PR-C OQ 4 - `consumerActionHint` value-space normalization.**
  - Classification: **Defer to later section - PR-C evolution.**
  - Rationale: PR-C proposes three values (`no_action_expected`, `review_recommended`, `review_required_for_consumer_safety`). Whether more values are needed (e.g., `review_urgent`, `review_after_grace_period`) depends on real-world Product Catalog consumption patterns. If patterns emerge that justify finer granularity, a focused follow-up PR amends the value space without renaming existing values.
  - Destination: Future PR-C evolution.

- **PR-C OQ 5 - `categoricalDelta` value-space normalization.**
  - Classification: **Defer to later section - PR-C evolution.**
  - Rationale: PR-C proposes a starter set (`feature_assignment_added`, `feature_assignment_removed`, etc.). The full value space depends on how often consumers branch logic on the delta vs. just doing a callback to read current evidence. If granularity is over- or under-pitched, a focused follow-up PR amends the value space.
  - Destination: Future PR-C evolution.

- **PR-C OQ 6 - `changeReasonReference` shape.**
  - Classification: **Defer with owner - overlaps with PR-B OQ 7 (reason references: structured vs. freeform).**
  - Rationale: PR-C's compatibility-impacting review signal contract carries `changeReasonReference` distinct from `categoricalDelta`. Whether reason is a structured controlled-value reference or a freeform-bounded string is open - and overlaps with PR-B OQ 7 (which is open for rejection reasons, dismissal reasons, override reasons, reopen reasons). A platform-wide reason-reference normalization could resolve both.
  - Destination: UX / process design decision, possibly feeding a later platform standard normalization.

- **PR-C OQ 7 - API authentication and authorization implementation.**
  - Classification: **Defer with owner - platform API authentication / authorization standard.**
  - Rationale: PR-C placeholders state every call consults Tenant Company `check_access`. The mechanism of consultation (bearer token, mTLS, internal service mesh, etc.) is platform implementation. PR-C does not contract.
  - Destination: Platform API authentication / authorization standard.

- **PR-C OQ 8 - API versioning scheme.**
  - Classification: **Defer with owner - platform API versioning standard.**
  - Rationale: PR-C's API placeholders do not specify URL paths or version negotiation conventions. Whether path-versioning (`/v1/...`), header-versioning, or content-negotiation is the platform convention is open.
  - Destination: Platform API versioning standard.

- **PR-C OQ 9 - Replay window and retention.**
  - Classification: **Defer with owner - Integration Management / platform broker standard.**
  - Rationale: PR-C describes replay as transport-layer concern (Integration Management). Retention windows, on-demand replay authorization, replay-since-timestamp authorization are open at the Integration Management / broker level.
  - Destination: Integration Management module spec or platform broker standard.

## Decisions Needed

- Device identity and deduplication strategy.
- Manufacturer, brand, model, variant, region, and carrier hierarchy rules.
- Phase 1 CSV template versioning and validation behavior.
- Phase 1 all-or-nothing, partial success, correction, and retry behavior.
- System Admin import audit and retention policy.
- Device status, buyer visibility, future Launch Date, and image-readiness gating model.
- Device Reference stability and predecessor/successor semantics.
- Immutable, redirected, deprecated, retired, and unresolved Device Reference behavior.
- Source authority and field-level ownership strategy.
- Buyer export/download contract and authorization model.
- Buyer Device Portfolio Reference shape, versioning, authorization, and audit model.
- Event payload strategy: snapshot, delta, reference-only, or mixed.
- Event payload redaction strategy by consumer class.
- Import validation and partial failure behavior.

## Risks

- Device Catalog could absorb Product Catalog if compatibility assertions or accessory product behavior move here.
- Device Catalog could absorb Procurement if future purchase order references become purchase order workflow ownership.
- Device Catalog could absorb Media Management if image upload, processing, validation, storage, matching, renditions, media audit, transformation, CDN, rights, or public image URL policy moves here by accident.
- Device Catalog could leak tenant-specific buyer portfolio or export state through platform-wide canonical device records.
- Device Catalog could leak into buyer-facing workflow ownership if portfolio references become task progress, approval, UX, or buyer decision state.
- Poor Device Reference stability could break Product Catalog compatibility mappings and downstream order-time validation.
- Phase 1 CSV import could create duplicate or conflicting canonical records if uniqueness, header validation, and row validation are not strict.
- Future Launch Date devices could leak to buyers before System Admin visibility approval.
- Devices could appear in All Devices or My Devices without images if image-readiness gating is not explicit.
- Manufacturer, vendor, buyer alias, and external feed identifier collisions could create false merges or false splits without namespace and precedence rules.
- Events could leak tenant-scoped export, portfolio, visibility, or eligibility data if payload boundaries are unclear.
- High-volume merge, split, supersession, import, visibility, and export events could overwhelm downstream consumers without replay, redaction, and fanout controls.

### PR-A Risks (Device Catalog Feature Evidence Foundation)

- **R1. PR-A's entity shape needs PR-B-driven revision.** PR-A defines Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, and Device Capability Evidence with intentional completeness on the property side. If PR-B's workflow design reveals that the entity shape is insufficient (e.g., missing fields required for the import workflow), PR-A may need follow-up amendment. Mitigation: PR-A leans toward over-inclusion on entity properties; PR-B is expected to add behavior, not entity fields.

- **R2. Device Type assumption (A3 / OQ 7) can drift.** If Device Type stops being maintained as a discrete concept, PR-A's Device Capability Profile becomes structurally orphaned. Mitigation: keep Device Type references aligned when Device Catalog taxonomy changes.

- **R3. Product Catalog boundary declarations may drift.** The boundary that "Product Catalog must not mutate Device Catalog feature evidence" is declared on the Device-Catalog side in `boundary-contracts.md` (PR-A) and may also be declared on the Product-Catalog side. If both sides drift over time, the platform has two slightly different statements of the same rule. Mitigation: PR-A's boundary discipline is to declare the Device-Catalog side independently; future drift correction is a normalization PR.

- **R4. Compatibility Marker name causes downstream confusion.** PR-A preserves the name despite the overlap risk with Product Catalog compatibility terminology. The risk is that developers, reviewers, or downstream PRs misuse the term - e.g., treating Compatibility Marker state as authoritative compatibility evidence, or conflating it with PR #79's Device Compatibility field. Mitigation: PR-A's data-model and boundary-contracts both explicitly state Compatibility Marker is not authoritative and is not exposed to Product Catalog as a compatibility decision. PR-A OQ 8 reserves the right to rename later.

- **R5. PR-A's concept-only declarations (Compatibility Marker, Data Quality Exception) leave PR-B free to deviate.** A concept declared at PR-A's level but fully defined at PR-B's level is at risk of PR-B introducing an entity shape that doesn't match PR-A's conceptual framing. Mitigation: PR-A's concept text is normative - it states what Compatibility Marker and Data Quality Exception are and are not. PR-B is expected to honor the PR-A framing; deviations require explicit revision PR.

- **R6. The "lightweight" qualifier on Device Capability Profile is interpretable.** PR-A uses "lightweight" to mean "applicability classes per (Device Type, Feature Group), not a rules engine." Future evolution could interpret this as license to add behavioral rules to the Profile entity itself. Mitigation: PR-A explicitly states the Profile is not a rules engine; behavioral interpretation lives in consuming modules' validation rules. This discipline parallels Product Catalog Capability Profile per PR #77.

- **R7. Feature Group / Feature Value key syntax (OQ 5) leaves room for divergent practice.** Until syntax rules are normalized (platform standard or PR-B), different operators may create keys with subtly different conventions (e.g., `usb_c` vs `usbc` vs `usb-c`). Mitigation: PR-A flags this explicitly as OQ 5. PR-B's import workflow should surface inconsistent keys as Data Quality Exceptions during normalization.

- **R8. PR-A's `boundary-contracts.md` additions are substantial.** If future edits reorganize the file by consuming module rather than by category, the PR-A framing may need to be moved rather than duplicated. Mitigation: keep future edits additive and preserve the canonical boundary sections.

- **R9. The "what Device Catalog does NOT own" enumeration in boundary-contracts.md (PR-A) is necessarily incomplete.** PR-A enumerates the boundaries relevant to feature evidence (accessory compatibility, image processing, users/roles, Buyer UX, audit, commercial concerns, AI). Other Device-Catalog-adjacent boundaries may exist that PR-A does not enumerate. Mitigation: PR-A's enumeration is scoped to feature evidence; further boundaries should be added in their respective hardening PRs.

- **R10. Phase 1 ingestion source restriction relies on permissions discipline.** PR-A declares that Phase 1 ingestion is CIXCI System Admin CSV only and that other actors must not write feature evidence. Enforcement of this restriction depends on Tenant Company `check_access` and on Device Catalog correctly invoking authority class checks. Mitigation: PR-A declares the authority classes explicitly; PR-B's workflows enforce them at the relevant gates.

### PR-B Risks (Device Catalog Feature Evidence Import and Review Workflow)

- **PR-B R1. The non-collapsible state chain may be flattened in implementation.** PR-B insists that Compatibility Marker, Suggested Normalization, Device Feature Assignment, and Device Capability Evidence are architecturally distinct states. An implementation that collapses two of these (e.g., treating an approved Suggested Normalization as if it were the Device Feature Assignment) breaks the audit trail and the boundary discipline. Mitigation: PR-B's data-model entities are individually defined; the workflows explicitly transition between them; reviewers should reject implementations that collapse the chain.

- **PR-B R2. Override Discipline becomes an escape hatch.** If overrides become routine - applied to most CSV imports, most exception closures - the Override Discipline loses meaning. Mitigation: PR-B's audit requirements are strict (reason required, audit reference required, validation fails on missing evidence). Post-rollout review should track override frequency by case; high frequency on any one case suggests the underlying standard rule may need revision rather than continued override.

- **PR-B R3. Suggested Normalization confidence indicator is misinterpreted as feature truth.** PR-B explicitly states the confidence indicator is opaque and for review-UX context only, with no cross-module meaning. There is a real risk a downstream consumer treats high-confidence suggestions as if approved. Mitigation: PR-B's discipline ("a suggested normalization is not the same as an approved normalization") is restated in `spec.md`, `data-model.md`, `boundary-contracts.md`, and `workflows.md`. PR-C should not contract confidence as a cross-module field.

- **PR-B R4. Automated rule proposal becomes auto-approval.** `automated_rule_proposal` is a Suggested Normalization source, not an approval. PR-B prohibits auto-approval. Risk: an implementation introduces a "high-confidence auto-approval" optimization that bypasses System Admin review. Mitigation: PR-B's permissions are explicit that approval requires explicit System Admin action; PR-B's `data-model.md` Suggested Normalization lifecycle requires `approved_by` actor reference. Auto-approval would violate audit requirements.

- **PR-B R5. Data Quality Exception lifecycle thrash.** An exception that bounces between `under_review` and terminal states without converging suggests workflow flaws (e.g., a Feature Value keeps being deprecated and restored). PR-B's reopening preserves history but does not bound the count. Mitigation: PR-B OQ 4 SLA / escalation will eventually backstop thrash; for now, audit visibility is the discipline.

- **PR-B R6. Regeneration failures accumulate unnoticed.** If `outcome = failure` produces a Data Quality Exception but no other signal, and the exception is not promptly acknowledged, Device Capability Evidence may remain stale for many Devices. Product Catalog sees stale evidence freshness but may not catch the cumulative effect. Mitigation: PR-B OQ 3 (notification routing) and PR-B OQ 4 (SLA / escalation) backstop this; PR-B does not solve it directly.

- **PR-B R7. Compatibility-impacting review signal is over-raised.** PR-B's consumer-safety rule errs on the side of raising the signal when in doubt (Device Catalog does not know which Feature Groups Product Catalog filters on). If the signal is raised too often, Product Catalog may filter or ignore the noise, defeating the purpose. Mitigation: PR-C may introduce a Product-Catalog-side filter as part of the consumption contract; PR-B does not anticipate that and intentionally over-emits.

- **PR-B R8. Compatibility-impacting review signal is under-raised.** Conversely, if the consumer-safety rule is interpreted too narrowly, real changes may not surface. Mitigation: PR-B's rule explicitly says "any Feature Group that any Product Catalog accessory compatibility assertion currently filters on" - Product Catalog filtering is the determinant; PR-B does not maintain a list. Over-raising is the bias.

- **PR-B R9. Feature Value creation during import becomes the norm.** If System Admin routinely creates new Feature Values during every import to handle vendor-specific naming variations, the controlled taxonomy grows uncontrolled. Mitigation: PR-B's workflow requires reason + audit on creation; routine creation should surface in audit review. Feature Taxonomy Authority's standalone curation workflow (separate from import) is the right place for taxonomy hygiene; PR-B does not define that workflow.

- **PR-B R10. PR-B's CSV-side content drifts from `phase-1-csv-import.md` template content.** PR-B adds Feature-Group-related column mapping rules referencing a Master Device Import Template the bundle does not see. If template content (column names, separator conventions) drifts from PR-B's references, the mapping rules become incoherent. Mitigation: PR-B references the template by name without restating it; future template changes should review PR-B's mapping rules. PR-B OQ 9 (template versioning) backstops drift detection.

- **PR-B R11. Phase 1 ingestion source restriction relies on permissions discipline.** PR-A flagged this risk; PR-B inherits it. Manufacturer / distributor / API ingestion remains future-facing; permission classes are the protection. If the protection is bypassed (e.g., a workflow inadvertently accepts a non-System-Admin actor), Phase 1 boundary is breached. Mitigation: PR-B's authority-gated workflows consult Tenant Company `check_access` at every gate; review should verify no workflow path bypasses `check_access`.

- **PR-B R12. `corrected`-as-history discipline is misimplemented.** If an implementation models `corrected` as a state (UI checkbox, database column, query filter), the persistent-vs-history distinction is lost. Mitigation: PR-B's `data-model.md` is explicit; reviewers should reject implementations that model `corrected` as state.

- **PR-B R13. The bundle is large.** PR-B is materially larger than PR-A (workflows are wordier than entity definitions). Review fatigue may produce missed contradictions. Mitigation: this bundle's structure mirrors PR-A's discipline (append-blocks; targeted insertions; explicit duplicate-detection pre-flights); Codex's review should catch inconsistencies. The reviewer checklist in `PR_BODY.md` is granular.

### PR-C Risks (Device Catalog Feature Evidence Contracts and Signals)

- **PR-C R1. The compatibility-impacting review signal is treated as a Product Catalog command.** PR-C explicitly states the signal is not a command; `consumerActionHint` is advisory. The risk is that an implementation, a consumer, or future PR-C evolution treats `review_required_for_consumer_safety` as a hard requirement on Product Catalog, eroding the PR-A / PR-B boundary discipline. Mitigation: PR-C's `event-contracts.md` and `events.md` repeat the non-command discipline; reviewer checklist verifies; risk surface monitored across consumer integrations.

- **PR-C R2. Raw Compatibility Markers leak externally.** PR-C events and APIs do not surface raw marker values; PR-A normative clarifications are preserved. The risk is that an implementation, an audit consumer, or a debugging tool inadvertently exposes marker raw values via a PR-C surface (e.g., a Device Feature Assignment lookup response that includes marker-content debugging fields). Mitigation: PR-C contracts surface only marker references, not content; reviewer checklist verifies; observability tooling should treat marker raw values as Device-Catalog-internal.

- **PR-C R3. Buyer portfolio data leaks into global events.** PR-C events are `internal` redaction class and do not carry buyer-scoped content. The risk is that a future PR-C evolution adds a buyer-related field (e.g., "this Device is in N buyer portfolios") without bumping redaction class, leaking buyer-scope data to broad consumers. Mitigation: PR-C event contracts are explicit about field set; redaction class is per-event; PR-C OQ 2 captures redaction normalization.

- **PR-C R4. Tenant-specific eligibility leaks into global events.** Similarly, the risk is that an event carries tenant-specific eligibility content (e.g., "Tenant T's eligibility to consume this Device is X") without tenant-scope enforcement. Mitigation: PR-C events are `internal` and do not carry tenant-scoped state; broader-than-internal redaction classes require explicit upgrade.

- **PR-C R5. Idempotency / replay / retry over-defined.** PR-C describes architecture-level expectations only and leaves transport implementation to Integration Management. The risk is that PR-C evolution adds producer-side dedup, replay-window contracting, or retry-tuning to Device Catalog, crossing the architecture-vs-implementation boundary. Mitigation: PR-C's `event-contracts.md` section explicitly delegates transport-layer behavior to Integration Management.

- **PR-C R6. Product Catalog mutation leakage via API.** No PR-C API mutates feature truth. The risk is that a future PR-C evolution introduces a "Product Catalog notifies Device Catalog of consumption" mutation API, blurring the one-way signal direction. Mitigation: PR-C `api-contracts.md` Placeholder 5b explicitly excludes a command-style acknowledgement endpoint; all PR-C APIs are read-only.

- **PR-C R7. Renaming legacy event names.** PR-C event names are additive. The risk is that a future PR-C amendment renames a legacy event name for consistency, breaking existing consumers. Mitigation: PR-C `events.md` is explicit about preserving legacy event names; PR-C is additive-only by discipline.

- **PR-C R8. OpenAPI / schema scope creep.** PR-C does not introduce OpenAPI schemas. The risk is that a future PR-C amendment (or implementation work picking up PR-C) introduces OpenAPI schemas under the PR-C umbrella, crossing the architecture-vs-implementation boundary. Mitigation: PR-C's reviewer checklist verifies no OpenAPI content; PR-C explicitly excludes `openapi-contracts.md` from target files.

- **PR-C R9. PR-C event taxonomy may turn out incomplete.** 20 PR-C events cover the families enumerated in the PR-C scope. Missing events (if any) may surface during consumer integration and require follow-up additive event PRs. Mitigation: PR-C's additive-only discipline means missing events can be added without rename; the inventory is documented; follow-up scope is bounded.

- **PR-C R10. Event-name pattern drift from legacy.** PR-C's additive events follow `device.<entity>.<verb-past-tense>`. If legacy events use a materially different pattern, PR-C events may stylistically clash with legacy events in the same taxonomy file. Mitigation: PR-C OQ 3 captures the question; PR-C does not retrofit legacy names; reviewer can assess drift severity post-application.

- **PR-C R11. `consumerActionHint` over-trusted by consumers.** Consumers may treat `review_required_for_consumer_safety` as binding rather than advisory, despite PR-C's explicit discipline. Mitigation: PR-C language is explicit and repeated; Product Catalog integration documentation (Product-Catalog-side, not PR-C-side) should reinforce.

- **PR-C R12. Reference-callback amplification.** Reference-first payloads minimize event size but require consumers to call back to Device Catalog APIs for content. If a consumer processes many events per second, callback amplification may stress the API layer. Mitigation: PR-C does not contract callback rate limits; Integration Management / API gateway handles. Bulk lookup (Placeholder 2c) anticipated to absorb burst patterns.

- **PR-C R13. `eventVersion = 1` lock-in.** All PR-C events start at version `1`. If a PR-C event needs a contract change shortly after merge, consumers may not yet handle version bumps gracefully. Mitigation: PR-C OQ 1 captures versioning normalization; until then, additive-field-no-bump should be the discipline for PR-C events.

## My Devices Portfolio Assumptions and Open Questions

This section adds assumptions and open questions for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Product Catalog side (where the 20 numbered open questions are tracked canonically) has matching open questions in `modules/product-catalog/assumptions-open-questions.md`. All existing Device Catalog baseline assumptions and open questions are preserved without modification.

### Open question classes

- **BP** Business / Product decision
- **IM** Implementation detail
- **FP** Future Phase
- **EB** Estimate Blocker
- **CU** Cleanup-only

The 20 numbered open questions for this Foundation are tracked canonically in `modules/product-catalog/assumptions-open-questions.md`. This section reaffirms the Device-Catalog-relevant subset and the locked Device-Catalog-side assumptions. **Zero estimate-blockers.** PR is unblocked for review and merge.

---

### Locked assumptions (Device Catalog side)

- Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history.
- Product Catalog owns the buyer-scoped compatibility projection derived from Device Catalog's portfolio.
- Buyer Device Portfolio Reference is HARDENED with `active_flag`, `change_source`, `last_change_timestamp`, `current_portfolio_snapshot_reference` (additive; existing fields preserved).
- Buyer Device Portfolio Snapshot is a NEW entity with buyer-scope triad REQUIRED.
- Buyer Device Portfolio Change Record is a NEW entity with buyer-scope triad REQUIRED.
- `change_type` has exactly 8 values: `device_added`, `device_removed`, `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`.
- Exactly 1 new Device Catalog event introduced: `device-catalog.my-devices.portfolio-changed` (discriminator: `change_type`).
- Exactly 3 architectural workflows added (Workflows 1-3 in `workflows.md`).
- 2 new evidence kinds emitted via existing `service_identity.evidence_emit`: `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change`.
- No new Tenant Company capabilities; `audit_export.*` NOT used.
- No new Logs & Audit entities.
- No automatic Stop Selling on device removal (Product Catalog locked default; Device Catalog does not decide commercial state).
- Canonical Device records are NOT mutated by My Devices changes.
- Cross-buyer reads / mutations are architecturally impossible (buyer-scope triad enforcement).
- Existing Device Catalog baseline preserved (canonical Device records, Device References, Device Capability Evidence, existing Buyer Device Portfolio Reference, compatibility-impacting review signals, `phase-1-csv-import.md`, existing Product Catalog boundary language).

---

### Open questions (Device-Catalog-relevant subset)

The 20 numbered open questions tracked in `modules/product-catalog/assumptions-open-questions.md` apply across both modules. The subset most relevant to Device Catalog:

#### Business / Product (BP)

- **OQ-BP-7 (Admin-on-behalf consent for projection-affecting My Devices changes).** Should admin-on-behalf portfolio changes require explicit buyer acknowledgment before projection recalculation completes? Default per PR #103: act-on-behalf authority sufficient unless tenant policy requires explicit consent. Class: BP. (Cross-listed; canonical location in Product Catalog assumptions-open-questions.md.)

#### Implementation (IM)

- **OQ-IM-3 (Bulk portfolio import batching numerics).** Concrete batching policy for `bulk_portfolio_import` (dedupe windows, batch size, per-snapshot recalculation cadence). Default: ONE recalculation per snapshot, not per device. Class: IM.

- **OQ-IM-5 (Exact buyer/company/entity field implementation).** Concrete data-model shape for buyer-scope triad fields. Default per PR #103 / #104: existing deferral. Class: IM.

#### Future Phase (FP)

- **OQ-FP-5 (Re-parented buyer entity effects on long-lived portfolio records).** What happens to a buyer entity's portfolio snapshots / change records when the entity is re-parented under a different company? Default per PR #103 OQ-PC-2: existing deferred discipline. Class: FP.

- **OQ-FP-6 (AI-Agent-initiated My Devices changes).** How are portfolio change records produced when AI Agent Services initiates a change on behalf of a buyer? Default: future PR when AI Agent Services module exists. Class: FP.

### Device-Catalog-specific implementation notes

- **Snapshot creation cadence:** the architectural intent is "snapshot per change". Implementation MAY optimize (e.g., batch within a transaction) provided every Change Record references a valid `new_portfolio_snapshot_reference`. The buyer's `current_portfolio_snapshot_reference` (on Buyer Device Portfolio Reference) always points to the latest snapshot.
- **Snapshot supersession archival:** old snapshots are retained per PR-D retention via the `buyer_device_portfolio_snapshot` evidence kind. Concrete archival policy is implementation + CPA / legal / DevOps review.
- **Change Record retention:** governed by PR-D retention via the `buyer_device_portfolio_change` evidence kind.
- **Bulk import per-device traceability:** ONE Change Record covers the batch; `affected_device_references` lists all affected devices. Per-device deep diagnostics (e.g., which devices failed validation in a partial-success bulk import) are governed by existing baseline error-reporting per `phase-1-csv-import.md`; this PR does NOT modify that path.
- **`phase-1-csv-import.md` is preserved by reference; not modified.** Existing CSV import path, when invoked, produces a Buyer Device Portfolio Change Record at `change_type = bulk_portfolio_import` per the architectural shape locked in this PR.

### Open question summary (cross-listed from Product Catalog assumptions-open-questions.md)

| Class | Count |
|---|---|
| BP (Business / Product decision) | 7 |
| IM (Implementation detail) | 7 |
| FP (Future Phase) | 6 |
| EB (Estimate Blocker) | 0 |
| CU (Cleanup-only) | 0 |
| **Total** | **20** |

Canonical open question tracking is in `modules/product-catalog/assumptions-open-questions.md`. The Device-Catalog-relevant subset is noted above (OQ-BP-7, OQ-IM-3, OQ-IM-5, OQ-FP-5, OQ-FP-6).

**Zero estimate-blockers.** PR can be reviewed and applied directly.
