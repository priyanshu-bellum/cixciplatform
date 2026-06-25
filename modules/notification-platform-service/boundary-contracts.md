# Notification Platform Service Boundary Contracts

This document is proposal-level architecture. It clarifies Notification Platform Service boundaries without moving source-module business logic into Notification.

## What Notification Platform Service May Answer

- Which notification request was received, accepted, rejected, suppressed, queued, sent, failed, retried, expired, or delivered where provider-supported.
- Which notification template and template version were used.
- Which channel was selected.
- Which recipient resolution result was used.
- Which preference, suppression, unsubscribe placeholder, or required/system override affected delivery.
- Which delivery attempts were made.
- Which provider response reference was recorded.
- Which retry policy placeholder and retry/failure history apply.
- Which idempotency key or duplicate suppression record applied.
- Which delivery audit reference was sent to Logs & Audit.
- Which notification history record exists.

## What Notification Platform Service Must Not Answer

- Whether a tenant, buyer, vendor, child entity, user, region, Product Type, or licensed property is eligible.
- Whether a buyer/vendor relationship is approved.
- Which products are visible, active, compatible, downloadable, or review-ready.
- Which canonical Device Reference is correct.
- What price, pricing exception, commission, or pricing snapshot is valid.
- Which order route, vendor/manufacturer target, or suborder is correct.
- Whether a shipment is delivered or a return/replacement is complete.
- Whether an invoice should be generated, finalized, adjusted, or reconciled.
- Whether a warranty claim is eligible, approved, denied, or fulfilled.
- Whether a Logs & Audit evidence record is canonical.
- Whether an AI recommendation should be accepted, rejected, or executed.
- What Analytics reporting definitions, rollups, or metrics mean.

## Boundary Splits

### Tenant Company vs Notification

Tenant Company owns users, roles, permissions, company/entity scope, activation, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, readiness signals, and notification eligibility inputs.

Notification may consume Tenant Company signals for recipient resolution and preference application. Notification must not infer or override eligibility.

### Product Catalog vs Notification

Product Catalog owns product records, accessory additions, visibility records, activation/download state, compatibility assertions, exports, and catalog validation outcomes.

Notification may deliver messages based on eligible Product Catalog events. Notification must not decide product visibility, compatibility, activation, download, or validation state.

### Device Catalog vs Notification

Device Catalog owns canonical Device References, device records, buyer device portfolio references, device visibility, and device identity conflicts.

Notification may deliver messages based on Device Catalog events. Notification must not resolve device identity or buyer device scope.

### Pricing vs Notification

Pricing owns pricing interpretation, calculations, exceptions, snapshots, buyer pricing mode interpretation, and pricing audit.

Notification may deliver review or failure messages based on Pricing events. Notification must not expose pricing-sensitive values unless source-module policy, recipient scope, and redaction rules allow it.

### Order Routing vs Notification

Order Routing owns routing decisions, order decomposition, vendor/manufacturer suborders, routing snapshots, routing exceptions, and retry/review workflows.

Notification may notify about routing outcomes or review needs. Notification must not reroute, create suborders, or resolve routing exceptions.

### Fulfillment / Returns vs Notification

Fulfillment/Returns owns shipment state, delivery status, return operational state, replacement execution, and operational exceptions.

Notification may notify about shipment, delivery, return, or replacement events. Notification must not update fulfillment or return state.

### Invoice Management vs Notification

Invoice Management owns invoice generation, invoice records, reports, status lifecycle, exports, history, and reconciliation placeholders.

Notification may notify about invoice and reconciliation events. Notification must not generate, finalize, correct, reconcile, or process payments.

### Warranty Support vs Notification

Warranty support or a future Warranty Management context owns warranty claim state and approval behavior.

Notification may notify about warranty registration or claim review signals. Notification must not decide warranty eligibility, approval, or fulfillment.

### Logs & Audit vs Notification

Logs & Audit owns platform audit evidence. Notification owns notification delivery history.

Notification may send delivery audit references to Logs & Audit. Notification must not replace Logs & Audit, mutate audit evidence, or become unrestricted audit storage.

### AI Agent Services vs Notification

AI Agent Services owns recommendations, drafts, confidence scores, and action outcome records.

AI agents may recommend recipients or draft content where approved. Notification owns delivery after approved requests. AI must not bypass notification preferences, approval, redaction, tenant scope, suppression, or source-module rules.

### External Providers vs Notification

External providers deliver messages. Notification stores provider references and delivery history.

External providers are not the source of truth for CIXCI notification history. Provider credentials, provider setup, and external integration governance remain placeholders.

## Payload Boundary

Notifications should use minimal necessary data. Dynamic fields must be safe. Notification payloads must not become hidden data exports.

Sensitive customer, order, pricing, invoice, warranty, tenant, media, licensing, and commercial data must be governed by source-module policy, recipient scope, template rules, and redaction class.

## Boundary Risks

- Notification could become a hidden eligibility engine if it independently decides who should receive vendor/buyer/catalog growth notifications.
- Notification could leak sensitive data if templates allow unrestricted dynamic fields.
- Notification could become Logs & Audit if delivery history is treated as platform audit evidence.
- Notification could become Vendor Integration if webhook/external delivery starts owning provider setup, transforms, credentials, or schedules.
- Notification could create notification storms without duplicate suppression, digesting, retry budgets, and fanout controls.

## Open Questions

- Which notification eligibility decisions require explicit source-module references?
- Which events are required/system notifications versus preference-controlled notifications?
- Which channels expose too much provider-specific behavior for this module?
- Which customer-facing notifications are owned by CIXCI versus buyer systems?

## Scheduled System Admin Activity Summary Email Boundaries (Cross-Module PR)

This section declares the Notification Platform Service side of the cross-module boundary surface for the scheduled summary email hardening pass. Boundary partners (Analytics / Reporting, Logs & Audit File Tracking, Tenant Company, Integration Management, source modules) are not modified by this PR; their content remains owned by their respective modules. Each of the three target modules (Notification Platform Service, Analytics / Reporting, Logs & Audit File Tracking) carries a reciprocal boundary section.

### Notification Platform Service owns (PR-C additions)

- Activity Summary Configuration entity, lifecycle, scheduling fields, and the canonical `last_successful_summary_cursor_reference`.
- Activity Summary Delivery Attempt entity, lifecycle (`pending`, `dispatched`, `acknowledged`, `failed`), transport reference, acknowledgement reference, failure reference.
- Recipient Scope contract rule: hybrid role-derived (Tenant Company `check_access`-resolved) plus explicit recipient list; effective recipients = deduplicated union; resolution at delivery time.
- No-empty-email suppression from the delivery side (no delivery attempt is created when Analytics signals suppressed-no-activity).
- Summary retry rule from the delivery side: retry produces a new Activity Summary Delivery Attempt; prior attempts remain in their terminal state.
- Cursor advancement on `acknowledged` terminal state of a delivery attempt (NPS Workflow 9).
- Six PR-C workflows (Configuration Lifecycle, Scheduled Window Evaluation Trigger, Recipient Scope Resolution, Summary Delivery Attempt, Delivery Failure / Carry-Forward, Delivery Success / Cursor Advancement).
- Five PR-C events: `notification.activity-summary-configuration.created`, `notification.activity-summary-configuration.updated`, `notification.activity-summary-delivery.attempted`, `notification.activity-summary-delivery.succeeded`, `notification.activity-summary-delivery.failed`.

### Notification Platform Service does not own (PR-C reaffirmations)

- Activity Summary Reporting Window entity, Activity Summary Aggregation Record entity, source-fact aggregation, section / metric content production, carry-forward aggregation logic, summary dashboard reference. Analytics / Reporting owns these.
- Source-module event consumption for aggregation; Analytics / Reporting reads source events and produces the aggregation record. Notification Platform Service reads the aggregation record by reference and dispatches.
- Activity Summary Generated Evidence entity, No-Activity Summary Suppression Evidence entity, missed-window carry-forward evidence retention. Logs & Audit File Tracking owns these.
- Email transport mechanics, retry curves, dead-letter handling, provider-layer infrastructure. Integration Management or the provider layer owns these.
- CIXCI System Admin role definition, `check_access` resolution, recipient-eligibility authority. Tenant Company owns these.
- Source-module records: Order Routing entities (PR #91), Fulfillment / Returns entities (PR #92, PR #94), Cross-Module Handoff Records (PR #93). All consumed by reference via Analytics / Reporting; never modified.
- Dashboard implementation, dashboard URL generation, dashboard read model. Future Analytics PR owns these.

### Cross-module dependency on Analytics / Reporting

- Notification Platform Service initiates the cycle via NPS Workflow 2 (Scheduled Window Evaluation Trigger), which signals Analytics Workflow 4 (Reporting Window Evaluation).
- Notification Platform Service does not create the Activity Summary Reporting Window directly. Analytics / Reporting creates the window in response to the trigger.
- Notification Platform Service reads the Activity Summary Aggregation Record by reference once Analytics signals NPS Workflow 7. Notification Platform Service does not modify the aggregation record content.
- Notification Platform Service does not perform source-fact aggregation. Aggregation is exclusively Analytics / Reporting territory.

### Cross-module dependency on Logs & Audit File Tracking

- Notification Platform Service triggers Logs & Audit Workflow 10 on delivery-side events (NPS Workflows 1, 7, 8, 9).
- Logs & Audit File Tracking does not duplicate the Activity Summary Delivery Attempt lifecycle entity. It retains the delivery attempt by reference via the existing Audit Record entity pattern. The Activity Summary Delivery Attempt remains canonical at Notification Platform Service.
- Logs & Audit File Tracking creates the Activity Summary Generated Evidence and No-Activity Summary Suppression Evidence records on Analytics-triggered events (Workflows 5 and 6); these are Logs & Audit-owned distinct entities, not Notification-Platform-owned.

### Tenant Company boundary

- Tenant Company owns CIXCI System Admin role definition. Notification Platform Service does not define roles.
- Tenant Company `check_access` resolves the role-derived recipient component at delivery time per NPS Workflow 3. Resolution is at delivery time, not configuration time; role changes propagate to delivery without requiring configuration edits.
- Tenant Company also resolves authority for Activity Summary Configuration create / update / pause / retire actions per NPS Workflow 1. Only CIXCI System Admin actors are permitted; vendor users and buyer users are excluded.
- Notification Platform Service does not modify any Tenant Company file.

### Integration Management boundary

- Integration Management owns the transport-layer record for summary email delivery where applicable. Notification Platform Service captures `transport_reference`, `delivery_acknowledgement_reference`, and `delivery_failure_reference` on Activity Summary Delivery Attempt; these reference Integration Management transport records.
- If no Integration Management transport hook exists at PR-C application time, Notification Platform Service uses placeholder reference language; the reference field on Activity Summary Delivery Attempt may be null in Phase 1. The hook is deferred to future Integration Management hardening.
- Notification Platform Service does not modify any Integration Management file.
- "Acknowledged" indicates transport-level acknowledgement, not end-recipient read receipt. PR-C has no read-receipt semantics.

### Source-module boundary (Order Routing, Fulfillment / Returns)

- Source-module records, events, and contracts are not modified by this PR.
- Order Routing entities (PR #91), Fulfillment / Returns entities (PR #92, PR #94), Cross-Module Handoff Records (PR #93) are read-only inputs to Analytics / Reporting; Notification Platform Service reads only the produced Aggregation Record by reference.
- Notification Platform Service does not modify PR #91, PR #92, PR #93, or PR #94 events or contracts.
- **PR #92 SLA-semantics preservation invariant** continues to hold: PR-C does not alter PR #92's SLA Evaluation Record outcomes.
- **PR #94 delivery-date and buyer-update semantics preservation invariant** continues to hold: PR-C does not alter PR #94's Delivery Date Evidence outcomes, Buyer Update-Ready Signal lifecycle states, or Delivery Date Correction Evidence semantics.

### Notification Platform Service deferrals (Phase 1)

PR-C does not introduce:

- Per-event notification of scheduled summary events (this PR is scheduled-summary-only).
- Buyer-facing or vendor-facing summary delivery (CIXCI System Admin only).
- Per-tenant summary configuration (per-tenant summaries are future phase).
- Configurable email templates (Phase 1 template is hardcoded).
- Detailed source rows in email body (totals only).
- Read-receipt or end-recipient confirmation semantics.
- Cursor reset on configuration unpause (long-pause-large-window is accepted Phase 1 behavior).
- Multi-language email body, per-recipient personalization, alert escalation for repeated delivery failures (future PRs).

### Files this PR does NOT touch (Notification Platform Service side)

- `modules/notification-platform-service/openapi-contracts.md` (forbidden in PR-C).
- Any file under `modules/order-routing/`.
- Any file under `modules/fulfillment-returns/`.
- Any file under `modules/tenant-company-model/`.
- Any file under `modules/integration-management/`.
- Any file under Invoice Management, Pricing, Product Catalog, Device Catalog, Media / Image Asset Management, AI Agent Services modules.
- `modules/README.md`.
- Any ADR or platform standard.
- Any code, schema, migration, build, or lockfile.

### Phase 1 conservative defaults summary

- Recipients: CIXCI System Admin only; hybrid role-derived + explicit; deduplicated.
- Resolution timing: at delivery time, not configuration time.
- Cursor advancement: only on `acknowledged` terminal state of a delivery attempt OR on no-activity suppression.
- Failed delivery: cursor does NOT advance; window enters `delivery_failed` state; carry-forward applies at next evaluation.
- Empty window: no email; cursor advances; suppression evidence recorded.
- Template: hardcoded Phase 1.
- Email body: totals only with optional dashboard link.
- Transport: Integration Management or provider layer owns; Notification Platform Service captures references.
- Configuration scope: CIXCI-internal-only; not per-tenant.
- Source module modification: none.
