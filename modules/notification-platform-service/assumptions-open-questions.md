# Notification Platform Service Assumptions And Open Questions

This document is proposal-level architecture. It captures assumptions and unresolved decisions for the Notification Platform Service module.

## Assumptions

- ADR-0013 is the canonical bounded-context guidance for Notification Platform Service.
- Notification Platform Service is a cross-cutting platform service, not a source-module business owner.
- Source modules own business events, source state, and event meaning.
- Tenant Company owns users, roles, permissions, company/entity scope, activation, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, readiness signals, and notification eligibility inputs.
- Logs & Audit owns platform audit evidence; Notification owns notification delivery history.
- AI Agent Services may recommend recipients or draft content only within approval, redaction, tenant-scope, preference, and source-module rules.
- External providers deliver messages but are not the source of truth for CIXCI notification history.
- Customer recipient support is unresolved and may belong partly to buyer-owned customer-facing systems.
- Eligibility-based notifications require source-owned eligibility evidence from the owning modules.
- Preference evaluation should produce a deterministic outcome rather than relying on ad hoc preference checks.

## Scale Assumptions

Proposal-level placeholders:

- Notifications per source event: unresolved.
- Recipients per notification request: unresolved; should be bounded by max recipients per request and fanout caps.
- Delivery attempts per notification: bounded by retry policy placeholder.
- Daily notification volume by tenant: unresolved; should be partitioned by tenant, channel, provider, and event class.
- Provider throughput by channel: unresolved; provider rate-limit handling and backpressure are required placeholders.
- Digest volume and frequency: unresolved; digest job and digest batch records are required placeholders.
- Notification history retention volume: unresolved; retention classes, pagination, archive placeholders, and tenant partitioning are required placeholders.
- Template count by event/channel/locale: unresolved; template versioning impact must be tracked.
- Preference records per user/company/entity: unresolved.
- Role-based recipient expansion volume: unresolved; role expansion snapshots and stale role handling are required placeholders.
- Buyer/vendor recipient fanout: unresolved; fanout batch records and duplicate recipient collapse are required placeholders.
- Customer-facing notification volume: unresolved placeholder and may depend on buyer-system ownership decisions.
- Maximum acceptable request intake latency: unresolved.
- Maximum acceptable delivery latency by channel: unresolved.

## Scalability Controls

Proposal-level controls before implementation:

- High-volume catalog notifications should support digesting, throttling, or review-required routing.
- Buyer/vendor recipient fanout should use fanout batch records, fanout caps, queue partitioning, and duplicate recipient collapse.
- Role-based expansion should use role expansion snapshots, stale role handling, inactive user exclusion, inactive entity exclusion, and max recipients per request.
- Customer-facing notification volume remains a placeholder and should not be enabled without ownership, consent, suppression, provider throughput, and retention decisions.
- Provider throughput limits should be represented through provider rate-limit records, retry budgets, backpressure, and provider partitioning.
- Queue partitioning should consider tenant, channel, provider, source module, event type, required/system status, and digest/immediate delivery mode.
- Delivery history retention should support pagination, retention classes, redaction classes, archive placeholders, and tenant isolation.
- Template versioning impact should be tracked on notification requests and delivery attempts so historical messages can be reconstructed.
- Result pagination is required for notification history, delivery attempts, digest jobs, fanout batches, template history, and recipient expansion previews.
- Notification storm prevention should prevent source event bursts, retry loops, catalog update floods, and provider outage retries from overwhelming recipients or providers.

## Open Questions

- Which channels are supported at launch?
- Which notifications are required versus optional?
- Which notification preferences can users/company admins control?
- Which notifications are internal-only versus buyer/vendor/customer-facing?
- Which customer-facing notifications are handled by buyer systems versus CIXCI?
- What retention period applies to notification history?
- What data can be included in notification payloads?
- How are notification templates approved?
- What retry limits and escalation paths are required?
- Which events should be synchronous versus asynchronous notification triggers?
- Should buyers receive new vendor notifications only when compatible accessories match their My Devices / supported device portfolio?
- Should vendors receive new buyer notifications only when the buyer is eligible by region, product type, licensed-property scope, or vendor-buyer relationship rules?
- Should new accessory notifications be immediate, daily digest, weekly digest, or configurable by buyer preference?
- Should notification preferences be configurable by buyer parent, child entity, user role, or all three?
- Should system-required notifications override user preferences?
- How should notification eligibility be tested when multiple modules provide signals?
- What notification preference hierarchy applies when user, company, child entity, role, and system-required settings conflict?
- What delivery statuses are required for each channel?
- Which provider response payloads may be stored, masked, or discarded?
- What audit records are required for notification delivery, suppression, and recipient resolution?

## Boundary Questions

- Which source modules may request notifications directly?
- Which source modules require delivery status feedback?
- When should Notification re-check eligibility immediately before delivery?
- Should Notification cancel queued delivery if source state is superseded?
- Which webhook/external notification behaviors require a future Integration Management or Vendor Integration context?
- Which customer-facing notifications are CIXCI-owned versus buyer-owned?
- Which source modules must provide eligibility evidence for catalog growth notifications?
- Which eligibility evidence expires before delivery versus remains valid through digest generation?

## Privacy Questions

- Which redaction classes apply to customer, order, pricing, invoice, warranty, tenant, media, licensing, and commercial data?
- Which dynamic fields require source-module approval?
- Which notification history fields may be visible to buyers, vendors, system admins, or external recipients?
- Should sensitive notification history access be sent to Logs & Audit?

## Next Decisions Needed

- Launch channel set.
- Preference precedence model.
- Template approval model.
- Required/system notification override model.
- Eligibility evidence contract model.
- Recipient expansion and fanout cap model.
- Digest job and batch model.
- Delivery status lifecycle by channel.
- Retry budget and escalation policy.
- Provider rate-limit and backpressure model.
- Notification history retention policy.
- Source-module notification trigger contracts.
- Privacy/redaction policy for dynamic fields and provider responses.

## Scheduled System Admin Activity Summary Email Assumptions and Open Questions (Cross-Module PR)

This section captures Notification Platform Service-side assumptions, open questions, and risks for the cross-module summary email hardening pass. The Analytics / Reporting and Logs & Audit File Tracking sides carry their own sections.

### Assumptions (confirmed in scoping)

- The PR is scheduled-summary-only; per-event notifications are explicitly out of scope.
- Recipients are CIXCI System Admin only in Phase 1; vendor users and buyer users are excluded.
- Recipient model is hybrid: role-derived (via Tenant Company `check_access`) plus explicit recipient list; effective recipients = deduplicated union; resolution at delivery time.
- Reporting window basis is cursor-based (`window_start = last_successful_summary_cursor`).
- Failed delivery does NOT advance the cursor; carry-forward applies at next window evaluation.
- No-activity suppression advances the cursor; no delivery attempt is created.
- Notification Platform Service owns Activity Summary Delivery Attempt; Integration Management owns transport-layer records by reference (placeholder if hook absent).
- Configuration scope is CIXCI-internal-only platform-wide; per-tenant configurations are future phase.
- Logs & Audit File Tracking is touched additively now (Generated Evidence, Suppression Evidence); full Logs & Audit hardening is a separate later area.
- Logs & Audit-side Delivery Attempt evidence is by reference, not duplicated as separate entity.
- Dashboard link is optional and reference-only.
- Email template is hardcoded Phase 1.
- Email body is totals-only.
- Held buyer updates are placed in `exceptions` section, not `shipping`.
- Buyer update failures aggregate to a single count in Phase 1; per-buyer or per-vendor breakouts are future operator-surface work.
- Return refunded count is deferred unless an existing Fulfillment / Returns-owned source exists.
- Total new orders metric is deferred if no source event exists for order intake.
- Source modules are strict no-touch.
- One PR; reaffirm if scope balloons during drafting (the bundle did NOT balloon; the 36-target-file scope held).
- Nine PR-C events total; minor naming alignment from scoping document to existing module convention applied (`notification.*`, `analytics.*`, `audit.*` instead of `notification-platform.*`, `analytics-reporting.*`, `logs-audit-file-tracking.*`).

### Open questions (numbered; identified during scoping)

- **PR-C OQ 1** - Reporting window basis (cursor-based confirmed). Status: resolved.
- **PR-C OQ 2** - Failed delivery roll-forward via carry-forward (confirmed). Status: resolved.
- **PR-C OQ 3** - No-activity suppression cursor advancement (confirmed: yes, advance). Status: resolved.
- **PR-C OQ 4** - Hybrid recipient model (confirmed). Status: resolved.
- **PR-C OQ 5** - Notification Platform owns Delivery Attempt; Integration Management owns transport by reference (confirmed). Status: resolved.
- **PR-C OQ 6** - CIXCI-internal-only configuration scope (confirmed). Status: resolved.
- **PR-C OQ 7** - Logs & Audit touched now additively (confirmed). Status: resolved.
- **PR-C OQ 8** - Return refunded count deferred unless source exists (confirmed). Status: resolved with deferral if source absent.
- **PR-C OQ 9** - Dashboard link optional (confirmed). Status: resolved.
- **PR-C OQ 10** - Held buyer updates in Exceptions section (confirmed). Status: resolved.
- **PR-C OQ 11** - Logs & Audit-side Delivery Attempt Evidence is reference, not separate entity (confirmed). Status: resolved.
- **PR-C OQ 12** - Strict no-touch on source modules (confirmed). Status: resolved.
- **PR-C OQ 13** - Touch permissions.md and api-contracts.md in Analytics / Logs & Audit if exist (confirmed: both have these files; touched). Status: resolved.
- **PR-C OQ 14** - One PR with reaffirmation if scope balloons. Status: held; bundle scope did not balloon.
- **PR-C OQ 15** - "Total new orders" source ambiguity. Status: applier identifies during application; if source event absent, defer the metric (architectural rule embedded in data-model.md).
- **PR-C OQ 16** - Hardcoded email template (confirmed). Status: resolved.
- **PR-C OQ 17** - Totals-only email body (confirmed). Status: resolved.
- **PR-C OQ 18** - Single aggregate count for buyer update failures (confirmed). Status: resolved.

### Lettered open questions (secondary)

- **PR-C OQ A** - Tenant Company `check_access` caching at delivery time. Status: implementation detail; deferred.
- **PR-C OQ B** - Multi-language email body support. Status: future phase.
- **PR-C OQ C** - Per-recipient personalization. Status: future phase.
- **PR-C OQ D** - Alert escalation for repeated delivery failures. Status: future operator-surface PR.
- **PR-C OQ E** - Vendor-side or buyer-side summary delivery. Status: future phase.
- **PR-C OQ F** - Late source fact arrival reconciliation policy implementation. Status: implementation deferred; architectural expectation documented in edge-cases.md.
- **PR-C OQ G** - Cursor reset on configuration unpause. Status: future PR.
- **PR-C OQ H** - Configuration time-of-day precision (minute vs. second). Status: implementation detail; deferred.

### Risks (Notification Platform Service side)

- **R1** - Three-way boundary contract coordination drift. Mitigation: bundle drafting cross-references; APPLY.md verifies all three boundary sections present.
- **R2** - Source event reference completeness; some Phase 1 metrics may be conditionally absent. Mitigation: explicit deferred-metric markers in data-model.md.
- **R3** - Integration Management transport hook absence at PR-C application time. Mitigation: placeholder reference language; transport-reference field may be null; future Integration Management hardening completes.
- **R4** - Cursor advancement bug. Mitigation: NPS Workflow 9 is the only success path; NPS Workflow 8 explicitly does not advance.
- **R5** - Concurrent delivery attempts and aggregation race. Mitigation: in-flight `dispatched` windows are not subsumed by Analytics Workflow 4.
- **R6** - Holiday/weekend calendar absence. Mitigation: defaults documented; calendar source itself is future PR.
- **R7-R8** - Carry-forward double-counting and out-of-order events. Mitigation: deduplication on source fact references; `occurredAt`-based window membership.
- **R9** - Multiple consecutive failures. Mitigation: Analytics Workflow 4 enumerates all prior `delivery_failed` windows.
- **R10** - Long-paused configuration produces large window. Mitigation: Phase 1 accepted behavior; documented.
- **R11** - No-activity suppression cursor advancement could be questioned. Mitigation: rationale documented at every relevant architectural surface.
- **R12** - `check_access` enumeration at delivery time may be expensive. Mitigation: Phase 1 accepts; future caching is OQ A.
- **R13** - Explicit recipient deletion does not retroactively affect prior deliveries. Mitigation: documented.
- **R14** - Role-derived recipient who departed. Mitigation: delivery-time resolution; not configuration-time.
- **R15** - "New orders" source ambiguity. Mitigation: OQ 15 disposition (defer metric).
- **R16** - "Refunded returns" source ambiguity. Mitigation: OQ 8 disposition (defer metric).
- **R17** - Vendors / Retailers involved cardinality. Mitigation: documented in data-model.md.
- **R18** - Dashboard reference null indefinitely. Mitigation: optional field; fallback documented.
- **R19** - Three-module scope (36 files). Mitigation: bundle did not balloon; APPLY.md three-way preflight verifies.
- **R20** - Baseline content unknown at scoping. Mitigation: baseline inspection completed during bundle drafting.
- **R21** - Dashboard implementation drift in future PR. Mitigation: forward-compat field.
- **R22** - Per-tenant summary expansion. Mitigation: Phase 1 entity design does not prevent.
- **R23** - Notification Platform Service evolution. Mitigation: PR-C is scheduled-summary-only; per-event behavior unchanged.
