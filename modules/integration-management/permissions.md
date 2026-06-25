# Integration Management / External System Connections Permissions

This document is proposal-level architecture. It defines initial permission concepts without finalizing roles, identity provider mechanics, approval workflows, or implementation behavior.

## Permission Principles

- Tenant Company remains authority for users, roles, company/entity scope, activation, and permission inputs.
- Integration Management consumes permission and scope signals; it does not grant global access independently.
- Raw secrets must never be exposed through permissions, logs, events, exports, notification payloads, or AI prompts.
- External actions require approved source-module action contracts and approval where applicable.
- Cross-tenant access is denied by default.

## Proposal-Level Roles

- System Admin.
- Integration Admin placeholder.
- Tenant/Company Admin placeholder.
- Vendor Integration Admin placeholder.
- Buyer Integration Admin placeholder.
- Device Manufacturer Integration Admin placeholder.
- Source Module Service Identity.
- Logs & Audit Service Identity.
- Notification Platform Service Identity.
- AI Agent Approved Action Identity placeholder.
- Read-only Support / Reviewer placeholder.

## Permission Concepts

- Create integration configuration.
- Update integration configuration.
- Enable integration.
- Disable integration.
- View integration status.
- Manage credential references.
- Request credential rotation.
- Revoke credential reference.
- View credential lifecycle metadata.
- Create/update external ID mappings.
- Resolve external ID conflicts.
- Configure outbound webhook placeholder.
- View webhook/API delivery status.
- Retry webhook/API delivery.
- Run health check.
- Run integration test/check.
- Request external action.
- Approve external action.
- View external action outcome.
- View integration audit references.
- Review integration failure.

## Credential Access Guardrails

- Credential references may be visible to authorized roles.
- Raw secret values should never be returned by Integration Management APIs.
- Credential rotation, expiration, revocation, and permission scope should be tracked.
- Logs & Audit may record credential lifecycle events without storing secret values.
- AI agents must not receive raw secret values in prompts or action payloads.

## External Action Approval

Proposal-level approval rules:

- External actions that can affect business workflows require source-module-approved action contracts.
- AI-initiated actions require approved action contracts and permission checks.
- External project/task updates may be allowed only as integration references and must not change CIXCI source-of-truth state.
- External actions should carry actor/service identity, approval reference where required, tenant/company/entity scope, and audit reference.

## Scope Rules

- Parent company integration permissions may differ from child entity integration permissions.
- Vendor integrations are scoped to the owning vendor unless explicitly configured otherwise.
- Buyer integrations are scoped to the owning buyer/entity unless explicitly configured otherwise.
- Device manufacturer integrations are scoped to the owning manufacturer unless explicitly configured otherwise.
- Environment scope should distinguish sandbox and production.
- Region scope may apply where external systems or tenant rules require it.

## Review-Required Actions

Actions that may require review:

- Enabling production integrations.
- Disabling critical integrations.
- Rotating or revoking credential references.
- Resolving external ID conflicts.
- Retrying high-risk external actions.
- Bypassing retry limits.
- Approving AI-initiated external actions.
- Correcting external mapping references.

## Out Of Scope

Integration Management does not own global authentication, credential storage implementation, MFA, SSO/SCIM provider mechanics, tenant role definitions, or source-module approval policies unless a future ADR assigns them.

## Open Questions

- Which roles can configure integrations at launch?
- Which integrations can tenant admins manage directly?
- Which external actions require two-person approval?
- Which roles can view provider response details?
- Which roles can view sensitive redacted payload references?
