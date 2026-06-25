# Order Routing Permissions

This document is proposal-level. It defines initial permission concepts for Order Routing without finalizing roles or access implementation.

## Roles

- Placeholder: routing service account.
- Placeholder: routing operations reviewer.
- Placeholder: routing exception manager.
- Placeholder: routing override approver.
- Placeholder: vendor export service account.
- Placeholder: vendor export reviewer.
- Placeholder: vendor manual download actor.
- Placeholder: system admin.
- Placeholder: downstream fulfillment service account.
- Placeholder: invoice evidence consumer.
- Placeholder: warranty registration consumer.
- Placeholder: AI Agent Services routing signal consumer.
- Placeholder: audit/logs consumer.

## Permission Sets

- Request routing for an accepted parent order.
- Read routed order summaries.
- Read routing snapshots.
- Read routing exception queues.
- Retry routing exception.
- Request manual routing override.
- Approve or reject manual routing override.
- Supersede routing snapshot through approved correction.
- Read vendor suborder references.
- Read manufacturer suborder placeholders.
- Create vendor routed-suborder export eligibility records.
- Create vendor order export batches.
- Read vendor order export content references.
- Request vendor order re-export.
- Review vendor export eligibility conflicts.
- Record vendor manual download eligibility or completion.
- Request routing-to-fulfillment handoff references.
- Emit or consume routing events.
- Emit or consume vendor export events.
- Consume warranty registration required signal placeholders.
- Consume AI routing signals.

## Tenant Boundaries

- Routing permissions must be scoped by tenant, buyer parent, child entity, region/channel where applicable, and relationship references.
- Vendor export permissions must be scoped by tenant, vendor, buyer/retailer split scope where applicable, export schedule/configuration, and company/entity references.
- Parent order access must not imply access to unrelated child entity or sibling entity suborders.
- Vendor suborder and vendor export access must not expose other vendors, unrelated buyers, customer data, full pricing details, or hidden routing inputs.
- Manufacturer suborder placeholder access must not become procurement permission.
- Manual vendor download authority comes from Tenant Company; Order Routing consumes the authority reference and records export eligibility/content references.

## Manual Override Permissions

- Placeholder: manual override request should require reason, affected scope, proposed route, and audit reference.
- Placeholder: approval should require elevated role separate from original requester where separation of duties is required.
- Placeholder: approved override should create a new routing snapshot or supersession record.
- Placeholder: override must not recalculate price, bypass tenant eligibility, bypass Product Catalog validation, bypass Device Reference validity, execute fulfillment, approve warranty claims, create procurement purchase orders, or bypass vendor export eligibility controls.

## Vendor Export Permissions

- Placeholder: vendor export eligibility creation may be service-driven after routing or manually requested by authorized operations users.
- Placeholder: vendor export batch generation should require export authority, export schema version, inclusion rule version, and audit reference.
- Placeholder: re-export should require explicit permission, reason, idempotency key, prior export reference, and audit evidence.
- Placeholder: manual download should require vendor/user scope evidence from Tenant Company and should produce Logs & Audit download evidence.
- Placeholder: buyer/retailer split export behavior should require authorized configuration or operational rule reference.
- Placeholder: vendor export permissions must not grant fulfillment execution, tracking update, return update, refund evidence, invoice, payment, or integration delivery authority.

## Consumer Access Classes

- Routing internal: full routing references and exception details.
- Vendor export internal: vendor export eligibility, export batch, split, re-export, manual download, and review references.
- Vendor export external/vendor: vendor-scoped export content references only, with customer, pricing, tenant, and unrelated buyer data redacted as required.
- Fulfillment handoff: downstream fulfillment instruction placeholders, handoff references, and suborder references only.
- Invoice evidence: routing snapshot references, suborder references, and price snapshot references without recalculation rights.
- Warranty registration: warranty registration required references only where authorized.
- Analytics: redacted routing and vendor export event summaries and dimensions.
- AI Agent Services: routing failure, export conflict, complexity, exception, and manual review signals with approved redaction.
- Logs & Audit: audit-grade references subject to retention and privacy rules.

## Audit Requirements

- Audit route requests, routing decisions, snapshot creation, exception creation, retry attempts, manual override requests, approval/rejection, supersession, vendor export eligibility creation, export batch generation, re-export requests, buyer/retailer split creation, manual download records, fulfillment handoff requests, and event publication.
- Record actor/service, tenant scope, parent order reference, affected line/suborder/export references, reason, timestamp, correlation id, and redaction class.
- Logs & Audit owns immutable file/export/download evidence, while Order Routing owns routing/export references.

## Open Questions

- Which users can manually approve routing overrides?
- Which users can request vendor order re-export?
- Which vendors can manually download routed-suborder CSV exports?
- Which routing details are visible to vendors versus internal CIXCI users?
- Which downstream services need direct API access versus event-only access?
- Which routing, export, re-export, manual download, or handoff actions require dual approval or System Admin approval?

## Vendor Export Schedule Authority (PR-A)

PR-A formalizes the **Export Schedule Authority** class for Order Routing. The existing `permissions.md` content mentions schedule authority in prose; PR-A defines it as a named class with explicit scope, gated actions, evidence requirements, and exclusions. PR-A does not introduce wholly new authority concepts; it operationalizes what was previously a prose mention.

### Authority Class — Export Schedule Authority

**Holder:** CIXCI System Admin in Phase 1. Future phases may broaden via additive permissions PR (e.g., vendor-account-manager roles within CIXCI); PR-A does not anticipate that broadening.

**Resolution mechanism:** Tenant Company `check_access` per the standard Order Routing authority pattern. The authority class name `export_schedule_authority` is consulted; the actor's scope evidence is evaluated against the target vendor reference.

**Gated actions (PR-A surface):**

- Create a Vendor Export Schedule.
- Edit a Vendor Export Schedule (creating a new `schedule_version`).
- Pause a Vendor Export Schedule.
- Resume a paused Vendor Export Schedule.
- Retire a Vendor Export Schedule.
- Set `export_review_required_state = review_required` directly (e.g., flagging a Delivery Evidence for review without automated trigger).
- Transition `export_review_required_state` between `review_required`, `under_review`, and `resolved`.
- Resolve `export_review_required_state` without re-export (audit-evidenced acceptance per Workflow 6).

**Not gated by this class (gated elsewhere or not authority-gated):**

- Initiating delivery via Integration Management (system-actor at Window execution time; not human-actor-gated).
- Recording Delivery Attempts from Integration-Management-reported outcomes (system-actor; not human-actor-gated).
- Manual Download pickup (gated by separate Manual Download authority per existing Order Routing permissions; PR-A does not modify Manual Download authority).
- Re-export action (gated by existing re-export authority per existing Order Routing permissions; PR-A does not introduce or modify re-export authority).
- Reading Delivery Evidence read-only (consumer scope evidence per consumer-module permissions; PR-A does not own read-access governance).

**Evidence required for gated actions:**

- Actor reference.
- Action timestamp.
- Affected entity reference (Schedule, Delivery Evidence, etc.).
- For Schedule edits: before/after of changed fields, plus `schedule_version` increment audit.
- For pause / retire / Review-Required transitions: reason reference (PR-A does not enumerate the reason taxonomy; reasons may be controlled values, freeform, or structured per future configuration decision).
- Audit reference produced for every action; Logs & Audit retains.

**Validation rule for audit-evidenced acceptance (Workflow 6):**

- Resolving `export_review_required_state` to `resolved` without re-export requires complete evidence (actor, reason, affected entity, timestamp, audit reference). Resolution without complete evidence is rejected. The validation rule name is `REVIEW_RESOLUTION_AUDIT_EVIDENCE_MISSING` or similar — exact name TBD.

### Explicit exclusions

PR-A explicitly excludes the following actors from Export Schedule Authority:

- **Vendor self-service.** Vendors cannot edit their own Schedules through any surface. Phase 1 is CIXCI-System-Admin-only. Future phases may consider vendor-driven schedule edits via business decision (PR-A OQ 4).
- **Buyer / retailer / MVNO accounts.** No buyer-facing surface modifies vendor export Schedules.
- **Product Catalog actors.** Product Catalog does not own vendor export Schedules and cannot modify them.
- **Fulfillment / Returns actors.** Fulfillment / Returns consumes Delivery Evidence read-only; it does not modify Schedules, Windows, Delivery Evidences, Delivery Attempts, or Review-Required state.
- **Integration Management.** Integration Management performs transport at Order Routing's request; it does not modify Order Routing's Schedule or Delivery Evidence state directly. Integration Management *reports* delivery outcome (recorded by Order Routing as Delivery Attempts); reporting is not authority-gated by Export Schedule Authority.
- **AI Agent Services.** Not consulted in Phase 1 PR-A workflows. AI-driven Schedule edits are not enabled.

### Cross-reference to existing Order Routing permissions

PR-A does not introduce a new authority taxonomy; it adds one class to the existing taxonomy. Existing Order Routing authority classes (route configuration, re-export controls, handoff approval, manual download authority, and any others present on main) remain unchanged. PR-A's class operates alongside them.

If the actor's `check_access` evaluation grants Export Schedule Authority for a target vendor, the actor may perform Schedule lifecycle actions for that vendor. Other Order Routing actions (re-export, manual download, handoff approval) continue to require their respective existing authority classes.

### What PR-A does NOT change

- Does not modify any existing authority class definition.
- Does not modify Manual Download authority.
- Does not modify re-export authority.
- Does not modify routing-to-Fulfillment handoff authority.
- Does not introduce read-access permissions for Schedule, Window, Delivery Evidence, or Delivery Attempt. Read access is governed by consumer-module scope evidence and Tenant Company `check_access` per existing Order Routing patterns.
- Does not introduce API-surface authority enforcement. API-level authority enforcement is governed by the existing Order Routing API authority patterns and (future) Integration Management API gateway. PR-A's `api-contracts.md` placeholder does not contract enforcement detail.
