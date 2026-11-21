# Decision index and memory decisions

Platform architecture decisions live in [architecture/decisions](../../architecture/decisions/)
under ADR-0002. This file indexes them and records this memory workflow. It does
not replace canonical ADRs or invent historical rationale.

## Existing architecture records

TASK-015 adds [ADR-0019 — Vendor product audit](../../architecture/decisions/ADR-0019-vendor-product-audit.md)
(2026-11-21, accepted by explicit user scope): provider-configured comparisons,
admin-only actions, canonical command reuse and auditable explicit review resolution.

| Decision | Canonical record | Affected area |
|---|---|---|
| ADR-0001 | [Record architecture decisions](../../architecture/decisions/ADR-0001-record-architecture-decisions.md) | All modules |
| ADR-0002 | [Single architecture authority](../../architecture/decisions/ADR-0002-single-source-of-truth-architecture-docs.md) | Architecture and module docs |
| ADR-0003 | [Bounded contexts](../../architecture/decisions/ADR-0003-bounded-contexts.md) | Domain ownership |
| ADR-0004 | [Device catalog](../../architecture/decisions/ADR-0004-device-catalog-bounded-context.md) | Devices |
| ADR-0005 | [Pricing](../../architecture/decisions/ADR-0005-pricing-bounded-context.md) | Pricing/commerce |
| ADR-0006 | [AI agent services](../../architecture/decisions/ADR-0006-ai-agent-services-bounded-context.md) | Proposed agent services; not verified as an implemented app |
| ADR-0007 | [Category-extensible products](../../architecture/decisions/ADR-0007-category-extensible-product-catalog.md) | Catalog |
| ADR-0008 | [Warranty support](../../architecture/decisions/ADR-0008-warranty-registration-and-claim-support.md) | Proposed warranty capability; not a verified standalone module |
| ADR-0009 | [Order routing](../../architecture/decisions/ADR-0009-order-routing-bounded-context.md) | Routing |
| ADR-0010 | [Fulfillment/returns](../../architecture/decisions/ADR-0010-fulfillment-returns-bounded-context.md) | Fulfillment |
| ADR-0011 | [Invoices](../../architecture/decisions/ADR-0011-invoice-management-bounded-context.md) | Invoicing |
| ADR-0012 | [Logs/audit/files](../../architecture/decisions/ADR-0012-logs-audit-file-tracking.md) | Audit |
| ADR-0013 | [Notification platform](../../architecture/decisions/ADR-0013-notification-platform-service.md) | Notification |
| ADR-0014 | [Media/assets](../../architecture/decisions/ADR-0014-media-image-asset-management.md) | Media |
| ADR-0015 | [External connections](../../architecture/decisions/ADR-0015-integration-management-external-system-connections.md) | Integration |
| ADR-0016 | [Analytics/reporting](../../architecture/decisions/ADR-0016-analytics-reporting-bounded-context.md) | Analytics |
| ADR-0017 | [Procurement](../../architecture/decisions/ADR-0017-procurement-purchase-orders-bounded-context.md) | Procurement |
| ADR-0018 | [Launch coordination](../../architecture/decisions/ADR-0018-launch-event-management-bounded-context.md) | Launch |

For each historical record: decision ID is above; date is **unknown unless recorded
in the canonical document** (commit dates are not approval dates); context, decision,
reasoning and current status are in that record; alternatives not recorded there
are **unknown**; trade-offs are the recorded consequences, not retrospective claims.
Accepted/proposed design status does not mean all of the design is implemented.

## MEM-ADR-001 — Layered implementation memory

- Date: 2026-11-19. Status: adopted for TASK-001 by explicit user request.
- Context: independent agents lose conversation history; existing design documents
  and old CONTEXT files do not identify every current implementation boundary.
- Decision: AGENTS.md is the concise canonical workflow; CLAUDE.md references it.
  State/handoff/tasks are the startup set. Feature/module/rule/decision documents
  are selected by task; detailed API/schema references load only when relevant.
- Reasoning: retain recovery context and navigation while preserving architecture authority.
- Alternatives considered: automatically loading all documentation (rejected: excess
  context); replacing existing design records (rejected: loss of authority/history).
- Trade-offs: agents must update affected records; source remains necessary evidence.
- Affected modules: repository instructions, docs/ai-context, all development workflows.

## MEM-ADR-002 — Read-only inventories plus curated behavior

- Date: 2026-11-19. Status: adopted for TASK-001.
- Context: empty legacy routers and stale generated schema can mislead discovery;
  field/scope/reference names do not always imply database relationships.
- Decision: export active resolver and Django model metadata under isolated test
  settings, blocking SQL during inventory. Render only mechanical API/schema
  references; maintain behavior/risks/decisions manually with source evidence.
- Reasoning: reproducible structural verification without reading customer records
  or guessing intended policy from metadata.
- Alternatives: source-only route regex (misses router expansion); live DB dumps
  (unnecessary data exposure and deployment coupling).
- Trade-offs: dynamic serializers/permissions/service behavior still require inspection;
  this cannot prove deployed migrations or successful provider delivery.
- Affected modules: scripts/ai-context-inventory.py, reference renderer/validator, API/schema docs.

## MEM-ADR-003 — Documentation-only initialization

- Date: 2026-11-19. Status: adopted; business fixes require separate tasks.
- Context: discovery found unrelated user WIP and existing defects/test failures.
- Decision: preserve WIP; record issues and follow-up tasks; change no application
  behavior, dependency, schema or deployment in initialization. Do not commit/push.
- Reasoning: explicit initialization scope and CIXCI rule ownership constraints.
- Alternatives: fixing discovered defects immediately (rejected: unrelated scope and
  unresolved business rules).
- Trade-offs: known defects remain; memory completion is distinct from release readiness.
- Affected modules: all; issue/task ledger and final verification report.
