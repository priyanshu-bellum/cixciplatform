# Analytics / Reporting Edge Cases

This document captures proposal-level edge cases and architecture risks. It does not finalize business rules or implementation behavior.

## Access And Tenant Scope

- Actor has a stale access projection when opening a report.
- Buyer parent can access parent-level report but a child entity is inactive.
- Vendor report would reveal buyer data that is not vendor-authorized.
- Manufacturer report would reveal vendor performance data beyond approved coverage signals.
- CIXCI system admin requests cross-tenant report without approved role.
- Report export contains fields with mixed redaction classes.
- Source-module visibility rule changes after a saved report is created.

## Source Input Freshness

- Product Catalog snapshot is newer than Device Catalog coverage data.
- Pricing snapshot is superseded after a report was generated.
- Fulfillment evidence arrives late or out of order.
- Invoice Management records are not yet refreshed into reporting read models.
- Integration Management health signals are delayed during provider outage.
- Logs & Audit file-processing events are high volume and partially delayed.

## Metric Versioning

- Metric definition changes after historical reports are generated.
- Dashboard mixes metrics with different definition versions.
- Scheduled report runs before a new metric version is fully active.
- Metric version is deprecated while saved reports still reference it.

## Report Exports

- Export request exceeds row count or size placeholder.
- Export contains customer-sensitive data that should be redacted by default.
- Export file generation succeeds but Logs & Audit tracking fails.
- Export request is retried and duplicate file generation risk exists.
- Export recipient scope differs from report requester scope.

## Reporting Families

- Buyer wants branded merchandise performance but product type is not enabled.
- Vendor wants new buyer opportunity signals but Tenant Company relationship scope is unresolved.
- Manufacturer wants device-to-accessory coverage but Product Catalog compatibility assertions are stale.
- System admin wants commission/revenue summaries, but Pricing snapshots or Invoice records are incomplete.
- AI recommendation accepted/rejected data exists without enough tenant-safe outcome detail.

## Privacy And Redaction

- Customer-level data appears in source events but should not be included in reports.
- Pricing-sensitive and invoice-sensitive fields are requested by a non-authorized report audience.
- Media-rights or licensing-sensitive fields appear in branded merchandise reports.
- Warranty-sensitive data is included in a broad operational dashboard.

## Operational Risks

- Dashboard refresh failure affects many tenants.
- Report definition bug causes incorrect trend analysis.
- Read model refresh job falls behind source event volume.
- Scheduled report fanout creates notification pressure.
- High-cardinality filters create expensive queries.
- Saved reports are not revalidated against current permissions.

## Boundary Risks

- Analytics is treated as authoritative for product visibility.
- Analytics is used to infer tenant eligibility instead of consuming Tenant Company scope.
- Analytics recalculates pricing rather than reporting on Pricing snapshots.
- Analytics becomes an audit evidence store instead of referencing Logs & Audit.
- Analytics exposes notification delivery status as source truth instead of Notification Platform Service history.
- Analytics treats Integration Management health trend as integration control state.

## Proposal-Level Mitigations

- Revalidate access projections at report run/export time.
- Include source version references and freshness markers in reports.
- Version metric and report definitions.
- Use redaction classes for report fields, exports, and events.
- Emit audit references for sensitive report access and exports.
- Treat Analytics outputs as reporting views, not operational commands.

## Scheduled System Admin Activity Summary Aggregation Edge Cases (Cross-Module PR)

This section catalogs edge cases for the Analytics / Reporting side of the cross-module summary email hardening pass.

### Edge Case PR-C-ANA-EC-1: Late source fact arrives after window aggregated

- Scenario: A source event with `occurredAt` in W1's interval arrives at Analytics after W1 has been aggregated and delivered.
- Expected guardrail: W1's Aggregation Record is immutable; it is not edited. The late event is held in Analytics for possible inclusion in a subsequent window's aggregation if that subsequent window's effective interval (via carry-forward) extends back to the late event's `occurredAt`. If no such carry-forward applies, the late event is not represented in any aggregation; Phase 1 accepts this loss. Architectural expectation documented; concrete implementation (Late Source Fact Reference disposition) deferred.

### Edge Case PR-C-ANA-EC-2: Source event without `occurredAt`

- Scenario: A source event lacks or has a malformed `occurredAt` timestamp.
- Expected guardrail: Phase 1 architectural rule: events without a valid `occurredAt` are not eligible for aggregation. Implementation may log the exception; PR-C does not specify the exception path. Source modules are expected to produce events with `occurredAt` per their own contracts (PR #91, PR #92, PR #94 specify `occurredAt`).

### Edge Case PR-C-ANA-EC-3: Source event with future `occurredAt`

- Scenario: A source event's `occurredAt` is in the future relative to the current window's `window_end_timestamp`.
- Expected guardrail: the event is not included in the current window's aggregation (its `occurredAt` is outside the effective interval). It may be picked up by a future window. Phase 1 architectural expectation.

### Edge Case PR-C-ANA-EC-4: Source event arrives twice (duplicate)

- Scenario: A source event with the same `eventId` is consumed twice by Analytics aggregation.
- Expected guardrail: Source Fact Reference deduplication on `source_event_reference` prevents double-counting in a single aggregation. Across multiple aggregations (current window plus carry-forward), the same source event reference is also deduplicated. Implementation-layer deduplication is implementation detail; the architectural rule is "each source event reference contributes once per aggregation record."

### Edge Case PR-C-ANA-EC-5: Carry-forward of subsumed window receives late event

- Scenario: A late event arrives after W1 (carry-forward target) is already subsumed and superseded by W2's successful delivery.
- Expected guardrail: the late event is held in Analytics for possible inclusion in W3 if W3's effective interval extends back. W3's effective interval extends back via carry-forward only if W2 fails (which would put W2 in `delivery_failed` and trigger W3's carry-forward). If W2 succeeded, the late event is not represented; Phase 1 accepts this.

### Edge Case PR-C-ANA-EC-6: Concurrent aggregation requests for the same configuration

- Scenario: Two scheduled times for the same configuration fire near-simultaneously due to scheduler drift.
- Expected guardrail: implementation-layer detail. PR-C architectural rule: each evaluation produces its own Reporting Window with distinct identifiers. If two windows for the same configuration both reach `evaluating` state and aggregate overlapping intervals, downstream behavior depends on which one's delivery attempt succeeds first. Phase 1 accepts that the cursor advancement logic (NPS Workflow 9) on whichever succeeds first will determine the cursor; subsequent successful deliveries for the overlapping window will be no-ops on the cursor (the cursor only advances forward). Implementation should serialize evaluations per configuration to avoid this; PR-C captures the architectural rule but does not enforce serialization.

### Edge Case PR-C-ANA-EC-7: Phase 1 conditional metric absent

- Scenario: `return_refunded_count` has no source event in the Fulfillment / Returns baseline; or `total_new_orders` has no source event for order intake.
- Expected guardrail: the affected metric is absent from the Aggregation Record. The section structure preserves a Phase-1-conditional-deferred marker. The aggregation record explicitly documents the absence rather than producing a wrong count or silently omitting the metric.

### Edge Case PR-C-ANA-EC-8: All metrics in a section are zero, but other sections non-zero

- Scenario: The `orders` section has zero counts in the window (no order activity), but the `shipping` section has non-zero `orders_delivered` count.
- Expected guardrail: the Aggregation Record is non-empty (at least one section has non-zero counts). NPS Workflow 7 is signaled. The hardcoded email template renders all sections, including the `orders` section with zero counts. Recipients see the full section structure with zero values where applicable. (This is distinct from no-activity suppression, which applies only when ALL sections are zero across the entire window.)

### Edge Case PR-C-ANA-EC-9: Window interval crosses DST boundary

- Scenario: A 4-hour scheduled interval crosses a DST transition in the configured timezone.
- Expected guardrail: implementation-layer detail. PR-C architectural rule: `window_start_timestamp` and `window_end_timestamp` are stored as absolute timestamps; source event `occurredAt` is compared in absolute time. The DST shift does not change which events fall in the interval. Phase 1 accepts implementation behavior for the scheduler.

### Edge Case PR-C-ANA-EC-10: Aggregation produces inconsistent counts across sections that reference the same underlying entity

- Scenario: For example, `orders_routed_successfully` (orders section, count of routing-delivery events) and `orders_processed` (shipping section, count of export-window-executed events) refer to overlapping but distinct event sets; could differ by 0-N depending on the window.
- Expected guardrail: this is expected behavior, not an edge case. Each metric counts distinct events; their numerical relationship depends on source event volume. PR-C does not enforce cross-metric consistency.

### Edge Case PR-C-ANA-EC-11: Reporting Window straddles configuration retirement

- Scenario: An `evaluating` Reporting Window for a configuration that is retired mid-evaluation.
- Expected guardrail: Phase 1 architectural rule: the in-flight window completes evaluation and (if non-empty) signals NPS Workflow 7. Future operator-surface PR may introduce cancellation semantics.

### Edge Case PR-C-ANA-EC-12: Carry-forward window's source events are no longer available

- Scenario: A carry-forward window references source events that have been purged or are otherwise unavailable at Analytics query time.
- Expected guardrail: Phase 1 architectural rule: source events are expected to be available within retention. If the implementation-layer source-event retention is shorter than the maximum carry-forward window depth, that is an implementation gap to surface. PR-C does not specify retention duration; future Analytics-aggregation-engine hardening must coordinate retention with carry-forward depth.
