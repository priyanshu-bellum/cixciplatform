# ADR-0006: AI Agent Services Bounded Context

## Status

Proposed

## Context

CIXCI will provide buyer-facing and manufacturer-facing AI agents that act like a virtual accessory team. These agents may help buyers improve accessory strategy, merchandising, brand voice, catalog quality, procurement decisions, device attach opportunities, and operational review workflows. Manufacturer-facing agents may help improve device data quality, launch readiness, buyer adoption, device-to-accessory opportunities, bulk purchase support, and performance intelligence.

AI agents will consume signals from platform modules, but they should not own source-of-truth records inside those modules. Without a clear boundary, AI capabilities could accidentally become a hidden owner of catalog data, device data, pricing logic, tenant eligibility, order state, invoice state, audit logs, file processing, media rights, procurement state, or analytics definitions.

This ADR introduces AI Agent Services as a future bounded context / platform capability. It is proposal-level architecture only and does not finalize implementation design, agent models, workflows, permissions, data contracts, or business rules.

## Decision

Introduce AI Agent Services as a future bounded context / platform capability.

Core rule:

- Modules produce agent-supporting signals.
- AI Agent Services consumes those signals.
- AI Agent Services produces insights, recommendations, suggested actions, draft actions, confidence scores, approval workflows, and outcome tracking.

AI Agent Services must not become the source of truth for the modules it observes. Source modules remain the authority for their own records, workflows, files, audit history, and domain-specific state.

## Buyer-Facing Agents

These agent descriptions are proposal-level and do not finalize product scope or implementation behavior.

### Accessory Strategy Agent

Purpose: help buyers evaluate accessory assortment strategy across device mix, buyer scope, catalog coverage, sales trends, and operational constraints.

May produce:

- Assortment recommendations.
- Gap analysis.
- Attach-rate opportunity insights.
- Draft assortment plans.
- Confidence scores and rationale.
- Review queues for buyer or CIXCI approval.

Must not own:

- Product source records.
- Device source records.
- Final pricing.
- Buyer eligibility.
- Order routing.
- Procurement or purchase order workflow.

### Accessory Merchandising Agent

Purpose: help buyers improve accessory merchandising content, grouping, discoverability, and product presentation.

May produce:

- Merchandising recommendations.
- Suggested product grouping or taxonomy improvements.
- Draft product copy variants.
- SEO and listing quality suggestions.
- Buyer-specific content variants for export where approved.

Must not silently change SKU, UPC, compatibility, pricing, inventory, warranty, dimensions, compliance claims, or other source-of-truth facts.

### Brand Voice & Growth Agent

Purpose: help buyers apply their Brand Voice Profile to buyer-facing product content, growth campaigns, and export-ready descriptions.

May produce:

- Buyer-specific copy variants.
- Brand-aligned Meta Title and Meta Description suggestions.
- Growth recommendations.
- Content quality scores.

Must preserve traceability to original vendor source data and must not overwrite source product facts.

### Accessory Intelligence Agent

Purpose: help buyers and CIXCI teams detect catalog opportunities, weak coverage, performance patterns, and product risks.

May produce:

- Catalog coverage insights.
- Compatibility opportunity analysis.
- Product quality and completeness scoring.
- Suggested next actions.
- Outcome tracking for accepted, rejected, ignored, or edited recommendations.

Must not own Analytics definitions, Product Catalog records, Pricing calculations, or Order Routing decisions.

### Vendor Quality & Compliance Agent

Purpose: help identify vendor catalog quality issues, missing data, weak claims, compliance concerns, repeated import failures, and source-data risks.

May produce:

- Vendor quality scorecards.
- Compliance review queues.
- Missing data recommendations.
- Draft vendor follow-up actions.

Must not finalize compliance decisions, alter source records without approval, or bypass audit requirements.

### Accessory Procurement Agent

Purpose: help identify procurement opportunities, gaps, and suggested purchasing actions for accessories.

May produce:

- Suggested procurement opportunities.
- Draft action items.
- Vendor comparison insights.
- Review queues.

Must not create, approve, submit, or change purchase orders unless a future Procurement / Purchase Orders context explicitly delegates an approved action contract.

### Device-Attach & Bundle Agent

Purpose: help buyers identify accessory attach and bundle opportunities around Device References, buyer device portfolios, launch windows, and catalog coverage.

May produce:

- Bundle recommendations.
- Device-to-accessory attach opportunities.
- Launch-ready assortment suggestions.
- Draft buyer review actions.

Must not decide accessory compatibility, canonical device identity, final pricing, order routing, or procurement workflow.

## Manufacturer-Facing Agents

These agent descriptions are proposal-level and do not finalize product scope or implementation behavior.

### Device Data Quality Agent

Purpose: help manufacturers and CIXCI teams identify device data completeness, normalization, identity, image, and taxonomy issues.

May produce:

- Completeness scores.
- Duplicate detection candidates.
- Normalization suggestions.
- Missing image flags.
- Taxonomy improvement recommendations.

Must not silently alter canonical device identity, Device References, manufacturer ownership, launch dates, lifecycle status, or source records.

### Launch Readiness Agent

Purpose: help identify readiness gaps for device launches, buyer export readiness, image readiness, taxonomy readiness, compatibility preparation, and downstream signal readiness.

May produce:

- Launch readiness checklists.
- Gap reports.
- Risk flags.
- Draft tasks for review.

Must not publish devices, change lifecycle dates, alter buyer visibility, or bypass required approvals.

### Buyer Adoption Agent

Purpose: help manufacturers understand buyer adoption, portfolio coverage, export/download readiness, and device data usage patterns.

May produce:

- Adoption insights.
- Buyer engagement summaries.
- Coverage opportunities.
- Follow-up recommendations.

Must not own buyer workflow state, tenant eligibility, buyer permissions, or analytics metric definitions.

### Device-to-Accessory Opportunity Agent

Purpose: help manufacturers and CIXCI teams identify accessory opportunities associated with device launches, device portfolios, and compatibility preparation.

May produce:

- Accessory opportunity recommendations.
- Gap analysis for device-to-accessory coverage.
- Suggested manufacturer or vendor follow-up.

Must not decide final accessory compatibility, Product Catalog source records, Pricing outcomes, or Order Routing behavior.

### Bulk Purchase Support Agent

Purpose: support future manufacturer bulk device purchase workflows by identifying draft opportunities, missing inputs, risk flags, and review needs.

May produce:

- Draft purchase support recommendations.
- Missing field checklists.
- Buyer/manufacturer review queues.
- Risk scoring.

Must not create, approve, submit, change status, reconcile, invoice, or fulfill purchase orders unless a future Procurement / Purchase Orders context provides an explicit approved action contract.

### Manufacturer Performance Intelligence Agent

Purpose: help manufacturers understand catalog quality, adoption, launch readiness, order trends, fulfillment signals, return patterns, and operational risks.

May produce:

- Performance insights.
- Quality trends.
- Operational risk flags.
- Suggested improvements.

Must not own Analytics reporting definitions, invoice records, reconciliation, fulfillment state, or vendor contractual decisions.

## Agent-Supporting Signals By Module

The following examples are proposal-level. Future module specifications should define their own agent-supporting signal contracts.

### Tenant Company Signals

- Tenant, parent company, and child entity references.
- Relationship eligibility signals.
- Geographic eligibility signals.
- Activation readiness signals.
- User/entity access scope signals.
- AI agent preference signals.
- Brand Voice Profile onboarding signals.
- Admin exception signals.

Tenant Company remains the authority for tenant scope, hierarchy, eligibility, readiness, roles, permissions, and user/entity access.

### Device Catalog Signals

- Device Reference changes.
- Device identity conflict flags.
- Import validation errors.
- Duplicate or normalization candidates.
- Device lifecycle and launch readiness signals.
- Image readiness signals.
- Buyer visibility status signals.
- Compatibility-preparation quality signals.

Device Catalog remains the authority for canonical device data, Device References, lifecycle state, and buyer-exportable device data.

### Product Catalog Signals

- Product identity and vendor SKU mapping signals.
- Catalog import errors and correction records.
- Product lifecycle, publication, visibility, activation, and download signals.
- Compatibility assertion signals to Device References.
- Product content quality signals.
- Media/content asset reference signals.
- Catalog-carried pricing input handoff signals.

Product Catalog remains the authority for accessory product source records, vendor identity mappings, compatibility assertions, product asset references, activation/download records, and catalog-carried pricing inputs.

### Pricing Signals

- Pricing profile and rule availability signals.
- Effective price snapshot signals.
- Pricing exception and override signals.
- Stale pricing input or recalculation signals.
- Quote-like result status signals.
- Pricing-sensitive redaction class signals.

Pricing remains the authority for commercial interpretation, calculation, effective prices, exceptions, overrides, snapshots, and pricing audit.

### Order Routing Signals

- Routing request status signals.
- Routing failure or review-required signals.
- Vendor suborder creation signals.
- Split/routing decision summary signals.
- Manual override request signals.

Order Routing remains the authority for order intake, routing decisions, vendor selection, split decisions, vendor suborder creation, and order orchestration.

### Orders Signals

- Order submission and order lifecycle signals.
- Buyer order context signals.
- Product/order line reference signals.
- Cancellation, hold, or review-required signals.
- Order exception signals.

A future Orders or Order Routing module remains the authority for order state and order workflow.

### Fulfillment And Returns Signals

- Shipment status signals.
- Return request signals.
- Fulfillment exception signals.
- Carrier/tracking issue signals.
- Delivery delay or repeated failure signals.

Fulfillment remains the authority for shipment, return, fulfillment status, and operational execution state.

### Invoice Management Signals

- Invoice lifecycle signals.
- Reconciliation mismatch signals.
- Duplicate, missing, or inconsistent invoice row signals.
- Amount difference signals.
- Payment, correction, dispute, or accounting-sync risk signals.

Invoice Management remains the authority for invoice lifecycle, payment, accounting, reconciliation, correction, and dispute workflows.

### Logs & Audit File Tracking Signals

- File processing status signals.
- Import/export failure signals.
- API failure and retry signals.
- Audit gap or retention risk signals.
- Duplicate, missing, malformed, or rejected row signals.

Logs & Audit File Tracking remains the authority for audit records, source files, retention policy, file processing records, and compliance evidence.

### Analytics Signals

- Metric trend signals.
- Reporting anomaly signals.
- Adoption and performance signals.
- Data freshness signals.
- Forecast and benchmarking input signals.

Analytics remains the authority for reporting models, rollups, metrics, read models, and reporting latency decisions.

### Images / Media Asset Management Signals

- Missing image signals.
- Low-quality image signals.
- Duplicate or incorrectly formatted asset signals.
- Rendition readiness signals.
- Rights/licensing metadata risk signals.
- Naming and metadata quality signals.

Images / Media Asset Management remains the authority for source media assets, asset versions, renditions, rights/licensing metadata, and publishing workflows if assigned as a platform service or bounded context.

### Launch/Event Management Signals

- Launch readiness signals.
- Event schedule signals.
- Campaign or rollout readiness signals.
- Missing launch dependency signals.
- Post-launch outcome signals.

Launch/Event Management remains the authority for launch workflow, event scheduling, rollout state, and campaign execution if introduced.

### Procurement / Purchase Orders Signals

- Draft procurement opportunity signals.
- Purchase order readiness signals.
- Missing purchase order data signals.
- Approval status signals.
- Manufacturer bulk purchase support signals.

Procurement / Purchase Orders remains the authority for purchase order creation, approval, submission, lifecycle status, and procurement workflow if introduced.

## Product Catalog AI Guardrails

AI may:

- Review and improve accessory descriptions for quality, clarity, and SEO.
- Generate Meta Title and Meta Description when missing.
- Create buyer-specific product content variants using the buyer's Brand Voice Profile during export.
- Flag missing, weak, duplicated, stale, or inconsistent product content.
- Recommend taxonomy, merchandising, or discoverability improvements.

AI must:

- Preserve original vendor source data.
- Keep buyer-facing content variants traceable to original source data.
- Store suggested before/after content changes and rationale.
- Require human approval and audit tracking for critical source-of-truth changes.

AI must not silently change:

- SKU.
- UPC, GTIN, or product identifiers.
- Compatibility mappings or Device References.
- Pricing inputs or calculated prices.
- Inventory or availability facts.
- Warranty claims.
- Dimensions, weight, materials, or fitment facts.
- Regulatory, compliance, safety, or certification claims.
- Other source-of-truth product facts.

## Device Catalog AI Guardrails

AI may:

- Review device import data for completeness, normalization, duplicate detection, launch readiness, image readiness, and compatibility-preparation quality.
- Flag device identity conflicts.
- Flag missing images.
- Flag weak taxonomy.
- Flag launch-readiness gaps.
- Recommend normalization candidates and review queues.

AI must:

- Preserve manufacturer source data.
- Store confidence score, reason, source module, before/after suggestion, and audit reference for suggested changes.
- Require approval and audit tracking before critical source-of-truth changes.

AI must not silently alter:

- Canonical device identity.
- Manufacturer ownership.
- Device lifecycle status.
- Launch dates.
- Release dates.
- Discontinued dates.
- Device Reference mappings.
- Merge, split, redirect, deprecated, or retired Device Reference behavior.

## Images / Media Asset Management AI Guardrails

AI may:

- Flag missing, low-quality, duplicate, incorrectly formatted, or non-downstream-ready images.
- Recommend image improvements.
- Recommend renditions.
- Recommend naming normalization.
- Recommend metadata improvements.
- Create review queues for media readiness.

AI must not silently:

- Replace source media assets.
- Alter rights or licensing metadata.
- Publish buyer-facing media.
- Delete media assets.
- Reassign source ownership.
- Bypass required media approval workflows.

## Invoice / Logs / Audit Agent Boundaries

AI may:

- Detect reconciliation mismatches.
- Detect duplicate rows.
- Detect missing rows.
- Detect amount differences.
- Detect status differences.
- Detect repeated import failures.
- Detect API failures.
- Detect file-processing risks.
- Create recommendations or review queues.
- Draft remediation steps for human review.

AI must not:

- Finalize invoices.
- Alter financial records.
- Delete audit logs.
- Overwrite source files.
- Bypass retention rules.
- Mark reconciliations complete.
- Alter payment, accounting, or dispute workflow state unless a future owning module provides an explicit approved action contract.

## Ownership Boundaries

### Modules Own

- Source records.
- Operational workflows.
- Audit history.
- Files and source payloads.
- Module-specific events and signals.
- Module-specific validation rules.
- Module-specific approval and retention rules.

### AI Agent Services Owns

- Recommendations.
- Insights.
- Suggested actions.
- Draft actions.
- Confidence scores.
- Buyer/manufacturer feedback signals.
- Agent outcomes.
- Approved AI action records.
- Recommendation status such as accepted, rejected, ignored, edited, expired, or superseded.

### AI Agent Services Must Not Own

- Catalog source records.
- Canonical device records.
- Pricing calculations or effective price snapshots.
- Tenant eligibility or user/entity access.
- Order state or routing decisions.
- Fulfillment execution.
- Invoice lifecycle or financial records.
- Audit logs, retention policy, or source files.
- Source media assets, rights/licensing metadata, or media publishing approvals.
- Analytics reporting definitions or rollups.
- Procurement or purchase order workflow.

## Agent Action Modes

AI Agent Services should support explicit action modes. These modes are proposal-level and should be refined before implementation.

### Observe

The agent reads authorized signals and produces no recommendation or action.

Examples:

- Monitor import errors.
- Monitor missing image signals.
- Monitor launch readiness signals.

### Recommend

The agent creates an insight or recommendation for review.

Examples:

- Recommend improving a product description.
- Recommend reviewing a duplicate device candidate.
- Recommend investigating invoice row mismatches.

### Draft

The agent drafts a proposed action or content change but does not apply it.

Examples:

- Draft buyer-specific product copy.
- Draft a remediation checklist.
- Draft a vendor follow-up message.

### Request Approval

The agent submits a recommendation or draft action into an approval workflow owned by the appropriate module or operating team.

Examples:

- Request approval for a source-of-truth catalog correction.
- Request approval for a media replacement.
- Request approval for a device identity merge suggestion.

### Approved Do-For-Me

The agent performs an action only after explicit approval and only through an owning module's approved action contract.

Examples:

- Apply an approved product content variant.
- Create an approved review task.
- Submit an approved correction request.

This mode requires audit tracking, rollback/reference information, and ownership clarity.

### Block / Flag For Review

The agent flags a risk, conflict, or policy violation and prevents or recommends pausing downstream action until review.

Examples:

- Flag risky compliance claims.
- Flag a suspected duplicate Device Reference.
- Flag repeated file-processing failures.

## Human Approval And Audit Requirements

Critical source-of-truth changes require human approval.

AI-generated recommendations, drafts, and approved actions should store:

- Before values.
- After values.
- Actor or agent identity.
- Human approver where required.
- Timestamp.
- Source module.
- Source record reference.
- Confidence score.
- Reason or rationale.
- Prompt/model/version reference where appropriate.
- Approval workflow reference.
- Rollback or remediation reference.
- Outcome status.

Buyer-facing content variants must remain traceable to original source data. If AI changes wording for buyer voice, SEO, clarity, or merchandising, the original source facts should remain inspectable and recoverable.

Audit records should distinguish between:

- AI recommendation created.
- AI draft created.
- Human edited recommendation.
- Human approved action.
- Human rejected action.
- Approved action applied through owning module.
- Approved action rolled back or superseded.

## Future Implementation Notes

- Future modules such as Order Routing, Invoice Management, Logs & Audit File Tracking, Media Asset Management, Launch/Event Management, Analytics, and Procurement / Purchase Orders should each define agent-supporting signals when their module architecture is drafted.
- Product Catalog, Device Catalog, Pricing, and Tenant Company may later add module-specific `agent-signals.md` files.
- AI Agent Services should support feedback loops so accepted, rejected, ignored, or edited recommendations can improve future recommendations.
- AI Agent Services should include authorization, tenant isolation, redaction, and consumer-specific payload boundaries before implementation.
- AI Agent Services should define confidence scoring, recommendation versioning, prompt/model version tracking, evaluation metrics, and rollback/reference contracts before any approved action mode is enabled.
- AI Agent Services should use module APIs or approved action contracts rather than direct database writes into source modules.
- AI Agent Services should treat high-risk financial, compliance, source identity, tenant eligibility, and audit-log changes as approval-required by default.

## Impacts

- ADR-0003, ADR-0004, and ADR-0005 should be read with this ADR when future modules expose agent-supporting signals.
- Product Catalog, Device Catalog, Pricing, and Tenant Company do not need immediate module file changes from this ADR.
- Future Product Catalog and Device Catalog refinements may add module-specific agent signal files and AI guardrails.
- Future Invoice Management, Logs & Audit File Tracking, Media Asset Management, Launch/Event Management, Analytics, Order Routing, Orders, Fulfillment, Returns, and Procurement / Purchase Orders modules should define AI signal boundaries as they are drafted.

## Open Questions

- Which agent action modes are allowed by tenant, buyer, manufacturer, CIXCI admin, and integration role?
- Which AI recommendations may be visible to buyers, manufacturers, vendors, and internal CIXCI teams?
- Which modules require synchronous versus asynchronous AI signal delivery?
- What confidence thresholds require approval, review, blocking, or no action?
- What retention policy applies to prompts, source snippets, before/after values, recommendations, drafts, approvals, and outcomes?
- Which recommendation feedback loops can be used for model improvement, and what consent or tenant isolation rules apply?
- What redaction model is required for pricing-sensitive, invoice-sensitive, tenant-sensitive, media-rights-sensitive, and compliance-sensitive signals?

## Consequences

- AI Agent Services becomes a clear future capability without absorbing source-of-truth responsibilities from existing modules.
- Platform modules can expose agent-supporting signals through explicit contracts instead of leaking internal data models.
- Buyer-facing and manufacturer-facing agents can provide value while preserving human approval and audit requirements for critical changes.
- Future module drafting has a consistent pattern for AI signals, recommendations, action modes, and guardrails.
