# Notification Platform Service Permissions

This document is proposal-level architecture. It defines initial permission concepts without finalizing roles, access implementation, approval workflows, or launch behavior.

## Permission Principles

- Tenant Company remains authority for users, roles, company/entity scope, permissions, activation state, buyer/vendor relationship eligibility, and notification eligibility inputs.
- Notification Platform Service may enforce access to notification templates, preferences, history, delivery attempts, and provider response references.
- Access to notification history should be scoped by tenant, company, entity, recipient role, source module, redaction class, and internal role.
- Sensitive notification history access should be auditable.

## Proposal-Level Roles

- System Admin.
- Notification Platform Admin placeholder.
- Source Module Service Identity.
- Tenant Company Admin.
- Buyer Admin.
- Vendor Admin.
- Internal Support / Operations placeholder.
- Template Reviewer / Approver placeholder.
- Read-Only Auditor placeholder.

Role names are placeholders and should align with Tenant Company role boundaries before implementation.

## Permission Concepts

### Template Permissions

- Create notification template.
- Create template version.
- Preview template.
- Approve template placeholder.
- Retire template placeholder.
- View template history.

### Preference Permissions

- View own preferences.
- Update own preferences.
- View company preferences.
- Update company preferences.
- View child-entity preferences.
- Update child-entity preferences.
- Manage unsubscribe/suppression placeholder.
- Manage required/system override placeholder.

### Delivery Permissions

- Create notification request as source module.
- View notification request status.
- View delivery attempts.
- Retry delivery where allowed.
- Suppress delivery where allowed.
- View provider response reference where allowed.
- View delivery audit reference.

### History Permissions

- Search notification history.
- View own notification history.
- View company/entity notification history.
- View sensitive delivery history.
- Export notification history placeholder.

## Access Guardrails

- Cross-tenant notification history access is denied by default.
- Buyer/vendor projections must be scoped.
- Global search is limited to approved internal roles.
- Provider response references may be masked by default.
- Customer recipient data requires additional privacy and ownership decisions.
- Pricing-sensitive, invoice-sensitive, warranty-sensitive, tenant-sensitive, media/licensing-sensitive, and commercial data require redaction and access controls.

## Source Module Service Identity

Source modules may need service identities to create notification requests. Service identity should be scoped by source module, event type, tenant scope, and source-module policy.

Notification Platform Service must not allow a source module to create notifications that bypass recipient scope, template policy, redaction, suppression, or preference rules.

## Approval Notes

Approval may be required for:

- Buyer/vendor/customer-facing templates.
- Required/system notification override behavior.
- Sensitive dynamic fields.
- AI-drafted notification content.
- Retry/escalation behavior for high-risk notifications.
- Full provider response visibility.

## Open Questions

- Which roles can manage templates?
- Which preferences are user-managed versus company-admin-managed?
- Which notification history can buyers or vendors see?
- Which notification events are internal-only?
- Which source modules can request customer-facing notifications?
- Which notification history access should be sent to Logs & Audit?

## Scheduled System Admin Activity Summary Email Permissions (Cross-Module PR)

This section adds proposal-level permission concepts for the Notification Platform Service side of the scheduled summary email cross-module hardening pass. The two boundary partners (Analytics / Reporting, Logs & Audit File Tracking) carry reciprocal permission sections. Tenant Company remains the authority for role definitions and `check_access` resolution.

### Phase 1 actor inventory

PR-C operates with a small, conservative actor inventory:

- **CIXCI System Admin** - the only Phase 1 actor authorized to create, update, pause, or retire an Activity Summary Configuration. Vendor users and buyer users are explicitly excluded.
- **System service identity for scheduled aggregation** - the implementation-layer identity that NPS Workflow 2 (Scheduled Window Evaluation Trigger) operates under. Authority resolution at the implementation layer; PR-C captures the conceptual boundary.
- **System service identity for transport handoff** - the implementation-layer identity that NPS Workflow 7 (Summary Delivery Attempt) uses to interact with Integration Management or the provider layer. Implementation detail; PR-C captures the conceptual boundary.

Role names are placeholders and should align with Tenant Company role boundaries before implementation.

### Activity Summary Configuration Authority class

The Activity Summary Configuration Authority class captures the permission concept for create, update, pause, retire, and activate actions on an Activity Summary Configuration. PR-C does not finalize the implementation role or permission identifier; the authority class is the architectural surface.

Proposal-level permission concepts:

- `activity_summary_configuration.create` - permission to create an Activity Summary Configuration. CIXCI System Admin only.
- `activity_summary_configuration.update` - permission to update scheduling fields, recipient scope, business calendar reference, weekend / holiday behavior, or other non-cursor fields. CIXCI System Admin only.
- `activity_summary_configuration.pause` - permission to transition `active -> paused`. CIXCI System Admin only.
- `activity_summary_configuration.activate` - permission to transition `draft -> active` or `paused -> active`. CIXCI System Admin only.
- `activity_summary_configuration.retire` - permission to transition any state `-> retired`. CIXCI System Admin only. Retirement is non-destructive (prior windows, aggregations, attempts, and evidence records remain).
- `activity_summary_configuration.read` - permission to view an Activity Summary Configuration. CIXCI System Admin only in Phase 1.

The `last_successful_summary_cursor_reference` field is not editable via any of the above permissions. The cursor is advanced exclusively by NPS Workflow 9 (Delivery Success / Cursor Advancement), which serves two trigger paths: Trigger A (delivery acknowledged) and Trigger B (consumed no-activity-suppression-outcome from Analytics Workflow 6). Manual cursor reset is not a Phase 1 operation; future operator-surface PR may introduce it. Analytics / Reporting and Logs & Audit File Tracking are never granted cursor-mutation authority.

### Activity Summary Delivery Attempt permissions

- `activity_summary_delivery_attempt.read` - permission to view a delivery attempt and its current state. CIXCI System Admin only in Phase 1.
- `activity_summary_delivery_attempt.search` - permission to search across delivery attempts (for example, all failed attempts in the past week). CIXCI System Admin only in Phase 1.

PR-C does not introduce permissions to manually create, mutate, or delete Activity Summary Delivery Attempt records. Records are created by NPS Workflow 7 and transitioned to terminal state by NPS Workflows 8 or 9. Manual retry is not a Phase 1 operator action; the implementation layer may produce retry attempts automatically.

### Recipient Scope authority

The Recipient Scope contract rule (hybrid role-derived + explicit; deduplicated union resolved at delivery time) creates the following authority boundaries:

- **Role-derived component authority:** Tenant Company owns CIXCI System Admin role definition and `check_access` enumeration. Notification Platform Service does not grant or revoke roles; it queries Tenant Company at delivery time.
- **Explicit list authority:** the `explicit_recipient_list` field on Activity Summary Configuration is edited via `activity_summary_configuration.update`. CIXCI System Admin only.
- **Effective recipients are computed at delivery time** as the deduplicated union, with vendor and buyer users filtered out via Tenant Company `check_access`. The filtering is enforced even if a vendor or buyer email address is present in the explicit list; the exclusion is audited.

### Vendor / buyer exclusion guardrail

PR-C strictly excludes vendor users and buyer users from:

- Activity Summary Configuration authority (create, update, pause, retire, activate, read).
- Activity Summary Delivery Attempt visibility.
- The role-derived recipient component.
- The explicit recipient list (effective recipients only; if an address resolves to a vendor or buyer user via Tenant Company, it is filtered at delivery time).

The exclusion is at the permissions layer (configuration authority) AND at the delivery layer (recipient resolution filter). Both layers enforce the rule; neither alone is sufficient.

### Permission concepts NOT introduced

- Per-tenant configuration authority. Phase 1 is CIXCI-internal-only; per-tenant summary configurations are future phase.
- Buyer or vendor visibility into Activity Summary Configurations, Reporting Windows, Aggregation Records, Delivery Attempts, or evidence records.
- Manual cursor reset, manual delivery retry trigger, manual aggregation re-trigger. Future operator-surface PRs may introduce them.
- Template edit authority. Phase 1 template is hardcoded.
- Dashboard authority. Dashboard implementation is deferred.
- Read-receipt permissions. No read-receipt semantics in Phase 1.

### Audit requirements

The following PR-C operations are auditable via existing Notification Platform Service patterns (and via Logs & Audit Workflow 10 evidence retention):

- All Activity Summary Configuration lifecycle transitions.
- All Activity Summary Delivery Attempt lifecycle transitions.
- All recipient scope resolutions at delivery time (including vendor / buyer exclusion events).
- All cursor advancement events (NPS Workflow 9 Trigger A path on delivery acknowledgement; NPS Workflow 9 Trigger B path on consumed no-activity-suppression-outcome). The trigger source is captured in the audit trail.
- All carry-forward subsumption events (NPS Workflow 9 transitioning prior `delivery_failed` windows to `superseded`).

### Boundary restrictions (PR-C reaffirmations)

The Notification Platform Service PR-C permissions must not grant:

- Analytics / Reporting aggregation record mutation authority. Aggregation records are immutable; mutation is forbidden.
- Activity Summary Reporting Window state mutation authority outside of NPS Workflow 7/8/9 effects on the `delivered`, `delivery_failed`, `superseded` transitions. Manual Reporting Window state mutation is not a Phase 1 operator action.
- Logs & Audit File Tracking evidence record mutation authority. Evidence records are immutable; amendments use existing Logs & Audit workflows.
- Source-module record mutation authority (PR #91, PR #92, PR #93, PR #94 entities all read-only via Analytics aggregation).
- Tenant Company role mutation authority. Tenant Company is the role authority.
- Integration Management transport configuration authority.
