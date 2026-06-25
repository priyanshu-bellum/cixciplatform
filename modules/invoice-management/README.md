# Invoice Management Module

This module is a proposal-level architecture specification for the Invoice Management bounded context.

Invoice Management owns invoice records, invoice lines, invoice eligibility evaluation, invoice preview/finalization/regeneration/supersession, invoice reports/exports, assigned invoice adjustment lifecycle, reconciliation detection/review, accounting sync request state, invoice views, invoice status, invoice history, and invoice events.

Invoice Management consumes source-owned evidence from Pricing, Fulfillment/Returns, Order Routing, Procurement / Purchase Orders, Product Catalog, Tenant Company, Integration Management, Logs & Audit, and Notification Platform Service. It must not recalculate Pricing-owned values, decide fulfillment delivery, decide return operational disposition, execute refunds/payments, own accounting ledger posting, own Procurement accepted-price truth, mutate routing decisions, deliver notifications, transport integrations, or own Logs & Audit evidence.

All content is proposal-level. It does not finalize invoice numbering, tax handling, payment processing, accounting ledger behavior, accounting sync implementation, reconciliation settlement, export retention, or implementation design.

## Source Guidance

This module should be read with:

- ADR-0011 Invoice Management bounded context.
- ADR-0010 Fulfillment and Returns bounded context.
- ADR-0009 Order Routing bounded context.
- ADR-0008 Warranty Registration and Claim Support.
- ADR-0007 Category-Extensible Product Catalog.
- ADR-0006 AI Agent Services.
- ADR-0005 Pricing.
- ADR-0004 Device Catalog.
- Tenant Company module.
- Product Catalog module.
- Pricing module.
- Order Routing module.
- Fulfillment and Returns module.
- Procurement / Purchase Orders module.
- Integration Management module.
- Logs & Audit File Tracking module.
- Notification Platform Service module.
- Analytics / Reporting module.
- `architecture/standards/import-export-validation-governance.md`.
- Architecture domain glossary and core entities.

## Files

- `spec.md` - module purpose, scope, evidence boundaries, channel handling, export governance, and accounting/reconciliation boundaries.
- `data-model.md` - proposal-level entities, evidence records, relationships, and ownership notes.
- `api-contracts.md` - domain API contract concepts.
- `openapi-contracts.md` - implementation-oriented endpoint and schema notes.
- `events.md` - event catalog and event modeling notes.
- `event-contracts.md` - event interface contract template.
- `boundary-contracts.md` - explicit ownership and must-not-answer boundaries.
- `permissions.md` - roles, access evidence, redaction, and export guardrails.
- `workflows.md` - invoice preview/generation/finalization, channel, adjustment, export, reconciliation, and accounting sync workflows.
- `edge-cases.md` - boundary and evidence edge cases.
- `test-scenarios.md` - proposal-level validation scenarios.
- `assumptions-open-questions.md` - assumptions, scale placeholders, and decisions needed.

## Invoice Management Foundation Hardening Scope

This section documents the Invoice Management foundation hardening scope. The PR is additive across 12 files in `modules/invoice-management/`. No adjacent module file is modified. No OpenAPI, runtime, code, schema, migration, build, or lockfile change occurs. `modules/invoice-management/openapi-contracts.md` remains unchanged.

### What this Foundation delivers

- **9 primary entities:** Invoice Run, Invoice Period, Invoice Report, Invoice, Invoice Line, Invoice Adjustment, Invoice Exception Record, Vendor Reconciliation Upload Job, Vendor Reconciliation Match Result.
- **8 sub-structures:** Invoice Line Source Reference, Invoice Status History, Invoice Run Result Summary, Invoice Export / File Reference, Invoice Evidence Reference, QuickBooks Handoff Reference, Vendor Reconciliation Upload Row, Vendor Reconciliation Evidence Reference.
- **24 reference fields** locked (reference-first per existing PR-A discipline).
- **14 internal Invoice statuses** + **15 Invoice Run statuses** + **10 Vendor Reconciliation Upload statuses** + **13 Match Result statuses** as discriminator catalogs.
- **External / reference-only statuses** (`sent`, `paid`, `partially_paid`, `credited`, QuickBooks ledger / payment / tax states) stored as REFERENCES via `quickbooks_payment_status_reference` and related fields, NOT as Invoice Management ledger truth.
- **11 events** (8 base + 3 vendor reconciliation), discriminator-based, no event explosion.
- **19 numbered architectural workflows** (15 base + 4 vendor reconciliation / payable package / handoff).
- **Vendor Month-End Reconciliation Upload** rules: vendor file is comparison evidence, NOT source truth by default; upload rows MUST NEVER mutate adjacent module records.
- **Vendor Payment / QuickBooks Handoff** rules: Invoice Management owns handoff REQUEST; Integration Management owns transport; QuickBooks owns external ledger; CIXCI does NOT auto-submit vendor payment.
- **Pricing / Commission boundary**: Pricing owns calculation; Invoice Management stores snapshot values as evidence only.
- **Buyer / Vendor Invoice separation via discriminators** (`invoice_type`, `counterparty_role`, `invoice_view_type`, `billing_profile_reference`); no separate entity families.
- **Route-looking examples in `api-contracts.md` reframed** as non-final conceptual architecture surfaces.

### Core boundary wording

`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`

### Core vendor file rule (locked verbatim)

`The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.`

### Core no-auto-payment rule (locked verbatim)

`CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`

### Boundary discipline reaffirmed

- **Invoice Management owns** invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff REFERENCES, invoice evidence references, invoice operational workflow, vendor payout statement / payable package readiness, the 11 new events, the 19 new workflows.
- **Invoice Management does NOT own** order truth (Order Routing), fulfillment / delivery / return / refund truth (Fulfillment / Returns), pricing calculation truth (Pricing), commission interpretation truth (Pricing), product / accessory source truth (Product Catalog), buyer catalog mapping truth (Product Catalog), company authority / `check_access` truth (Tenant Company), QuickBooks ledger truth (QuickBooks external), QuickBooks transport truth (Integration Management), payment execution truth (QuickBooks external + future Settlement / Payout), tax calculation truth (QuickBooks / CPA deferred), settlement / payout execution truth (future Settlement / Payout), analytics / BI truth (Analytics), Logs & Audit immutable evidence truth (Logs & Audit).
- **Tenant Company owns** `check_access`, buyer / company / entity capabilities, lifecycle (PR #103). No new tenant capabilities; `audit_export.*` NOT used.
- **Logs & Audit owns** Evidence Record, File Tracking Record, retention, audit access (PR #98-#102). New evidence kinds emitted via existing `service_identity.evidence_emit`; no new Logs & Audit entities.
- **Integration Management owns** QuickBooks transport / sync outcome references.
- **QuickBooks (external)** owns external invoice id, bill id, ledger / payment / tax / accounting state after sync.
- **Analytics owns** BI / reporting / dashboards / KPIs. Invoice operational records are NOT BI dashboards.
- **Notification Platform owns** delivery. Invoice Management emits notification intent only (future coordination).
- **Order Routing / Fulfillment / Returns / Procurement** boundaries preserved per existing baseline; never mutated by Invoice Management.

### What this Foundation intentionally does NOT do

- No modifications to `modules/invoice-management/openapi-contracts.md`.
- No modifications to any adjacent module file (Product Catalog, Device Catalog, Logs & Audit, Tenant Company, Integration Management, Pricing, Order Routing, Fulfillment / Returns, Procurement, Analytics, Notification Platform).
- No rename, deprecation, or replacement of any existing Invoice Management entity, event, workflow, or rule.
- No separate Buyer Invoice / Vendor Invoice / CIXCI Commission Invoice entity families.
- No automatic vendor payment execution (locked default).
- No tax calculation logic (deferred or QuickBooks / CPA-owned).
- No BI / analytics dashboards.
- No new Tenant Company capabilities, role bundles, or service identity profiles.
- No new Logs & Audit entities.
- No concrete HTTP routes, request / response payload schemas, pagination, authentication, error codes.
- No concrete UI / UX design.
- No numeric retention / throttle / freshness window values.
- No event explosion (11 events total via discriminators).
- No mutation of QuickBooks records by Invoice Management.
- No mutation of Order Routing / Fulfillment-Returns / Pricing / Product Catalog / Tenant Company / Logs & Audit records by Invoice Management.
- No treating vendor reconciliation file as source truth by default.

### Sequence positioning

This PR follows PR #98 through PR #105 (all merged at origin/main) and is the next architecture hardening step after API / Swagger work was paused. The next planned PRs after this one are:

1. CPA / legal / DevOps retention duration review for the new Invoice Management evidence kinds (parallel; combine with PR #105 retention review).
2. API Governance Foundation PR (resumes the paused API / Swagger work with cross-module conventions).
3. Invoice-Management-specific OpenAPI hardening PR (concrete HTTP routes / payloads / pagination / error codes).
4. Pricing module hardening PR (reciprocal: lock `pricing_snapshot_reference` + `commission_snapshot_reference` shape).
5. Fulfillment-Returns module hardening PR (reciprocal: lock delivery / refund evidence emission shape).
6. Integration Management QuickBooks transport hardening PR.
7. Future UX / UI work.
8. Future Notification Platform coordination.
9. Future Settlement / Payout module (only if/when CIXCI introduces auto-payment with additional controls).
10. Future Tax module / CPA decision.

### Application discipline

This hardening is additive documentation-and-architecture across 12 target files. Existing Invoice Management baseline, PR #98-#102 content, PR #103 content, PR #104 content, and PR #105 content are preserved by reference without modification. See `APPLY.md` in the PR bundle for tool-agnostic application instructions, the explicit STOP-before-`git add` / staging / commit / push / PR rule, and prohibitive-only references to destructive commands.
