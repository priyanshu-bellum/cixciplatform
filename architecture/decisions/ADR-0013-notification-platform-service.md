# ADR-0013: Notification Platform Service

## Status

Proposed

## Context

CIXCI modules emit many business and operational events that may require notifications to users, companies, vendors, buyers, system admins, customers, and future external integrations.

Notification delivery must be centralized so each module does not build its own email, SMS, in-app, webhook, or future notification logic. Without a shared platform service, notification behavior could become inconsistent across modules, duplicate retry and preference logic, expose sensitive payloads, or accidentally allow delivery workflows to decide business state.

Notification Platform Service should support delivery, preferences, templates, recipient resolution, retry handling, and delivery tracking without owning the business event or source-of-truth state that triggered the notification.

This ADR is proposal-level. It does not finalize implementation design, provider selection, supported launch channels, template approval workflow, preference hierarchy, notification eligibility rules, retention periods, or delivery behavior.

## Decision

Introduce Notification Platform Service as a cross-cutting platform service.

Notification Platform Service consumes eligible notification-triggering events and source-module signals, resolves authorized recipients, applies preferences and suppression rules, selects delivery channels, orchestrates delivery attempts, tracks delivery status, and preserves notification history.

Notification Platform Service must not become the source of truth for the business events it observes. Source modules remain the authority for event meaning, business state, eligibility, permissions, audit evidence, and domain-specific decisions.

### Notification Platform Service Owns

- Notification templates.
- Notification delivery orchestration.
- Recipient resolution.
- Notification preferences.
- Channel selection.
- Email / SMS / in-app / future channel placeholders.
- Delivery status tracking.
- Retry/failure handling.
- Suppression rules.
- Unsubscribe/preference handling where applicable.
- Notification history.
- Notification events.
- Delivery audit references.
- Notification request records.
- Delivery attempt records.
- Provider response references.
- Duplicate suppression and idempotency keys.

### Notification Platform Service Does Not Own

- Product Catalog business state.
- Device Catalog business state.
- Pricing decisions.
- Order Routing decisions.
- Fulfillment/Returns state.
- Invoice Management state.
- Warranty claim lifecycle.
- Logs & Audit evidence records.
- Tenant Company eligibility or user permissions.
- AI Agent recommendations or action outcomes.
- Analytics reporting definitions.
- Buyer/vendor relationship eligibility.
- Product visibility, product compatibility, or product activation state.
- External provider systems of record.

## Relationship Boundaries

### Tenant Company

Tenant Company remains the authority for users, roles, company/entity scope, permissions, activation state, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, and notification eligibility inputs.

Notification Platform Service may consume Tenant Company recipient, role, company, entity, activation, eligibility, preference, and scope signals to resolve recipients and apply notification rules.

Notification Platform Service must not independently grant user access, assign roles, infer tenant eligibility, approve buyer/vendor relationships, decide product-type eligibility, or override Tenant Company scope.

### Product Catalog

Product Catalog owns product records, accessory additions, product activation/download state, product visibility records, compatibility assertions, catalog validation outcomes, catalog exports/downloads, and product-level events.

Notification Platform Service may deliver notifications based on Product Catalog events such as import failure, product activation change, catalog validation errors, accessory catalog updates, or product export completion.

Notification Platform Service must not decide product visibility, product compatibility, product activation, catalog validation, or product source-of-truth state.

### Device Catalog

Device Catalog owns canonical Device References, device master records, buyer device portfolio references, device visibility status, device import outcomes, device identity conflict signals, and launch-readiness signals.

Notification Platform Service may deliver notifications based on Device Catalog events such as device import failure, launch-ready device publication, device visibility change, identity conflict review, or buyer device portfolio change.

Notification Platform Service must not resolve canonical device identity, decide Device Reference behavior, approve device visibility, or mutate device lifecycle state.

### Pricing

Pricing owns pricing interpretation, price calculation, pricing profiles, pricing exceptions, effective price snapshots, pricing audit, and pricing events.

Notification Platform Service may deliver notifications for pricing exception review, missing or blocked pricing snapshots, pricing rule changes, or buyer pricing mode exception review.

Notification Platform Service must not calculate prices, approve pricing exceptions, decide price snapshot bindability, define pricing precedence, or expose pricing-sensitive values unless allowed by source-module policy and redaction rules.

### Order Routing

Order Routing owns routing decisions, order decomposition, vendor/manufacturer suborders, routing snapshots, routing exceptions, routing retry/review workflows, and routing events.

Notification Platform Service may deliver notifications for routing failures, manual routing review, vendor suborder creation, or routing exceptions.

Notification Platform Service must not choose routes, reroute orders, create suborders, resolve routing exceptions, or decide vendor/manufacturer targets.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment handoff tracking, shipment status, tracking information, delivery status, fulfillment exceptions, return operational handling, return receipt, replacement shipment execution, and fulfillment/return events.

Notification Platform Service may deliver notifications for shipment creation, missing tracking, shipment delay, delivery, return request receipt, return exception, or replacement shipment creation.

Notification Platform Service must not mark shipments delivered, create shipments, execute returns, approve replacements, decide return state, or own refund/payment behavior.

### Invoice Management

Invoice Management owns invoice generation, invoice records, invoice reports, buyer/vendor invoice views, invoice status lifecycle, invoice export records, invoice history, and reconciliation placeholders.

Notification Platform Service may deliver notifications for invoice generation, invoice export creation, reconciliation mismatch detection, or invoice finalization review.

Notification Platform Service must not generate invoices, finalize invoices, alter invoice records, resolve reconciliation decisions, process payments, or own accounting outcomes.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Notification Platform Service may deliver notifications for warranty registration failure, warranty registration confirmation, warranty claim initiation, or warranty claim review.

Notification Platform Service must not decide warranty eligibility, approve warranty claims, own warranty fulfillment, or become vendor warranty system state.

### Logs & Audit File Tracking

Logs & Audit File Tracking owns platform audit evidence, file tracking, API transmission logs, processing results, validation outcomes, retry/failure history, retention placeholders, and audit search/filtering.

Notification Platform Service may send delivery audit references to Logs & Audit and may consume Logs & Audit signals for repeated file processing failures, retry exhaustion, audit retention review, or vendor file quality issues.

Notification Platform Service owns notification delivery history. Logs & Audit owns platform audit evidence. Notification Platform Service must not replace Logs & Audit.

### AI Agent Services

AI Agent Services owns recommendations, insights, suggested actions, drafts, confidence scores, feedback signals, recommendation records, and action outcome records.

AI agents may recommend who should be notified or draft notification content where approved. Notification Platform Service owns delivery orchestration after approved notification requests or eligible triggering events are available.

AI Agent Services must not bypass notification preferences, approval, redaction, tenant scope, suppression rules, or source-module policy.

### Analytics

Analytics owns reporting models, rollups, metrics, dashboards, analytical read models, and reporting definitions.

Notification Platform Service may emit notification delivery events and delivery outcome signals for Analytics consumption.

Notification Platform Service must not define Analytics reporting models or use notification delivery history as a substitute for source-module reporting data.

### Future External Communication Providers

External email, SMS, push, webhook, or future communication providers may deliver messages on behalf of CIXCI.

Notification Platform Service may store provider delivery IDs, status references, failure reasons, response references, and retry history.

External providers are not the source of truth for CIXCI notification history. Provider selection, channel support, transport configuration, and provider failover remain placeholders.

## Notification Trigger Model

- Source modules emit business events and operational events.
- Notification Platform Service consumes eligible notification-triggering events.
- Source modules remain the authority for event meaning.
- Notification Platform Service must not decide the business state that caused the event.
- Notification Platform Service may store notification delivery history but must not replace module audit history.
- Notification Platform Service must not independently decide buyer/vendor eligibility, product visibility, product compatibility, routing state, fulfillment state, invoice state, warranty state, or AI recommendation state.
- Notification eligibility may require combined source signals from multiple modules, but those signals must be produced by the owning modules.
- Notification requests should carry source module, source event, source record references, tenant scope, redaction class, recipient intent, and idempotency key.

## Recipient Resolution

Proposal-level recipient concepts include:

- User recipient.
- Role-based recipient.
- Company recipient.
- Parent company recipient.
- Child entity recipient.
- Vendor recipient.
- Buyer recipient.
- System admin recipient.
- Customer recipient placeholder where appropriate.
- External recipient placeholder.

Tenant Company remains the authority for users, roles, company/entity scope, permissions, activation state, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, and notification eligibility inputs.

Recipient resolution should use the minimum necessary recipient scope. Cross-tenant recipient resolution should be denied by default unless explicitly supported by approved platform operations.

Customer recipients are placeholders. Buyer-facing customer notifications may be handled by buyer systems rather than CIXCI, and that boundary remains unresolved.

## Notification Preferences

Proposal-level preference concepts include:

- User-level preferences.
- Company-level preferences.
- Child-entity preferences.
- Event-type preferences.
- Channel preferences.
- Immediate notification preference.
- Digest notification preference.
- Quiet hours placeholder.
- Required/system notification override placeholder.
- Unsubscribe/suppression placeholder.
- Role-based notification eligibility placeholder.

Preference hierarchy and conflict behavior remain unresolved. Future implementation should define whether buyer parent preferences, child entity preferences, user preferences, role requirements, system-required notifications, and legal unsubscribe rules can override each other.

System-required notifications may need to bypass optional user preferences, but this must be explicitly defined by policy and source-module requirements.

## Template Model

Proposal-level template concepts include:

- Template id.
- Template type.
- Event type.
- Channel.
- Locale/language placeholder.
- Tenant/company scope placeholder.
- Dynamic fields.
- Redaction rules.
- Template version.
- Approval status.
- Effective dates.
- Required dynamic field list.
- Source-module policy reference.
- Preview/test status placeholder.

Templates must use safe dynamic fields and must not expose sensitive customer, order, pricing, invoice, warranty, tenant, media, licensing, or commercial data unless allowed by recipient scope, redaction rules, and source-module policy.

Template approval workflow remains proposal-level. Critical buyer/vendor/customer-facing templates may require approval before use.

## Channel Model

Proposal-level notification channels include:

- Email.
- In-app.
- SMS placeholder.
- Webhook/external notification placeholder.
- Future push notification placeholder.

Channel selection should consider recipient preferences, company/entity preferences, event type, urgency, system-required status, delivery constraints, redaction rules, and future provider availability.

Webhook/external notification support is a placeholder and should not become integration ownership without a future integration boundary decision.

## Notification-Triggering Examples By Module

These examples are proposal-level and do not finalize required launch notifications.

### Tenant Company

- User invitation.
- Onboarding approval needed.
- Account activated.
- Buyer activated.
- Vendor activated.
- Admin exception requires review.
- Buyer/vendor relationship eligibility changed.
- Product-type eligibility changed.
- Licensed-property relationship status changed.

### Product Catalog

- Accessory import failed.
- Product export completed.
- Product activation changed.
- Catalog validation errors require review.
- Vendor added new accessories.
- Accessory catalog update requires buyer review.

### Device Catalog

- Device import failed.
- Device visibility changed.
- Launch-ready device published.
- Device identity conflict requires review.
- Buyer device portfolio changed.

### Pricing

- Pricing exception requires approval.
- Pricing snapshot missing or blocked.
- Pricing rule changed.
- Buyer pricing mode exception requires review.

### Order Routing

- Routing failed.
- Manual routing review required.
- Vendor suborder created.
- Routing exception created.

### Fulfillment / Returns

- Shipment created.
- Tracking missing.
- Shipment delayed.
- Delivered.
- Return request received.
- Return exception created.
- Replacement shipment created.

### Invoice Management

- Invoice generated.
- Invoice export created.
- Reconciliation mismatch detected.
- Invoice finalization requires review.

### Warranty Registration / Claims

- Warranty registration failed.
- Warranty registration confirmed.
- Warranty claim initiated.
- Warranty claim requires review.

### Logs & Audit

- Repeated file processing failure.
- Retry exhausted.
- Audit retention review required.
- Vendor file quality issue.

### AI Agent Services

- Recommendation requires approval.
- Risk/control agent flagged issue.
- Agent conflict requires review.

## Vendor / Buyer Relationship And Catalog Growth Notifications

Notification Platform Service should support eligibility-based notifications when source modules provide sufficient eligibility signals.

Proposal-level examples:

- When a new vendor is added and approved, and that vendor has accessories compatible with devices a buyer is selling or supporting, eligible buyers may receive a notification that a new vendor has been added.
- When a new buyer is added and becomes active, eligible vendors may receive a notification that a new buyer has joined the platform.
- When a vendor adds new accessories to their catalog, eligible buyers may receive a notification that the vendor has added new accessories to their portfolio.

Eligibility for these notifications must be determined by source modules:

- Tenant Company owns buyer/vendor relationship eligibility, buyer activation, vendor activation, region scope, product-type eligibility, licensed-property scope, and readiness signals.
- Product Catalog owns product records, accessory additions, product activation/download state, product visibility records, and compatibility assertions.
- Device Catalog owns canonical Device References and buyer device portfolio references.
- Notification Platform Service only delivers the notification after eligible source events/signals are provided.
- Notification Platform Service must not independently decide buyer/vendor eligibility or product compatibility.

Future implementation should define whether these notifications are immediate, daily digest, weekly digest, or configurable by buyer/vendor preference.

## Delivery And Retry Model

Proposal-level delivery concepts include:

- Notification request.
- Delivery attempt.
- Delivery status.
- Retry policy placeholder.
- Failure reason.
- Provider response reference.
- Idempotency key.
- Duplicate suppression.
- Delivery timeout.
- Escalation placeholder.
- Channel selection result.
- Recipient resolution snapshot/reference.
- Template version reference.
- Redaction class.

Notification retries should be bounded and auditable. Duplicate suppression should prevent repeated notifications for the same source event and recipient where appropriate.

Delivery status tracking should distinguish requested, queued, sent, delivered where provider-supported, failed, suppressed, unsubscribed, expired, retried, and review-required states as proposal-level placeholders.

## Logs & Audit Relationship

Notification Platform Service may send delivery audit references to Logs & Audit.

Logs & Audit owns platform audit evidence, file tracking, API transmission logs, processing evidence, retention placeholders, and audit search/filtering.

Notification Platform Service owns notification delivery history, notification requests, delivery attempts, template references, recipient resolution references, provider response references, suppression outcomes, and delivery status.

Notification Platform Service must not replace Logs & Audit. Sensitive notification delivery records should respect Logs & Audit redaction and retention guidance.

## Payload And Privacy Guardrails

Notifications should use minimal necessary data.

Sensitive data must use redaction rules. Customer, order, pricing, invoice, warranty, tenant, media, licensing, and commercial data must not be exposed unless allowed by template, recipient scope, and source-module policy.

Templates must define safe dynamic fields. Notification payloads must not become hidden data exports. Notification history should store delivery evidence, not unrestricted business payloads.

Notification payloads should prefer source record references, safe summaries, redacted values, and approved template fields over full source payloads.

Cross-tenant notification payload leakage is a critical risk. Recipient scope, tenant scope, source module policy, and redaction class should be evaluated before delivery.

## AI Agent Services Boundaries

AI agents may recommend who should be notified or draft notification content where approved.

Notification Platform Service owns delivery. AI Agent Services owns recommendations, drafts, confidence scores, recommendation records, and action outcome records. Source modules own business events and source-of-truth state.

AI must not bypass notification preferences, approval, redaction, tenant scope, suppression, source-module rules, or system-required notification policy.

AI-generated notification drafts should be traceable to source records and should identify confidence score, prompt/policy version where applicable, human approver where required, and final sent template/version if delivered.

Risk/control agent flags may trigger review notifications, but risk/control agents do not own notification delivery or source-module business state.

## External Provider Boundary

External email, SMS, push, webhook, or future providers may deliver messages.

External providers are not the source of truth for CIXCI notification history. Provider delivery IDs may be stored as references. Provider failure handling should be tracked.

Provider selection remains placeholder. Notification Platform Service should avoid embedding provider-specific behavior directly into source modules.

External provider payloads must comply with source-module redaction policy, recipient scope, template rules, and retention expectations.

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

## Impacts

Future Notification module drafting should define:

- Notification request model.
- Delivery attempt model.
- Template model.
- Preference model.
- Recipient resolution model.
- Channel model.
- Suppression and unsubscribe model.
- Delivery status lifecycle.
- Retry and failure handling.
- Delivery audit references.
- Privacy and redaction behavior.
- Source-module notification trigger contracts.

Future source modules should emit eligible notification-triggering events without embedding delivery logic. Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Tenant Company, Logs & Audit, AI Agent Services, and future Warranty, Analytics, and integration modules should retain their source-of-truth responsibilities.

## Consequences

- Notification delivery becomes centralized instead of duplicated across modules.
- Source modules keep ownership of business events and source-of-truth state.
- Recipient resolution, preferences, templates, delivery attempts, retries, suppression, provider responses, and delivery history can be handled consistently.
- Notification payloads require strict redaction and recipient-scope controls to avoid becoming hidden data exports.
- Future Notification module work should happen after this bounded platform-service boundary is accepted.
