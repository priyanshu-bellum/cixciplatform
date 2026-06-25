# Fulfillment and Returns Test Scenarios

This document is proposal-level architecture. It lists scenarios that should become acceptance tests, contract tests, integration tests, and operational review tests during implementation planning.

## Handoff Disposition Scenarios

- Fulfillment records accepted disposition for a valid Order Routing handoff request.
- Fulfillment records rejected disposition when required handoff references are missing.
- Fulfillment records ignored disposition when source version is stale and source rules require ignore.
- Fulfillment blocks duplicate handoff using duplicate handoff blocker and idempotency key.
- `order.routing.fulfillment-handoff.requested` is not treated as accepted execution until Fulfillment disposition exists.
- Missing, duplicate, stale, ignored, or rejected disposition does not create shipment, delivered state, invoice evidence, or route mutation.

## Vendor Fulfillment Import Scenarios

- Vendor fulfillment import creates an import job in update-only mode.
- Header validation fails when required headers are missing or duplicated.
- Locked order field changes are blocked for retailer/buyer reference, suborder, SKU, UPC, quantity, source export batch/item, or original order line references.
- Editable fulfillment fields are accepted for vendor confirmation number, carrier, tracking number, custom tracking URL/instructions, shipped date, delivered date, package id, shipment line id, and vendor notes.
- Blank fulfillment fields do not erase existing values by default.
- Preview is produced before apply and includes applied, rejected, skipped, warning, no-change, and review-required row counts.
- Confirmation is required before mutation unless an approved automated integration contract applies.
- Downloadable error report placeholder is created for row-level validation failures.
- Correction/reupload reference preserves original and corrected values.

## Fulfillment Import Validation Scenarios

- Row rejects when suborder does not exist.
- Row rejects when suborder belongs to another vendor.
- Row rejects or routes to review when source export batch/item does not match.
- Row rejects when SKU does not match original order line.
- Row rejects when UPC does not match original order line, preserving UPC as text.
- Row rejects or routes to review when quantity differs and split shipment/package model does not support it.
- Duplicate row by suborder + SKU/UPC is blocked unless split shipment/package model supports multiple rows.
- Shipped date invalid creates validation error.
- Delivered date invalid creates validation error.
- Delivered date before shipped date creates validation error.
- Stale, duplicate, or out-of-order update appends evidence or routes to review instead of overwriting state.

## Shipment Line Evidence Scenarios

- Applied fulfillment import row creates Shipment Line Evidence with routed suborder, routed suborder line, handoff disposition, source import row, source export batch item, SKU, UPC, expected quantity, shipped quantity, delivered quantity, and audit references.
- Shipment update cannot be applied when it cannot be attributed to an expected routed suborder line or allowed shipment line/package structure.
- Duplicate Suborder + SKU/UPC fulfillment row is rejected or routed to review when split shipments are not explicitly supported.
- Split shipment row is accepted only when package id and/or shipment line id distinguishes the row according to the proposal-level shipment line structure.
- Shipped quantity cannot exceed expected quantity unless explicitly allowed and routed to review.
- Delivered quantity cannot exceed shipped quantity.
- Delivered quantity cannot exceed expected quantity unless explicitly allowed and routed to review.
- Applied, ignored, rejected, and superseded fulfillment import row outcomes are retained and do not silently overwrite Shipment Line Evidence.
- Partial shipment evidence records package membership and per-line disposition.
- Shipment Line Evidence does not alter Order Routing decisions, routed suborder line truth, vendor assignment, or routing snapshots.
- Invoice Management may consume delivered evidence references later, but Fulfillment does not create invoice state.

## Tracking And Carrier Scenarios

- USPS, UPS, FedEx, DHL, and Other carriers are accepted placeholders.
- Carrier is required when tracking number is provided.
- Carrier is required when shipped date is provided.
- Tracking number is required when shipped date is provided.
- Other carrier requires custom tracking URL or tracking instructions.
- Carrier-specific tracking format placeholder can warn or route to review.
- Duplicate tracking number handling links or blocks according to source rules.
- Unsafe or malformed tracking URL routes to review.
- Tracking URL is not treated as source-of-truth shipment state.
- Carrier/provider callback evidence is referenced through Integration Management where applicable.

## Shipment Status Scenarios

- Valid evidence transitions shipment through Pending, Processing, Partially Shipped, Shipped, Delivered, Exception, Cancelled, or Review Required.
- Shipment status does not update without validated fulfillment evidence.
- Delivered evidence may be exposed to Invoice Management but does not create invoice state.
- Duplicate shipment update is idempotently acknowledged or linked to prior evidence.
- Stale update appends evidence and does not silently overwrite current status.
- Out-of-order update does not overwrite current status unless source authority and transition rules allow it.
- Partial shipment placeholder allows multiple package/shipment line references only where supported.

## Vendor Return Export Scenarios

- Return export eligibility record is created for an eligible operational return.
- Return export eligibility excludes returns assigned to another vendor.
- Return export eligibility blocks stale return authorization/RAN evidence.
- Return export eligibility blocks closed, superseded, unauthorized, or mismatched return records.
- Return export eligibility routes missing lifecycle state, missing return line references, or stale authorization freshness to review.
- Return export batch is created with schema version, inclusion rule version, export window, and idempotency key.
- Return export batch item records included status and duplicate prevention key.
- Return export batch item records excluded status and exclusion reason.
- Buyer/retailer split reference groups returns without changing return ownership or refund evidence.
- Re-export request is explicit, auditable, and does not silently resend all prior return items.
- Manual download workflow reference records actor/user, vendor/company/entity, download count, permission/scope reference, and audit reference.
- Logs & Audit remains owner of immutable file/download evidence.

## Vendor Return Import Scenarios

- Vendor return import creates an import job in update-only mode.
- Header validation fails before row apply.
- Locked return field changes are blocked for buyer reference, suborder, RAN, reason, initiation date, quantity, pricing snapshot reference, SKU, UPC, or source return export batch/item.
- Vendor Wholesale Price is treated as snapshot/evidence reference, not editable pricing truth.
- Preview is produced before apply.
- Confirmation is required before mutation unless an approved automated integration contract applies.
- Downloadable error report placeholder is created for row-level return validation failures.

## RAN And Return Matching Scenarios

- RAN exists and belongs to importing vendor.
- RAN missing creates validation failure.
- RAN unknown creates validation failure.
- RAN belongs to another vendor creates validation failure.
- RAN matches open return record.
- RAN closed or superseded routes to review.
- RAN matches source return export batch/item.
- Suborder matches return record.
- SKU and UPC match original return line, preserving UPC as text.
- Return quantity is valid and unchanged unless return line model supports variance.
- Duplicate RAN + SKU/UPC row is rejected or routed to review unless partial return line model supports it.

## Return Line Disposition Evidence Scenarios

- Applied return import row creates Return Line Disposition Evidence with RAN, return line, source return request, source export batch item, source import row, SKU, UPC, expected return quantity, received quantity, accepted quantity, rejected quantity, partial quantity, operational disposition, and audit references.
- Return import row maps to an expected return line through RAN + SKU/UPC and/or CIXCI Return Line ID where available.
- Duplicate RAN + SKU/UPC return row is rejected or routed to review when partial return line structure is not explicitly supported.
- Partial return row is accepted only when CIXCI Return Line ID and/or package/receipt reference distinguishes the row according to proposal-level rules.
- Received quantity, accepted quantity, rejected quantity, and partially accepted quantity cannot exceed expected return quantity.
- Accepted + rejected + partially accepted quantities reconcile to received quantity where applicable.
- Return quantity reconciliation failure blocks apply or routes to review without flattening the return into a summary disposition.
- Applied, ignored, rejected, and superseded return import row outcomes are retained.
- Return summary disposition is derived from structured line evidence and does not erase line-level conflicts.
- Vendor-provided refund/adjustment evidence may link to return line disposition evidence but is not final financial truth.

## Return Chronology And Condition Scenarios

- Return initiation date is valid.
- Return received date is valid.
- Return received date before return initiation date creates validation error.
- Return received date far in the future routes to review unless allowed.
- Return condition is captured where supported.
- Vendor notes are captured where allowed.
- Stale, duplicate, or out-of-order return update appends evidence or routes to review.

## Return Disposition And Refund Evidence Scenarios

- Vendor return disposition evidence records received by vendor.
- Vendor return disposition evidence records operationally accepted.
- Vendor return disposition evidence records operationally rejected with rejected reason.
- Vendor return disposition evidence records partially accepted with partial refund reason placeholder.
- Return condition evidence is linked to disposition evidence.
- Vendor-provided refund/adjustment amount is recorded as evidence reference only.
- Fulfillment does not mark Refund Approved, Partially Refunded, Return Refunded, invoice adjusted, or payment complete.
- Missing, stale, conflicting, or insufficient vendor refund evidence routes to review for downstream Pricing/Invoice interpretation.

## Buyer Update Signal Scenarios

- Shipment update ready for buyer transport event is emitted after valid shipment evidence.
- Return update ready for buyer transport event is emitted after valid return disposition evidence.
- Shipment update transport failed reference can be linked without Fulfillment owning transport retry.
- Return update transport failed reference can be linked without Fulfillment owning transport retry.
- Notification trigger events do not deliver notifications.

## Boundary Scenarios

- Fulfillment cannot recalculate price when pricing snapshot is missing.
- Fulfillment cannot interpret accepted refund amount as final refund.
- Fulfillment cannot create invoice, credit, payment, or adjustment lifecycle state.
- Fulfillment cannot alter routing snapshot, export eligibility, routed suborder line truth, or vendor assignment.
- Fulfillment cannot mutate Product Catalog, Device Catalog, Tenant Company, Integration Management, Notification, Logs & Audit, Pricing, Invoice, Analytics, AI, Warranty, Procurement, Media, or Launch/Event source records.
- AI can suggest correction/review but cannot apply import corrections without approved action contract and permissions.

## Scalability Scenarios

- High-volume fulfillment imports are processed with row-level validation and pagination/summary counts.
- High-volume shipment line evidence is paginated by tenant/vendor/import job/routed suborder line/package.
- High-volume return export batches use item-level disposition and duplicate prevention.
- High-volume return line disposition evidence is paginated by tenant/vendor/RAN/return line/import job.
- Repeated vendor import failures create review/dead-letter placeholders rather than infinite retry.
- Event fanout failure for Notification, Analytics, AI, Integration, or Logs does not block core operational state.
- Manual review queue assigns priority class and SLA placeholder for RAN failures, tracking URL review, shipment line conflicts, stale updates, quantity reconciliation failures, and refund evidence conflicts.

## Open Test Questions

- Which scenarios require synchronous contract tests with Order Routing handoff requests?
- Which vendor fulfillment/return schemas require golden file contract tests?
- Which carrier tracking URL validations should be automated first?
- Which Invoice Management evidence scenarios are required before invoice drafting?
- Which stale/out-of-order status update patterns should be regression-tested first?
- Which routed suborder line/package identifiers are required for split shipment tests?
- Which return line/receipt identifiers are required for partial return tests?

## Vendor Fulfillment Response SLA Scenarios (PR-A)

PR-A scenarios are lightweight review checks for the SLA evaluation surface. They use Fulfillment / Returns-specific terminology (SLA Policy, SLA Evaluation Record, Late / Missing / Partial Fulfillment Import Exception, SLA Override / Excuse Evidence). They are architecture-level, not runtime test cases.

### SLA Policy Configuration scenarios

1. A CIXCI System Admin (holding SLA Configuration Authority) creates an SLA Policy for a vendor with `timezone_reference = America/New_York`, `same_day_cutoff_time = 14:00`, `same_day_response_deadline_time = 16:00`, `next_business_day_response_deadline_time = 10:00`, `business_calendar_reference` populated. The Policy is created in `active` state. An audit reference is produced.

2. An actor without SLA Configuration Authority attempts to create an SLA Policy. The action is rejected with `SLA_OVERRIDE_AUTHORITY_REQUIRED` (or the SLA-Configuration-Authority equivalent in the existing taxonomy). No Policy is created.

3. An edit to an active Policy produces a new Policy version. The prior version transitions to `superseded`; the new version is `active`. SLA Evaluation Records previously created against the prior version are not retroactively recomputed; their `sla_policy_version_reference` continues to point at the prior version.

4. At most one `active` Policy version exists per `(vendor_reference, route_reference)` pair at any time. An attempt to create a second concurrent active Policy for the same pair is rejected.

5. Retiring a Policy is terminal. Subsequent edit or create attempts on a `retired` Policy are rejected.

6. Vendor users cannot create, edit, supersede, or retire SLA Policies.

7. SLA Policy carries its own cutoff/deadline configuration. The Policy is **not** synchronized with Order Routing Vendor Export Schedule cutoffs. Editing the Order Routing Schedule does not affect the SLA Policy.

### Export Delivery Evidence Consumption scenarios

8. Order Routing's `order-routing.export-delivery-evidence.confirmed` event fires for a confirmed Vendor Export Delivery Evidence covering one suborder. Fulfillment / Returns consumes the event read-only and creates one SLA Evaluation Record for the suborder. The Evaluation Record references the source Delivery Evidence by `vendor_export_delivery_evidence_reference` and copies `delivery_confirmation_timestamp`.

9. PR-A does not consume non-`confirmed` Vendor Export Delivery Evidence states (`pending`, `failed`, `partial`, `unconfirmable`). Behavior for those states is documented as Boundary/Handoff PR territory. No SLA Evaluation Record is created.

10. Fulfillment / Returns does not mutate Order Routing records under any path. Specifically, consumption does not transition Order Routing's `export_review_required_state` or `delivery_confirmation_state`.

11. If the same `order-routing.export-delivery-evidence.confirmed` event arrives twice (duplicate delivery), at most one SLA Evaluation Record exists per `(suborder_reference, vendor_export_delivery_evidence_reference)`. Implementation idempotency mechanics are deferred to Boundary/Handoff PR.

12. If no `active` SLA Policy exists for the suborder's vendor / route, the Evaluation Record is created with a flag indicating no Policy applied. The Evaluation Record routes to operational review; outcome cannot be determined. (Open question — see assumptions-open-questions.md.)

### Expected Fulfillment Response Deadline Calculation scenarios

13. A confirmed Vendor Export Delivery Evidence with `export_delivered_timestamp = 14:30 America/New_York` on a business day is consumed under a Policy with `same_day_cutoff_time = 14:00`. The delivery is after-hours; the Expected Deadline = next business day at `next_business_day_response_deadline_time` per the Policy timezone.

14. A confirmed Vendor Export Delivery Evidence with `export_delivered_timestamp = 13:45 America/New_York` on a business day under the same Policy yields a same-day Expected Deadline at `same_day_response_deadline_time` (`16:00`).

15. A confirmed delivery on a Saturday under a Policy with business calendar configured to skip weekends yields an Expected Deadline on the next business day at `next_business_day_response_deadline_time`.

16. If `business_calendar_reference` is unresolvable (calendar dependency not yet available per PR-A OQ 1), the Expected Deadline calculation falls back to calendar-day semantics with an audit-visible note. The Evaluation Record records the fallback flag. **The fallback is proposal-level** and not final implementation behavior.

17. The `expected_fulfillment_response_deadline` is computed once at SLA Evaluation Record creation and is immutable thereafter. Subsequent SLA Policy edits do not retroactively recompute the deadline.

### Fulfillment Import Received Timestamp scenarios (transport vs validation distinction)

18. Integration Management reports transport receipt of a vendor fulfillment import payload at `15:45 America/New_York`. Workflow 4 captures `fulfillment_import_received_timestamp = 15:45` on the Fulfillment Import entity. The captured value is **transport receipt time**, not post-validation time.

19. A vendor fulfillment import is received on time (before Expected Deadline) but fails row-level validation. The SLA Evaluation Record consults `fulfillment_import_received_timestamp` (on time); the SLA outcome is `on_time` for SLA purposes. The invalid import separately produces or links to existing Fulfillment / Returns import validation exceptions per existing validation rules. **A malformed on-time file does not silently count as successful fulfillment completion.**

20. A vendor fulfillment import payload arrives via SFTP at `16:01 America/New_York` with Expected Deadline `16:00`. The captured `fulfillment_import_received_timestamp = 16:01` (transport receipt). SLA outcome = `late`. The fact that validation later succeeds does not back-date the SLA timestamp.

21. The captured timestamp is from the first transport receipt of the import payload. If subsequent rows of the same payload stream in later (e.g., chunked upload), the SLA-relevant timestamp is the first transport receipt, not the last row processed.

### On-Time Fulfillment Response Evaluation scenarios

22. A complete fulfillment import (all suborder lines covered) is received before Expected Deadline. SLA Evaluation Record outcome = `on_time`, lifecycle = `evaluated`. No Exception is created.

23. A complete fulfillment import is received after Expected Deadline. Outcome = `late`. Late Fulfillment Import Exception is created (Workflow 6). SLA Breach Signal is raised.

24. A partial fulfillment import is received before Expected Deadline. Outcome = `partial` (interim, lifecycle = `pending`). Partial Fulfillment Response Exception is created (Workflow 8). SLA Breach Signal is raised. The Evaluation Record remains `pending` for additional rows.

25. After a Partial Exception, a subsequent fulfillment import completes the response **before** Expected Deadline. The Partial Exception transitions to `resolved`. The SLA Evaluation Record outcome transitions from `partial` to `on_time`, lifecycle to `evaluated`.

26. After a Partial Exception, a subsequent fulfillment import completes the response **after** Expected Deadline. The Partial Exception remains in its current state (operational review). A Late Fulfillment Import Exception is also created (multiple Exceptions per suborder permitted). The Evaluation Record outcome = `late` per severity priority `Late > Missing > Partial > On Time`.

27. Severity priority on the SLA Evaluation Record outcome reflects the most-severe breach. `outcome_history` preserves every transition.

### Late Fulfillment Import Exception scenarios

28. A Late Fulfillment Import Exception is created with `expected_deadline_at_creation`, `received_at_creation`, `delay_duration` snapshotted at creation. These fields are immutable.

29. The Late Exception's SLA Breach Review State starts in `open`.

30. The Late Exception does not block fulfillment processing of the late import. Existing Fulfillment / Returns workflows process the late import normally.

31. SLA Breach Signal raised on Late Exception creation references the Exception by `exception_reference` and carries `exception_kind = late_fulfillment_import`.

### Missing Fulfillment Import Exception scenarios

32. The Expected Deadline elapses without any fulfillment import being received. Workflow 7's time-driven detection creates a Missing Fulfillment Import Exception in `open` state with `expected_deadline_at_creation` and `detected_at`. The SLA Evaluation Record outcome transitions to `missing`, lifecycle to `evaluated`.

33. A late fulfillment import arrives **after** a Missing Exception was opened. The Missing Exception transitions to `closed` with audit evidence indicating `late_import_arrived`. A new Late Fulfillment Import Exception is created. The SLA Evaluation Record outcome transitions from `missing` to `late`; `outcome_history` preserves both. Both Exception histories are preserved.

34. A Missing Exception that has been closed because a late import arrived is **not reopened.** Subsequent imports affect the Late Exception, not the Missing one.

35. **Missing is not mutated into Late.** They are distinct facts at distinct moments in time. The audit trail preserves the sequence.

### Partial Fulfillment Response Exception scenarios

36. A Partial Exception captures `lines_covered_at_creation` and `lines_missing_at_creation` as references to the suborder lines covered (and missing) at the moment of Exception creation.

37. If subsequent imports complete the response before Expected Deadline, the Partial Exception transitions to `resolved`. SLA Evaluation Record outcome may transition to `on_time`.

38. If subsequent imports complete the response after Expected Deadline, the Partial Exception remains; a Late Exception is also created. Multiple Exceptions per suborder are permitted.

39. Multiple Partial Exceptions per SLA Evaluation Record may exist if distinct partial windows occur (rare but architecturally permitted).

### SLA Breach Review scenarios

40. A reviewer holding SLA Override Authority transitions an Exception from `open` to `under_review`. Audit reference is produced.

41. The reviewer transitions the Exception from `under_review` to `resolved`. Closure audit reference is required. The breach is acknowledged operationally; no override is granted.

42. The reviewer transitions the Exception from `under_review` to `closed` with operational reason (duplicate, cancelled suborder, etc.). Closure audit reference is required.

43. A reviewer reopens a terminal-state Exception (`resolved`, `overridden`, or `closed`) by transitioning back to `under_review` via an explicit authorized action. The full transition history is preserved.

44. An actor without SLA Override Authority attempts to review an Exception. The action is rejected with `SLA_OVERRIDE_AUTHORITY_REQUIRED`. No state transition occurs.

### SLA Override / Excuse Evidence scenarios

45. An authorized reviewer creates an SLA Override / Excuse Evidence record with actor, timestamp, `affected_exception_reference`, `reason_category = vendor_confirmed_outage`, `reason_text`, `supporting_evidence_reference`, `audit_reference`. The affected Exception transitions from `under_review` to `overridden`.

46. The SLA Override / Excuse Evidence record is **immutable after creation.** Attempts to edit any field on the record are rejected.

47. Reversal of an override is performed by creating a new reversing SLA Override / Excuse Evidence record with `reason_category = override_reversal`. The prior record remains immutable. The affected Exception transitions from `overridden` back to `under_review`.

48. The SLA Evaluation Record lifecycle transitions to `evaluation_excused` when all Exceptions on the record are in `overridden` state. If a reversing Override Evidence is created and at least one Exception returns to `under_review`, the Evaluation Record lifecycle returns to `evaluated`.

49. Vendor users cannot create SLA Override / Excuse Evidence. The action is rejected with `SLA_OVERRIDE_AUTHORITY_REQUIRED`. No record is created.

50. An actor holds SLA Override Authority but submits an Override Evidence record with missing required fields (e.g., no `reason_text`, no `audit_reference`). The action is rejected with `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`. The two failure modes (`SLA_OVERRIDE_AUTHORITY_REQUIRED` and `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`) are **not mixed**. The error path identifies the specific failure.

51. An SLA Policy with `override_allowed = false` rejects any attempted override on Exceptions evaluated against that Policy version. The reviewer must use a different resolution path (`resolved` or `closed` via Workflow 9).

### Boundary discipline scenarios

52. PR-A consumes Order Routing's Vendor Export Delivery Evidence **read-only**. Fulfillment / Returns does not mutate any Order Routing record. The `vendor-export-fulfillment-handoff-governance.md` file is not modified by PR-A.

53. PR-A does not produce events that Order Routing subscribes to. The 17 PR-A events are Fulfillment / Returns-internal.

54. PR-A respects PR #91's clarification: a confirmed Vendor Export Delivery Evidence means only that delivery evidence was successfully confirmed for the configured delivery method. PR-A does not assume vendor acknowledged, opened, processed, or accepted operational responsibility for the export.

55. PR-A does not specify notification routing for SLA Breach Signal. Notification Platform Service routing is future Cross-Module Summary Email PR territory.

56. PR-A does not specify summary email delivery or analytics aggregation. Cross-Module Summary Email PR territory.

57. PR-A does not introduce Order Routing event consumption beyond `order-routing.export-delivery-evidence.confirmed`. Other Order Routing events (Schedule lifecycle, Window lifecycle, Operational Review state) are not consumed in PR-A.

58. PR-A does not introduce buyer-facing events, vendor-facing events, or events on buyer update-ready signals. Buyer update hardening is Fulfillment / Returns PR-B.

59. PR-A does not introduce delivery date hardening. Fulfillment / Returns PR-B territory.

60. PR-A does not introduce invoice, refund, payment, or pricing linkages. Out of scope.

### Event count scenarios

61. PR-A introduces exactly **17 additive events** in `events.md`: 4 SLA Policy lifecycle, 3 SLA Evaluation lifecycle, 3 Late Exception lifecycle, 3 Missing Exception lifecycle, 3 Partial Exception lifecycle, 1 SLA Breach Signal.

62. No SLA-unrelated event is introduced in PR-A. No buyer-update event, no delivery-date event, no invoice/refund/payment event, no pricing event, no notification-delivery event, no analytics-summary event.

63. PR-A does not rename or retire any existing Fulfillment / Returns event name.

### Authority and Phase 1 reaffirmations

64. SLA Configuration Authority gates SLA Policy creation, edit, supersession, and retirement.

65. SLA Override Authority gates SLA Override / Excuse Evidence creation and reversal.

66. CIXCI System Admin holds both SLA Configuration Authority and SLA Override Authority in Phase 1.

67. Vendor users are excluded from SLA Configuration Authority and SLA Override Authority.

68. Authority resolution flows through Tenant Company `check_access`.

69. The two distinct failure modes are `SLA_OVERRIDE_AUTHORITY_REQUIRED` (authority class missing) and `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING` (audit content incomplete). They are never mixed.

### State chain preservation

70. The non-collapsible state chain holds:
    ```
    Order Routing Vendor Export Delivery Evidence (confirmed)
        └─ consumed read-only ─> SLA Evaluation Record
            └─ outcome ─> Exception (when breach)
                └─ overridden ─> SLA Override / Excuse Evidence (immutable)
                    └─ raised ─> SLA Breach Signal (one-way)
    ```

71. Confirmed delivery evidence (Order Routing-owned) is not SLA Evaluation Record (Fulfillment-Returns-owned).

72. SLA Evaluation Record is not an Exception.

73. Exception is not an Override Evidence record.

74. Override Evidence is not vendor operational acceptance.

### What PR-A does NOT introduce

75. PR-A does not evaluate or modify Order Routing scheduling, delivery transport, recipient identity, or operational review-required state.

76. PR-A does not own Notification Platform Service routing.

77. PR-A does not own Analytics / Reporting aggregation.

78. PR-A does not own Logs & Audit retention.

79. PR-A does not own Tenant Company business calendar.

80. PR-A does not own Integration Management transport mechanics.

81. PR-A does not introduce OpenAPI schemas, concrete URL paths, runtime endpoint code, broker mechanics, database schemas, or migrations.

82. PR-A does not modify any Order Routing, Integration Management, Notification Platform Service, Tenant Company, Logs & Audit, Analytics / Reporting, Invoice Management, Pricing, Product Catalog, or Device Catalog file.

83. PR-A does not modify any ADR, platform standard, code, schema, migration, or runtime file.

84. PR-A does not modify `modules/fulfillment-returns/openapi-contracts.md`.

85. PR-A does not introduce buyer-update-ready, delivery-date, invoice/refund/payment, pricing, notification-delivery, or analytics-summary events.

86. PR-A does not introduce vendor self-service SLA Policy editing or vendor self-override of SLA breaches.

## Cross-Module Handoff Scenarios (Boundary/Handoff PR)

Architecture-level review scenarios covering Workflow A (Handoff Receipt), Workflow B (Non-Confirmed Delivery Evidence Handling), idempotency, replay, eligibility, non-confirmed handling, boundary discipline, and the "what this PR does not do" affirmations. Scenarios use Fulfillment / Returns-specific terminology and Cross-Module Handoff Record terminology - not PR #91 or PR #92 internal terminology.

### Workflow A - Handoff Receipt - happy path

1. A source `order-routing.export-delivery-evidence.confirmed` event is observed. No prior Handoff Record exists for the computed idempotency key. A new Cross-Module Handoff Record is created in `pending` state.

2. Eligibility evaluation: source `confirmed` (E1), active SLA Policy exists for the vendor (E2), vendor in Tenant Company scope (E3), route SLA-evaluatable (E4), consumer scope `fulfillment-returns.sla-evaluation` (E5). All pass.

3. PR #92 Workflow 2 (Export Delivery Evidence Consumption) is invoked. An SLA Evaluation Record is created.

4. The SLA Evaluation Record is bound to the Handoff Record via `bound_sla_evaluation_record_reference`. Handoff Record transitions `pending -> consumed`. Audit reference recorded.

5. PR #92's `fulfillment-returns.sla-evaluation.created` event is emitted per existing PR #92 contract.

### Workflow A - eligibility failure scenarios

6. Source `confirmed` event observed. No active SLA Policy exists for the vendor at consumption time. Handoff Record created in `pending`. Eligibility E2 fails. Handoff Record transitions `pending -> consumption_skipped`. Audit reason: `no_active_sla_policy`. **No SLA Evaluation Record created.**

7. Source `confirmed` event observed. Vendor is not within Tenant Company scope for SLA evaluation. Eligibility E3 fails. Handoff Record transitions to `consumption_skipped`. Audit reason: `vendor_out_of_scope`.

8. Source `confirmed` event observed. Suborder context is not in Phase 1 SLA-evaluation inclusion list. Eligibility E4 fails. Handoff Record transitions to `consumption_skipped`. Audit reason: `route_not_sla_evaluatable`.

9. Eligibility failure paths produce **no SLA Evaluation Record** and **no SLA Exception** (Late / Missing / Partial). PR #92's exception detection requires an SLA Evaluation Record to exist.

### Idempotency scenarios

10. Two `order-routing.export-delivery-evidence.confirmed` events arrive for the same source Delivery Evidence (duplicate delivery from at-least-once transport). The first arrival creates the Handoff Record and transitions it to `consumed`. The second arrival resolves to the existing Handoff Record by idempotency key. A `replay_acknowledged` audit reference is appended to the existing record. **Canonical state remains `consumed`.** **No second SLA Evaluation Record is created.**

11. The Handoff Idempotency Key is derived deterministically from `vendor_export_delivery_evidence_reference` + `consumer_scope_reference` (= `fulfillment-returns.sla-evaluation` in Phase 1). The key is stable across replays because PR #91's terminal-once-confirmed invariant means the source reference does not change.

12. For a given (`handoff_idempotency_key`, `consumer_scope_reference`) pair, at most one Cross-Module Handoff Record exists. Uniqueness invariant.

### Replay scenarios

13. A replay of a previously-`consumed` source event arrives months after the original consumption. The original Handoff Record exists in `consumed` state with a bound SLA Evaluation Record. Replay produces `replay_acknowledged` audit reference. **No re-evaluation of eligibility is performed.** **The original eligibility decision is honored.** Even if SLA Policy has since been edited, the original decision and the original bound SLA Evaluation Record remain authoritative.

14. A replay of a previously-`consumption_skipped` source event arrives. Replay produces `replay_acknowledged` audit reference. State remains `consumption_skipped`. No SLA Evaluation Record created.

15. A replay of a previously-`consumption_held` source event arrives. State remains `consumption_held`. Replay audit-acknowledged.

16. Replay rate is observable via audit references; canonical state is not affected by replay rate.

### Workflow B - Non-Confirmed Delivery Evidence Handling scenarios

17. Source `order-routing.export-delivery-evidence.failed` event observed. No prior Handoff Record exists. Workflow B Step 5 records a Handoff Record in `pending`. Step 6 transitions `pending -> consumption_skipped` with audit reason `source_failed`. **No SLA Evaluation Record created.** **No SLA Exception is produced.**

18. Source Delivery Evidence is observed in `unconfirmable` state via reference lookup. Workflow B creates Handoff Record in `consumption_skipped` with audit reason `source_unconfirmable`. **No SLA Evaluation Record.**

19. Source Delivery Evidence is observed in `partial` state via reference lookup. Workflow B creates Handoff Record in `consumption_held` with audit reason `source_partial`. **No SLA Evaluation Record.** **No SLA clock starts.** **No SLA Exception created from partial source delivery.**

20. `consumption_held` records are terminal in Phase 1. They do not later transition to `consumed` if source evidence is somehow later observed in `confirmed` state (PR #91's invariant makes this impossible at the source). A re-export per PR #91 produces a new source Delivery Evidence which produces a new Handoff Record via Workflow A.

### Workflow A / Workflow B race condition scenarios

21. A `confirmed` source event and a stale observation of `partial` source state for the same idempotency key arrive concurrently. The uniqueness invariant ensures exactly one Handoff Record exists. The losing creator path resolves to the winning record per Workflow A Steps 2-5 or Workflow B Steps 2-4.

22. If Workflow A wins, the record transitions to `consumed` (or `consumption_skipped` on eligibility failure). If Workflow B wins, the record transitions to `consumption_held`. **Both outcomes are valid Phase 1 states**; reconciliation against source state (PR #91 terminal state) is not performed automatically - operator review via audit trail.

### Boundary discipline scenarios

23. Cross-Module Handoff Record is Fulfillment / Returns-owned. No Order Routing entity is modified by Workflow A or Workflow B.

24. `source_evidence_snapshot_reference` is reference-only. The Handoff Record does not embed source payload. Reading source content requires reading Order Routing's record by reference.

25. PR #91's clarification - confirmed source delivery is a transport-layer fact, not vendor operational acceptance - is honored. The Handoff Record and bound SLA Evaluation Record do not assert vendor operational acceptance.

26. Email delivered != email opened. SFTP push confirmed != file consumed. Manual download != operational acceptance. API push confirmed != vendor system processed. Workflow A's transition to `consumed` does not assert any of these.

27. Fulfillment / Returns does not produce events Order Routing consumes. The handoff is one-way.

28. Fulfillment / Returns does not mutate Order Routing state under any path, including `delivery_confirmation_state`, `export_review_required_state`, or any Delivery Attempt outcome.

### Eligibility decision audit scenarios

29. Every Handoff Record state transition produces an audit reference. Eligibility failure audit references identify the failure reason category (e.g., `no_active_sla_policy`).

30. The eligibility decision rationale is captured on `handoff_eligibility_decision_reference` and is observable via direct Handoff Record lookup (future API Governance Foundation PR). Phase 1 has no operator UI for handoff observability.

31. The original eligibility decision is preserved across replays. Replay-time invariant.

### What the handoff does NOT introduce

32. No new events on either side. PR-A scope reaffirms: 12 PR #91 events + 17 PR #92 events = 29 events. The Boundary/Handoff PR adds zero events.

33. No new Fulfillment / Returns permissions or authority classes.

34. No new Fulfillment / Returns API contract placeholders. Handoff observability via API is deferred to API Governance Foundation PR.

35. No new SLA Exception types. Late / Missing / Partial Exception types remain as PR #92 defined them.

36. No buyer-facing Delivery Date behavior. Fulfillment / Returns PR-B.

37. No customer-facing shipment / order status aggregation. Fulfillment / Returns PR-B.

38. No scheduled System Admin Activity Summary Emails. Cross-Module PR.

39. No notification delivery workflow.

40. No analytics aggregation.

41. No invoice / refund / payment state.

42. No pricing behavior.

43. No runtime code, database migrations, finalized OpenAPI schemas, or broker / queue mechanics.

44. No modification of `modules/order-routing/data-model.md`, `modules/order-routing/workflows.md`, `modules/order-routing/events.md`, `modules/order-routing/permissions.md`, or `modules/order-routing/api-contracts.md`.

45. No modification of `modules/fulfillment-returns/events.md`, `modules/fulfillment-returns/permissions.md`, `modules/fulfillment-returns/api-contracts.md`, or `modules/fulfillment-returns/spec.md`.

46. No modification of any Integration Management, Notification Platform Service, Tenant Company, Logs & Audit, Analytics / Reporting, Invoice Management, Pricing, Product Catalog, Device Catalog, or other module file.

47. No modification of any ADR, platform standard, code, schema, migration, or runtime file.

48. `modules/order-routing/vendor-export-fulfillment-handoff-governance.md` is modified by a light cross-reference only (<=15 lines added, 0 removed, no restructuring, no ownership changes, no SLA logic, no new event names, no new workflow detail).
## Delivery Date and Buyer Update Review Scenarios (PR-B)

The scenarios below are architecture-level review scenarios for the PR-B hardening pass. They are meant to support boundary review, contract review, and operator-walkthrough discussions. They are not runtime test specifications; concrete test cases, fixture data, and assertion semantics are implementation work.

### Scenario 1 - Vendor submits a valid Delivery Date for a shipped Shipment Line

- Vendor uploads a Fulfillment Import row containing a parseable Delivery Date, after the affected Shipment Line has already reached shipped state.
- Workflow 1 creates Delivery Date Evidence in `pending` state.
- Workflow 2 runs validation: format OK, not before Shipped Date, not before order creation, no tracking-evidence conflict, not stale, not duplicate, not regression. Outcome: `accepted`.
- Workflow 3 transitions the Shipment Line to Delivered state, sets `delivered_shipment_evidence_reference` and `delivered_at_timestamp`.
- Workflow 8 evaluates whether a Buyer Update-Ready Signal of `update_kind = delivery` should be produced. If this is the only Shipment Line in the parent order or if all other Shipment Lines are also in Delivered state, the signal proceeds to `eligible` via Workflow 9 and to `dispatched` via Workflow 10. Otherwise the signal is held in `held_awaiting_all_vendors_delivered`.

### Scenario 2 - Vendor submits a malformed Delivery Date on an on-time Fulfillment Import

- Vendor's Fulfillment Import arrives before the PR #92 Expected Fulfillment Response Deadline. PR #92 captures Fulfillment Import Received Timestamp; SLA Evaluation Record outcome resolves as on-time.
- One row contains a Delivery Date value that fails format validation (e.g., not parseable as a date).
- Workflow 2 produces `rejected_invalid_format` for that row's Delivery Date Evidence.
- Workflow 3 is not triggered. Shipment Line is not transitioned to Delivered state. No Buyer Delivery Update-Ready Signal is produced.
- PR #92's SLA Evaluation Record outcome is unchanged. The on-time response is recorded; the rejected Delivery Date content is separately audited.

### Scenario 3 - Vendor submits a Delivery Date earlier than Shipped Date

- Workflow 2 produces `rejected_before_shipped`. Audit records the specific rule failure.
- No state transition. No Buyer Update-Ready Signal.

### Scenario 4 - Vendor submits a duplicate Delivery Date

- A previously-accepted Delivery Date Evidence exists for the same Shipment Line with the same `reported_delivery_date`.
- Workflow 2 produces `rejected_duplicate` for the new Delivery Date Evidence. Recorded as idempotent acknowledgement.
- No Shipment Status transition (the Shipment Line is already in Delivered state). No new Buyer Update-Ready Signal.

### Scenario 5 - Vendor submits a stale Delivery Date

- A previously-accepted Delivery Date Evidence exists for the same Shipment Line with a later `reported_delivery_date`.
- Workflow 2 produces `rejected_stale`. Audit records the specific rule failure.
- No Shipment Status transition. No Buyer Update-Ready Signal.

### Scenario 6 - Vendor attempts to regress a Delivered Shipment Line back to Shipped via new Delivery Date submission

- Shipment Line is already in Delivered state with an active `delivered_shipment_evidence_reference`.
- Vendor submits a new Delivery Date value.
- Workflow 2 detects the regression attempt. Pending Delivery Date Evidence transitions to `rejected_regression_without_authority`.
- No Shipment Status transition. No Buyer Update-Ready Signal. Workflow 6 path 6b is the only legitimate correction route, and it requires explicit System Admin authority.

### Scenario 7 - System Admin applies a Delivery Date correction with authority

- A Shipment Line is in Delivered state via a previously-accepted Delivery Date Evidence.
- A CIXCI System Admin submits a Delivery Date Correction Evidence with corrected value, reason, supporting evidence reference.
- Workflow 6 step 2: authority resolved via Tenant Company `check_access`. Present.
- Workflow 6 step 3: content validation passes.
- Workflow 6 step 4: supporting evidence is present (per Phase 1 policy).
- Workflow 6 step 5: Correction Evidence transitions to `applied`. New Delivery Date Evidence in `accepted` state is created. Prior Delivery Date Evidence transitions to `superseded`.
- Workflow 6 step 6: Shipment Line `delivered_shipment_evidence_reference` and `delivered_at_timestamp` updated.
- Workflow 6 step 7: if the buyer was previously updated for this Shipment Line (the prior delivery-kind Buyer Update-Ready Signal is in `dispatched`, `acknowledged`, or `failed` state), Workflow 8 produces a new correction-kind Buyer Update-Ready Signal.

### Scenario 8 - System Admin attempts correction without authority

- Submission flow identical to Scenario 7.
- Workflow 6 step 2: authority resolved via Tenant Company `check_access`. Absent.
- Correction Evidence transitions to `rejected` with failure code `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED`.
- Prior Delivery Date Evidence and Shipment Line state are unchanged.

### Scenario 9 - System Admin attempts correction with authority but without required supporting evidence

- Submission flow as in Scenario 7.
- Workflow 6 step 2: authority present.
- Workflow 6 step 3: content validation passes.
- Workflow 6 step 4: required supporting evidence reference is absent.
- Correction Evidence transitions to `rejected` with failure code `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`.
- This failure mode is distinct from the authority-absent failure mode of Scenario 8. The audit record carries the specific code.

### Scenario 10 - Vendor cannot self-correct Delivery Date after Delivered state

- Vendor attempts to submit a Delivery Date correction via a Fulfillment Import row targeting a Shipment Line already in Delivered state.
- Workflow 2 routes to the regression path; pending Delivery Date Evidence transitions to `rejected_regression_without_authority`.
- No Correction Evidence is created by vendor action. The dispute path requires System Admin escalation via Workflow 6 path 6b.

### Scenario 11 - Multi-vendor parent order, all vendors shipped

- Parent order has three vendor suborders (and three Shipment Lines).
- First and second Shipment Lines transition to shipped state. Workflow 7 creates a Buyer Update-Ready Signal in `pending` state, runs Workflow 9. Aggregation fails (third Shipment Line still not shipped). Signal transitions to `held_awaiting_all_vendors_shipped`.
- Third Shipment Line transitions to shipped state. Workflow 11 (re-evaluation) finds the held signal, re-runs Workflow 9. Aggregation passes. Signal transitions to `eligible`. Workflow 10 hands off to Integration Management. Signal transitions to `dispatched`.

### Scenario 12 - Multi-vendor parent order, partial delivery

- Parent order has two Shipment Lines. First is delivered; second is still in transit.
- Workflow 3 triggers for the first Shipment Line. Workflow 8 creates a Buyer Update-Ready Signal of `update_kind = delivery`. Workflow 9 aggregation: second Shipment Line not yet delivered. Signal transitions to `held_awaiting_all_vendors_delivered`.
- Partial delivery is visible through the held signal record; no silent omission.
- When the second Shipment Line is later delivered (via accepted Delivery Date Evidence and Workflow 3), Workflow 11 re-evaluates. Aggregation passes. Signal transitions to `eligible` and through to `dispatched`.

### Scenario 13 - Buyer integration paused

- A Buyer Update-Ready Signal reaches Workflow 9 evaluation.
- Multi-Vendor aggregation passes.
- Tenant Company buyer-level pause flag is set for this buyer.
- Signal transitions to `held_buyer_integration_paused`.
- When the pause is later cleared, Workflow 11 re-evaluates. If all other conditions pass, signal transitions to `eligible`.

### Scenario 14 - Buyer Update-Ready Signal dispatched but transport fails

- Workflow 10 hands off an `eligible` signal to Integration Management. Signal transitions to `dispatched`; `buyer_update_dispatch_reference` set.
- Integration Management exhausts its retry policy and reports failure.
- Workflow 12 sets `buyer_update_failure_reference`. Signal transitions to `failed` terminal state.
- The signal does not return to `eligible`. If retry is required at architectural level (rather than at the transport level), a new signal is created via correction or controlled supersession.

### Scenario 15 - Buyer Update-Ready Signal acknowledged

- Workflow 10 hands off an `eligible` signal. Signal transitions to `dispatched`.
- Integration Management successfully transports the update; buyer system acknowledges receipt. Integration Management produces an acknowledgement record.
- Workflow 12 sets `buyer_update_acknowledgement_reference`. Signal transitions to `acknowledged` terminal state.
- Only `acknowledged` constitutes evidence of buyer delivery. `eligible` and `dispatched` are independent earlier states.

### Scenario 16 - Correction after buyer acknowledgement

- A Shipment Line was delivered, the Buyer Delivery Update-Ready Signal was acknowledged.
- System Admin submits a Delivery Date Correction Evidence (Scenario 7 flow). Correction is applied.
- Workflow 6 step 7: prior delivery-kind signal is in `acknowledged` terminal state (preserved unchanged). Workflow 8 creates a new Buyer Update-Ready Signal with `update_kind = correction`, `superseded_buyer_update_ready_reference` pointing to the prior signal.
- The new correction-kind signal runs through Workflows 9, 10, 12 independently. The buyer receives a correction update; the original acknowledged update record is preserved for audit.

### Scenario 17 - Correction before buyer dispatch

- A Shipment Line was delivered, but the Buyer Delivery Update-Ready Signal is still in `held_awaiting_all_vendors_delivered` (other vendor suborders pending).
- System Admin submits a Delivery Date Correction Evidence. Correction is applied.
- Workflow 6 step 7: prior delivery-kind signal is in `held` state (not yet dispatched). Controlled supersession: the existing signal transitions to `superseded`; a new signal is created with the corrected references.
- The new signal continues through Workflow 9 evaluation (likely still held awaiting other vendors). The transition is controlled, not silent.

### Scenario 18 - Concurrent vendor imports for the same Shipment Line

- Two vendor imports targeting the same Shipment Line with different Delivery Dates arrive concurrently.
- Workflow 1 creates two Delivery Date Evidence records in `pending` state.
- Workflow 2 runs validation on each. Implementation-level concurrency control ensures one is processed first; the second sees the first's `accepted` outcome (if applicable) and applies the stale or duplicate rule.
- Result: one Delivery Date Evidence in `accepted` state; the other in `rejected_stale`, `rejected_duplicate`, or a different rejection state depending on values. Audit captures both.

### Scenario 19 - Out-of-order Shipped Date arrives after Delivered

- Shipment Line is in Delivered state.
- A delayed Shipped Date update arrives (e.g., from a delayed carrier-evidence path; not implemented in PR-B but the rule still applies if the existing baseline produces such a path).
- Out-of-order rule: update is recorded for audit; no regression of Delivered state; no new Buyer Update-Ready Signal.

### Scenario 20 - Tenant scope inactive

- A Buyer Update-Ready Signal reaches Workflow 9 evaluation.
- Tenant Company scope is inactive.
- Signal transitions to `held_tenant_scope_inactive`.
- When the scope is later activated, Workflow 11 re-evaluates.

### Scenario 21 - Manual hold by System Admin

- A System Admin with Delivery Date Override / Correction Authority places a Buyer Update-Ready Signal in `held_manual` state via Workflow 9 / Workflow 11 manual-hold action.
- Vendor or buyer activity does not release the hold automatically.
- When the System Admin lifts the manual hold, Workflow 11 re-evaluates.
- Manual hold without authority transitions to rejection with failure code `BUYER_UPDATE_MANUAL_HOLD_AUTHORITY_REQUIRED`; the signal is not transitioned to `held_manual` in that case.

### Scenario 22 - SLA-semantics preservation across content rejection

- Vendor submits a Fulfillment Import on time per the PR #92 Expected Fulfillment Response Deadline. SLA Evaluation Record outcome = on-time.
- The import contains a Delivery Date field that fails PR-B validation.
- Workflow 2 produces a `rejected_*` outcome for the Delivery Date Evidence. The Shipment Line is not transitioned to Delivered.
- PR #92's SLA Evaluation Record is not modified. The vendor's response remains on-time per SLA. The content rejection is recorded separately in PR-B audit.
- This scenario is the canonical check that PR-B's content validation does not retroactively change PR #92 SLA outcomes.
