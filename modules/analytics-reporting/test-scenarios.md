# Analytics / Reporting Test Scenarios

These are proposal-level architecture test scenarios. They do not define implementation test automation yet.

## Access And Scope

1. Buyer parent user views buyer assortment report and sees only buyer-authorized data.
2. Buyer child entity user views report and is limited to child entity scope.
3. Accessory vendor user views product export trends and sees only vendor-authorized buyer signals.
4. Device manufacturer user views device adoption and sees only manufacturer-authorized device signals.
5. Non-system-admin attempts cross-tenant report and is denied.
6. CIXCI system admin with approved role views platform-wide operational report and access is auditable.
7. Saved report is rerun after user role changes and current permissions are enforced.

## Redaction And Privacy

1. Customer-sensitive order data is excluded or redacted by default.
2. Pricing-sensitive values are hidden from audiences without pricing report permission.
3. Invoice-sensitive fields require invoice report permission and proper tenant scope.
4. Warranty-sensitive data is redacted from broad operational dashboards.
5. Media-rights/licensing-sensitive fields are withheld from unauthorized branded merchandise reports.

## Metric Governance

1. Metric definition update creates a new version.
2. Historical report result references the metric definition version used at generation time.
3. Dashboard with stale metric version is flagged or refreshed according to proposal-level policy.
4. Deprecated metric definition remains traceable for historical report interpretation.

## Read Model And Freshness

1. Product Catalog event updates catalog growth read model.
2. Device Catalog snapshot updates device coverage read model.
3. Fulfillment event arrives late and report freshness marker reflects lag.
4. Read model refresh fails and emits `analytics.read-model.refresh.failed`.
5. Stale data emits `analytics.data-freshness.warning`.

## Report Generation

1. Buyer report for products exported/downloaded includes source freshness marker.
2. Vendor report for buyers that exported products excludes non-authorized buyer details.
3. Manufacturer report for device-to-accessory coverage uses Device Catalog and Product Catalog references.
4. System admin report for integration health uses Integration Management signals without mutating integrations.
5. AI recommendation accepted/rejected report consumes AI outcome signals without owning AI outcomes.

## Export

1. Authorized user exports CSV report and export carries audit reference.
2. Export request with redaction conflict is blocked or routed to review.
3. Duplicate export request with same idempotency key does not create duplicate evidence unexpectedly.
4. Exported report file is tracked by Logs & Audit where required.

## Notification Hooks

1. Scheduled report ready emits event consumed by Notification Platform Service.
2. Dashboard refresh failure emits notification hook while Notification owns delivery.
3. Report export failure creates review signal without Analytics owning notification retry.

## Boundary Tests

1. Analytics cannot update Product Catalog product visibility.
2. Analytics cannot resolve Device Reference identity.
3. Analytics cannot calculate price or commission.
4. Analytics cannot reroute an order.
5. Analytics cannot mark shipment delivered or return refunded.
6. Analytics cannot generate/finalize invoices.
7. Analytics cannot grant tenant/user access.
8. Analytics cannot mutate audit evidence, notification history, media assets, integration configuration, or AI recommendations.

## Scheduled System Admin Activity Summary Aggregation Test Scenarios (Cross-Module PR)

This section adds proposal-level test/review scenarios for the Analytics / Reporting side of the cross-module summary email hardening pass. Scenarios are architecture-level walk-throughs for spec review.

### Scenario PR-C-ANA-1: Source fact aggregation across all four sections

1. Reporting Window created with `window_start = 09:00 today`, `window_end = 13:00 today`. Carry-forward collection empty.
2. Analytics Workflow 5 queries source-module event streams over the 4-hour interval:
   - Order Routing (PR #91): 12 `order-routing.export-window.executed`, 8 `order-routing.export-delivery-evidence.confirmed`, 3 `order-routing.export-review.required`.
   - Fulfillment / Returns (PR #92): 2 `fulfillment-returns.late-fulfillment-import-exception.created`, 1 `fulfillment-returns.partial-fulfillment-response-exception.created`.
   - Fulfillment / Returns (PR #94): 25 `fulfillment-returns.shipment-line.delivered`, 4 `fulfillment-returns.buyer-update-ready.held`, 1 `fulfillment-returns.buyer-update-ready.failed`, 2 `fulfillment-returns.delivery-date-correction.proposed`.
   - Fulfillment / Returns baseline: return-submission 3, return-received 2, return-rejected 1, returns-requiring-review 1.
3. Aggregation Record produced with sections:
   - `orders`: `orders_routed_successfully = 8`, `orders_requiring_review = 3`, `vendors_involved` and `retailers_buyers_involved` from distinct counts. `total_new_orders` Phase 1 conditional (may be absent if source event does not exist).
   - `shipping`: `orders_processed = 12`, `orders_delivered = 25`, `orders_shipped` Phase 1 conditional (if baseline shipped-state-transition source absent), `missing_tracking_count` from baseline row-validation.
   - `returns`: `return_submissions = 3`, `return_received_count = 2`, `return_rejected_count = 1`, `returns_requiring_review = 1`. `return_refunded_count` Phase 1 conditional.
   - `exceptions`: `late_vendor_fulfillment_import_count = 2`, `partial_fulfillment_response_exceptions = 1`, `held_buyer_updates = 4`, `failed_buyer_updates = 1`, `delivery_date_corrections_pending_review = 2`, `late_missing_vendor_responses = 2` (combined late + missing from PR #92).
4. Summary Source Fact References collected per metric.

Expected: each metric value matches the source-event count in the interval; Source Fact References point to actual source events; no source-module record modified.

### Scenario PR-C-ANA-2: Carry-forward window subsumption

1. Reporting Window W1 created at 13:00 today (start = 09:00, end = 13:00). Aggregation produces non-empty record. Delivery dispatched and fails. W1 transitions to `delivery_failed`. Cursor unchanged.
2. Reporting Window W2 created at 18:00 today (start = 09:00 because cursor still at 09:00, end = 18:00). Analytics Workflow 4 identifies W1 in `delivery_failed`; adds W1 reference to W2's `carry_forward_window_reference_collection`.
3. Analytics Workflow 5 queries source events over the effective interval (09:00 to 18:00). Source Fact References are deduplicated: events whose `occurredAt` fell in 09:00-13:00 (W1's interval) are counted once; events from 13:00-18:00 (W2's primary interval) are counted once.
4. Aggregation Record produced with combined counts.
5. NPS Workflow 7 dispatches. Transport acknowledges. NPS Workflow 9 transitions W2 to `delivered`, transitions W1 from `delivery_failed` to `superseded` (the supersession_by_reference on W1 points to W2). Cursor advances to 18:00.

Expected: no source event double-counted; W1 preserved for audit but state changed to `superseded`; W2 reflects the full 09:00-18:00 interval.

### Scenario PR-C-ANA-3: Late source fact arrival

1. Reporting Window W1 evaluated at 13:00 with interval 09:00-13:00. Aggregation included all source events whose `occurredAt` fell in 09:00-13:00 and that had arrived at Analytics by 13:00 evaluation time.
2. Aggregation Record produced. Delivery succeeds. Cursor advances to 13:00.
3. At 14:30, a source event arrives at Analytics with `occurredAt = 12:45` (late by 1h45m). The event would have been in W1's interval if it had arrived on time.
4. W1's Aggregation Record is **NOT edited** (immutability). The late event is held in Analytics for inclusion in the next window's aggregation if that next window's effective interval extends back to 12:45 via carry-forward.
5. At 18:00, W2 is evaluated (start = 13:00, end = 18:00). The late event's `occurredAt = 12:45` is NOT in W2's primary interval (13:00-18:00) and is NOT in any carry-forward interval (no failed prior windows). The late event is therefore **not picked up** by W2.

Expected: late events lost from aggregation in this scenario (Phase 1 accepted behavior). A late-arrival Reconciliation Reference disposition is documented in edge-cases.md; concrete implementation deferred. If the prior window had been in `delivery_failed`, the late event would have been picked up via carry-forward.

### Scenario PR-C-ANA-4: No-activity suppression with cursor advancement

1. Reporting Window created (start = 13:00 today, end = 18:00 today). No prior `delivery_failed` windows.
2. Analytics Workflow 5 queries source events. Result: zero events across all sections, all source modules.
3. Analytics Workflow 6 transitions window to `suppressed_no_activity`. Triggers Logs & Audit Workflow 10 to record No-Activity Summary Suppression Evidence. Emits `analytics.activity-summary-window.evaluated` with `resultDiscriminator = suppressed_no_activity`. **Analytics does NOT advance the Activity Summary Configuration cursor.**
4. Notification Platform Service consumes the suppression-outcome event via NPS Workflow 9 Trigger B path. NPS validates the suppression-outcome (window state is `suppressed_no_activity`, suppression evidence exists at Logs & Audit, no in-flight `dispatched` attempt for the same window). **NPS advances the Activity Summary Configuration cursor to 18:00.** NPS captures the cursor-advancement timestamp at the moment of mutation and signals Logs & Audit Workflow 10 to record an NPS-side Audit Record with `event_action_type = activity_summary_cursor_advanced_on_consumed_no_activity_outcome` carrying that timestamp and referencing the Suppression Evidence record, the Reporting Window, and the configuration. The pre-cursor Suppression Evidence record is not modified.
5. No `analytics.activity-summary-aggregation.created` event emitted (no record produced).
6. NPS Workflow 7 is NOT signaled. No delivery attempt created.

Expected: cursor advanced; no email; suppression evidence retained; the next 09:00 window (next day) extends from 18:00 prior day, not from any earlier point.

### Scenario PR-C-ANA-5: Phase 1 conditional metric absent

1. PR-C bundle applied without `return_refunded_count` source events in Fulfillment / Returns baseline. The applier confirmed during bundle drafting that no source event exists for refund execution.
2. Aggregation Record produced for a window with non-zero return activity. The `returns` section omits `return_refunded_count`; the section structure includes a Phase-1-conditional-deferred marker for the metric.
3. The hardcoded email template renders the `returns` section without the refunded count; recipients see the deferred-metric placeholder.

Expected: aggregation does not silently produce a wrong count; conditional metrics are explicitly absent.

### Cross-module verification checklist for Analytics / Reporting side

For each scenario, reviewers should confirm:

- The Activity Summary Aggregation Record is immutable.
- Source events are read-only inputs; no source-module record is modified.
- Carry-forward identification (Workflow 4) only includes windows in `delivery_failed` terminal state, not `dispatched`-in-flight or `pending` states.
- Carry-forward subsumption finalization (transition to `superseded`) happens only at NPS Workflow 9, not at Analytics Workflows 4, 5, or 6.
- The cursor is advanced exclusively by Notification Platform Service (NPS Workflow 9). Trigger A is the delivery-acknowledged path; Trigger B is the consumed-no-activity-suppression-outcome path. Analytics produces outcomes (Reporting Window state, aggregation record, suppression-outcome event, Logs & Audit evidence trigger) but never writes to the configuration cursor.
- Late source facts are handled per the documented architectural expectation (picked up by carry-forward if applicable; otherwise Phase 1 accepts loss).
- Phase 1 conditional metrics may be absent; the aggregation record's section structure documents intentional deferrals.
- The PR #92 SLA-semantics preservation invariant and the PR #94 delivery-date and buyer-update semantics preservation invariant continue to hold.
