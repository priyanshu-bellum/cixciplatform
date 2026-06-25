# Notification Platform Service Test Scenarios

This document is proposal-level architecture. It lists validation scenarios for future implementation and review.

## Request Intake

- Accept notification request with valid source module, event reference, tenant scope, template type, redaction class, and idempotency key.
- Reject request missing source event reference.
- Reject request missing tenant scope where tenant scope is required.
- Reject eligibility-based request missing eligibility evidence.
- Reject request with expired or cross-tenant eligibility evidence.
- Suppress duplicate request with same source event, recipient intent, template, channel, and idempotency key.
- Route request to review when source-module policy reference is missing.

## Eligibility Evidence

- Validate source module, source event reference, eligibility signal id, eligibility signal version/hash, recipient scope, recipient group reference, expiration timestamp, tenant scope, source-owned eligibility result, and re-check-before-delivery flag.
- Block delivery when eligibility evidence is stale, expired, missing, or inconsistent.
- Require fresh eligibility evidence when re-check-before-delivery is true.
- Verify Notification does not compute buyer/vendor eligibility, product compatibility, product visibility, supported-device matching, licensed-property scope, or tenant readiness.

## Recipient Resolution

- Resolve user recipient through Tenant Company scope.
- Resolve role-based recipient through Tenant Company role signals.
- Create role expansion snapshot.
- Create recipient expansion snapshot.
- Enforce max recipients per request.
- Resolve parent company and child entity recipients.
- Resolve buyer/vendor recipients using source-provided eligibility signals.
- Deny cross-tenant recipient resolution by default.
- Exclude inactive users or inactive companies when Tenant Company signals require it.
- Route stale role handling to exclusion, refresh, or review according to proposal-level policy.
- Collapse duplicate recipients across user, role, company, buyer, and vendor recipient projections.
- Treat customer recipient as placeholder unless source policy explicitly supports it.

## Preferences And Suppression

- Apply required/system notification override before normal user preferences.
- Apply legal unsubscribe requirement to optional marketing-style notifications.
- Apply hard suppression rule before optional preference evaluation.
- Apply user-level channel preference.
- Apply company-level preference.
- Apply child-entity preference.
- Apply event-type preference.
- Apply immediate versus digest preference placeholder.
- Apply quiet hours placeholder.
- Suppress unsubscribed/blocked recipient placeholder.
- Allow required/system override only where explicitly configured.
- Route unresolved preference conflicts to review-required.

## Templates And Privacy

- Render approved template with safe dynamic fields.
- Block inactive or unapproved template.
- Block unsafe dynamic field.
- Block pricing-sensitive field when recipient scope/redaction policy does not allow it.
- Block invoice/warranty/customer data exposure when source-module policy does not allow it.
- Verify template version is recorded in delivery attempt.

## Channels And Delivery

- Queue email delivery.
- Queue in-app delivery.
- Treat SMS as placeholder where not enabled.
- Treat webhook/external notification as placeholder where not enabled.
- Record provider delivery id reference.
- Record provider failure reason.
- Retry retryable failure within retry budget.
- Stop after retry budget exhausted.
- Mark delivery expired after timeout placeholder.
- Handle bounced status separately from generic failure.
- Prevent stale callback from reopening terminal status.
- Collapse duplicate provider callbacks by provider callback idempotency key.

## Digest And Fanout

- Create digest batch record for digest-eligible notification.
- Create digest job status for digest processing.
- Create fanout batch record for high-recipient notification.
- Apply tenant/channel/provider queue partition key.
- Enforce fanout caps.
- Apply provider rate-limit handling.
- Apply backpressure controls during provider outage.
- Throttle high-volume catalog notifications.
- Prevent notification storm from source event burst or retry loop.
- Paginate fanout batch and digest job status results.

## Eligibility-Based Notifications

- Deliver new vendor notification only when Tenant Company provides eligible buyer/vendor relationship signals and Product Catalog/Device Catalog provide compatible accessory/device signals.
- Do not deliver new vendor notification when compatibility signal is missing.
- Do not deliver new buyer notification when buyer is not active.
- Do not deliver vendor accessory update notification when buyer lacks Product Type eligibility.
- Do not let Notification independently decide compatibility or eligibility.

## Logs & Audit Relationship

- Create delivery audit reference for a sent notification.
- Send delivery audit reference to Logs & Audit where configured.
- Preserve notification delivery history even if Logs & Audit write is delayed.
- Do not treat notification history as replacement for Logs & Audit evidence.

## AI Agent Services Boundary

- Accept approved AI-drafted notification content after redaction/template validation.
- Reject AI-drafted content that bypasses approval where approval is required.
- Reject AI-drafted content with unsafe dynamic fields.
- Preserve AI recommendation/draft reference where permitted.

## Boundary Tests

- Notification cannot mutate Product Catalog records.
- Notification cannot decide Product Catalog compatibility.
- Notification cannot mutate Device Catalog records.
- Notification cannot calculate Pricing outcomes.
- Notification cannot reroute Order Routing records.
- Notification cannot update Fulfillment/Returns state.
- Notification cannot finalize Invoice Management records.
- Notification cannot approve warranty claims.
- Notification cannot mutate Logs & Audit evidence records.
- Notification cannot accept/reject AI recommendations.

## Scalability Tests

- Bulk event fanout respects recipient/channel limits.
- Retry storms are prevented by retry budgets.
- Duplicate suppression prevents repeated sends for same source event.
- Notification history search is paginated.
- Digest placeholder handles many events without per-event delivery explosion.
- Provider outage does not overload source modules.
- Role-based expansion does not exceed recipient cap.
- Customer-facing notification volume remains disabled or constrained until ownership is decided.
- Template version changes do not break historical delivery reconstruction.
- Tenant isolation is preserved across queue partitions and history lookup.

## Open Questions

- Which test scenarios are required before launch?
- Which scenarios require module-level contract tests with Tenant Company, Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Logs & Audit, and AI Agent Services?
- Which privacy and redaction tests are mandatory for every template?
- Which scale tests are required before high-volume catalog notifications are enabled?

## Scheduled System Admin Activity Summary Email Test Scenarios (Cross-Module PR)

This section adds proposal-level test/review scenarios for the Notification Platform Service side of the cross-module summary email hardening pass. Scenarios are architecture-level walk-throughs intended for spec review, not runtime test code. Each scenario references the cross-module workflows; reviewers should walk through each step and confirm boundary discipline and the anti-loss invariant.

### Scenario PR-C-NPS-1: Standard scheduled delivery (happy path)

1. CIXCI System Admin creates an Activity Summary Configuration with `delivery_times = [09:00, 13:00, 18:00]`, `timezone_reference = America/New_York`, `weekend_behavior = deliver`, `holiday_behavior = deliver`, role-derived scope present, explicit list with two addresses.
2. Configuration is activated. Cursor is initialized to the activation timestamp.
3. 09:00 America/New_York arrives. NPS Workflow 2 fires. Notification Platform Service requests Analytics / Reporting evaluation.
4. Analytics Workflow 4 creates Reporting Window (start = activation timestamp; end = 09:00 today). No prior `delivery_failed` windows; carry-forward collection is empty.
5. Analytics Workflow 5 aggregates source facts. Result: non-empty (orders routed successfully, orders delivered, etc.). Aggregation Record produced.
6. Logs & Audit Workflow 10 records Activity Summary Generated Evidence.
7. NPS Workflow 7 creates Activity Summary Delivery Attempt in `pending` state. NPS Workflow 3 resolves recipients; effective set is the deduplicated union of role-derived CIXCI System Admin users and the explicit list (minus any vendor or buyer addresses filtered out).
8. Email payload is assembled using the hardcoded Phase 1 template with totals from the aggregation record.
9. Transport handoff occurs. Attempt transitions to `dispatched`. `notification.activity-summary-delivery.attempted` emitted.
10. Transport reports acknowledgement. NPS Workflow 9 transitions attempt to `acknowledged`. Reporting Window transitions to `delivered`. Cursor advances to 09:00 today. `notification.activity-summary-delivery.succeeded` emitted. Logs & Audit Workflow 10 records the success via existing Audit Record pattern.

Expected: cursor advanced; one email sent; immutable evidence trail across all three modules.

### Scenario PR-C-NPS-2: Delivery failure with carry-forward

1. Configuration as in PR-C-NPS-1. Cursor at 09:00 today.
2. 13:00 arrives. Reporting Window created (start = 09:00, end = 13:00). Aggregation produces non-empty record. Delivery attempt created and dispatched.
3. Transport reports failure. NPS Workflow 8 transitions attempt to `failed`. Reporting Window transitions to `delivery_failed`. **Cursor does NOT advance.** `notification.activity-summary-delivery.failed` emitted. Logs & Audit Workflow 10 records the failure via existing Audit Record pattern.
4. 18:00 arrives. NPS Workflow 2 fires.
5. Analytics Workflow 4 creates a new Reporting Window (start = 09:00 still; end = 18:00). Carry-forward identification finds the 09:00-13:00 window in `delivery_failed` state; its reference is added to the new window's `carry_forward_window_reference_collection`.
6. Analytics Workflow 5 aggregates source facts over the effective interval (09:00 to 18:00, which is the union of primary 13:00-18:00 and subsumed 09:00-13:00).
7. Aggregation produces non-empty record. Delivery attempt created and dispatched.
8. Transport reports acknowledgement. NPS Workflow 9 transitions attempt to `acknowledged`. Reporting Window transitions to `delivered`. The subsumed 09:00-13:00 window transitions to `superseded`. Cursor advances to 18:00 today.

Expected: no activity lost; the 09:00-13:00 facts are reflected in the 18:00 delivery; the failed window is preserved for audit but transitioned to `superseded`.

### Scenario PR-C-NPS-3: No-activity suppression

1. Configuration as in PR-C-NPS-1. Cursor at 09:00 today.
2. 13:00 arrives. Reporting Window created (start = 09:00, end = 13:00).
3. Analytics Workflow 5 queries source facts. Zero events in the interval.
4. Analytics Workflow 6 transitions Reporting Window to `suppressed_no_activity`. Triggers Logs & Audit Workflow 10 to record No-Activity Summary Suppression Evidence. Emits `analytics.activity-summary-window.evaluated` with `resultDiscriminator = suppressed_no_activity`. **Analytics does NOT advance the cursor.**
5. Notification Platform Service consumes the suppression-outcome event via NPS Workflow 9 Trigger B path. NPS validates the suppression-outcome and advances its own configuration cursor to 13:00. NPS captures the cursor-advancement timestamp at the moment of mutation, then signals Logs & Audit Workflow 10 to create an NPS-side Audit Record (existing Audit Record entity pattern) with `event_action_type = activity_summary_cursor_advanced_on_consumed_no_activity_outcome`, carrying the cursor-advancement timestamp and referencing the Activity Summary Configuration, the Activity Summary Reporting Window, and the pre-cursor No-Activity Summary Suppression Evidence record. The Suppression Evidence record itself is not modified.
5. **No delivery attempt is created.** No email sent.

Expected: no email; cursor advanced (so 18:00 window does not re-evaluate 09:00-13:00); audit trail preserved for the cursor advancement.

### Scenario PR-C-NPS-4: Multiple consecutive failures

1. Configuration as in PR-C-NPS-1. Cursor at 09:00 yesterday (last successful delivery was yesterday morning).
2. 13:00 yesterday: delivery failed. Window 1 in `delivery_failed`. Cursor unchanged.
3. 18:00 yesterday: aggregation extends back to 09:00 yesterday (union of primary 13:00-18:00 plus carry-forward 09:00-13:00). Delivery failed. Window 2 in `delivery_failed`. Cursor unchanged. Window 1 remains in `delivery_failed` (NPS Workflow 8 does not transition it).
4. 09:00 today: aggregation extends back to 09:00 yesterday (union of primary 18:00-09:00 plus carry-forward of Windows 1 and 2). Delivery succeeds. NPS Workflow 9: cursor advances to 09:00 today; Windows 1 and 2 both transition to `superseded`.

Expected: 24 hours of activity carried forward across three failed windows and one successful delivery; no activity lost.

### Scenario PR-C-NPS-5: Configuration paused mid-day

1. Configuration as in PR-C-NPS-1. Cursor at 09:00 today.
2. 13:00 delivery succeeds. Cursor at 13:00 today.
3. 14:00: CIXCI System Admin pauses the configuration via NPS Workflow 1 (`active -> paused`). Cursor stays at 13:00 today.
4. 18:00 scheduled time arrives. NPS Workflow 2 confirms configuration is not `active`. No window created. No audit record specific to the paused-skipped trigger.
5. Next day 11:00: CIXCI System Admin unpauses the configuration (`paused -> active`).
6. Next day 13:00: scheduled time arrives. Reporting Window created (start = 13:00 today, end = 13:00 next day = ~24 hours of effective interval).
7. Aggregation runs across the ~24-hour interval. Result may be non-trivially large (long-pause-large-window accepted Phase 1 behavior). Delivery attempted.

Expected: pause does not reset cursor; unpause extends the next window back to the pause point; large-window-after-long-pause behavior documented and accepted.

### Scenario PR-C-NPS-6: Zero effective recipients

1. Configuration created with `role_derived_recipient_scope` only (no `explicit_recipient_list`). At the time, three CIXCI System Admin users exist.
2. Over time, all three CIXCI System Admin role assignments are revoked (departures, role changes). The configuration is not edited.
3. Next scheduled time arrives. NPS Workflow 7 creates a delivery attempt. NPS Workflow 3 resolves recipients; Tenant Company `check_access` returns zero CIXCI System Admin users. Effective recipient set is empty.
4. NPS Workflow 7 cannot proceed with transport handoff. The delivery attempt transitions immediately to `failed` with `failure_reason_text = "zero effective recipients"`. **Cursor does NOT advance.** The Reporting Window transitions to `delivery_failed` and is eligible for carry-forward.

Expected: explicit failure with audit trail; activity not lost (carry-forward will pick it up if effective recipients exist for the next window).

### Scenario PR-C-NPS-7: Vendor or buyer email in explicit recipient list

1. CIXCI System Admin creates a configuration with `explicit_recipient_list = ["systemadmin@cixci.com", "buyer-user@retailer.com"]`. The `buyer-user@retailer.com` address resolves via Tenant Company to a buyer user.
2. Configuration is saved. (At configuration save time, the system may or may not filter; Phase 1 leaves the explicit list as-is at save time and filters at delivery time.)
3. Next scheduled time arrives. NPS Workflow 3 resolves recipients. The `buyer-user@retailer.com` address is identified via Tenant Company `check_access` as a buyer user and is excluded. The exclusion is audited.
4. Effective recipient set contains only `systemadmin@cixci.com` plus any role-derived CIXCI System Admin users.

Expected: vendor and buyer user exclusion enforced at delivery time; configuration edit time does not silently strip; audit trail preserves both the original list and the exclusion event.

### Scenario PR-C-NPS-8: Retry attempt after failure

1. Configuration as in PR-C-NPS-1. Cursor at 09:00 today.
2. 13:00 delivery dispatched but transport reports failure. Attempt #1 transitions to `failed`. Reporting Window in `delivery_failed`.
3. Notification Platform Service implementation produces a retry; a new Activity Summary Delivery Attempt (Attempt #2) is created referencing the same aggregation record and Reporting Window. Attempt #1 remains in `failed` terminal state.
4. Attempt #2 dispatched. Transport reports acknowledgement. NPS Workflow 9 transitions Attempt #2 to `acknowledged`. Reporting Window transitions to `delivered`. Cursor advances to 13:00 today.

Expected: retry produces a new attempt, not a state reset on the prior attempt; both attempts are preserved for audit; cursor advancement happens on Attempt #2's acknowledgement.

### Cross-module verification checklist

For each scenario, reviewers should confirm:

- Cursor advancement happens only on `acknowledged` terminal state of a delivery attempt OR on no-activity suppression. Never on `failed`.
- No delivery attempt is created on no-activity suppression.
- Carry-forward subsumption transitions prior `delivery_failed` windows to `superseded` only when the subsuming window's delivery reaches `acknowledged`.
- Vendor and buyer users are excluded at both the configuration-authority layer and the delivery-time-resolution layer.
- Logs & Audit Workflow 10 produces the appropriate evidence record or audit record on every relevant trigger.
- Source-module records are never modified.
- The PR #92 SLA-semantics preservation invariant and the PR #94 delivery-date and buyer-update semantics preservation invariant continue to hold.
