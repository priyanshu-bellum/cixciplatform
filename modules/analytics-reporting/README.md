# Analytics / Reporting Module

This module is a proposal-level architecture surface for Analytics / Reporting.

Analytics / Reporting owns reporting read models, analytics projections, metric/report definitions, report exports, analytics hooks, and reporting consumption contracts. Source modules own operational events and source records. Tenant Company owns access/scope/redaction authority. Logs & Audit owns immutable audit/file/access evidence.

Analytics / Reporting does not own source-module mutation, AI recommendation generation, AI action orchestration, Tenant Company authority, Integration delivery, Notification delivery, or immutable audit evidence.

## Module Role

Analytics / Reporting should consume structured source-module events and evidence to build reporting read models, metrics, and analytics projections. It should not infer source truth when source evidence is missing, stale, superseded, ignored, redacted, or unauthorized.

Analytics / Reporting may expose read models or analytics hooks for future AI consumers, but those hooks do not make Analytics the owner of AI Agent Services or source-module action execution.

## Analytics-Facing Sub-Contracts

- `ai-agent-catalog-analytics-hooks.md` - Analytics / Reporting-facing sub-contract for AI-ready events, analytics hooks, AI Agent Catalog governance, AI action authority, AI Action Evidence / Disposition, human approval levels, external app source-of-truth boundaries, and audit-ready AI activity references.

If an AI Agent Services module is introduced later, the agent catalog and AI action governance sections should move or be mirrored there. Analytics / Reporting should retain analytics hooks, reporting read-model consumption, metrics, report exports, and AI-ready signal/read-model references.

## File Guide

- `data-model.md` - proposal-level analytics/reporting data concepts.
- `api-contracts.md` - proposal-level Analytics / Reporting API surfaces.
- `events.md` - analytics/reporting event and hook concepts.
- `event-contracts.md` - event payload expectations.
- `test-scenarios.md` - proposal-level reporting and analytics validation scenarios.
- `assumptions-open-questions.md` - unresolved Analytics / Reporting assumptions.
- `ai-agent-catalog-analytics-hooks.md` - AI-ready events, analytics hooks, and AI governance sub-contract.

## Boundary Notes

- Analytics / Reporting consumes source-module events and evidence; it does not become source of truth for operational records.
- Analytics / Reporting may project Product Catalog availability evidence today, but must not infer warehouse inventory ledger truth unless a future Inventory Management bounded context provides that evidence.
- AI Agent Services, if/when introduced, should own agent orchestration and AI action records.
- Source modules own final business validation and mutations.
- Tenant Company owns authority evidence.
- Logs & Audit owns immutable audit evidence.
- Integration Management owns external delivery/receipt evidence.

## Cross-Module Pull Request Surfaces (additive)

The Cross-Module Scheduled System Admin Activity Summary Email PR (PR-C) adds an architecture-level surface to this module for scheduled summary aggregation. The surface is distinct from the existing reporting read model, report execution, scheduled report placeholder, dashboard, export, and refresh patterns and co-exists without modification of existing entities, workflows, or events.

PR-C surfaces added to Analytics / Reporting:

- Activity Summary Reporting Window entity (`pending`, `evaluating`, `aggregated`, `suppressed_no_activity`, `delivered`, `delivery_failed`, `superseded` lifecycle).
- Activity Summary Aggregation Record entity (immutable; organized by Section: orders, shipping, returns, exceptions; per-Metric counts; Summary Source Fact References).
- Three PR-C workflows (Reporting Window Evaluation; Source Fact Aggregation; No-Activity Suppression).
- Two PR-C events (`analytics.activity-summary-window.evaluated`, `analytics.activity-summary-aggregation.created`).
- Carry-forward subsumption logic for missed windows (consecutive failures all carry forward).
- Summary Dashboard Reference field (reference-only; dashboard implementation deferred to future PR).
- Permissions and boundary contracts for the new entities.

Cross-module partners for this surface:

- Notification Platform Service owns Activity Summary Configuration, Activity Summary Delivery Attempt, recipient scope resolution, cursor advancement on successful delivery, and transport-layer references. See `modules/notification-platform-service/`.
- Logs & Audit File Tracking owns Activity Summary Generated Evidence, No-Activity Summary Suppression Evidence, and reference-pattern retention. See `modules/logs-audit-file-tracking/`.

PR-C consumes source events from PR #91 (Order Routing), PR #92 (Fulfillment / Returns SLA), and PR #94 (Fulfillment / Returns Delivery Date and Buyer Update) read-only. PR-C does not modify any source-module file or event. The PR #92 SLA-semantics preservation invariant and the PR #94 delivery-date and buyer-update semantics preservation invariant continue to hold unconditionally.
