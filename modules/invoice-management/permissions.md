# Invoice Management Permissions

This document is proposal-level architecture. Tenant Company remains the authority for users, roles, company/entity scope, channel eligibility, and access decisions.

## Permission Principles

- Invoice Management consumes Tenant Company scope/version, role/scope projection, and access decision references.
- Invoice Management must not independently grant access to invoice records, invoice exports, reconciliation uploads, or accounting sync views.
- Buyer, vendor, and system admin invoice views must be separated.
- Invoice exports/downloads require recheck-before-download where sensitive evidence is present.
- Invoice display requires recheck-before-display where sensitive evidence is present.
- Sensitive access/export events should be auditable through Logs & Audit.

## Proposal-Level Roles

- Buyer invoice viewer.
- Buyer invoice export user.
- Vendor invoice viewer.
- Vendor transaction export user.
- Finance reviewer.
- Reconciliation reviewer.
- Accounting sync requester.
- System admin invoice reviewer.
- AI-assisted reviewer placeholder.

Role names are placeholders; Tenant Company owns canonical role and permission definitions.

## Access Evidence

Invoice access should preserve:

- Tenant Company scope/version.
- Buyer/vendor/entity scope.
- Role/scope projection reference.
- Access decision reference.
- Redaction decision version.
- Buyer/vendor/system admin view type.
- Sensitive invoice access event reference.
- Recheck-before-display flag.
- Recheck-before-download flag.

## Redaction Classes

Invoice views and exports may include customer-sensitive, pricing-sensitive, commission-sensitive, tenant-sensitive, accounting-sensitive, and source-evidence-sensitive fields.

Examples of sensitive fields:

- Customer name and address fields.
- Buyer-facing Wholesale Price from Pricing evidence.
- Vendor-side commission component values.
- Buyer-side commission component values.
- Pricing override/exception references.
- Owned Channel / Kaseory exception references.
- Accounting sync references.
- Reconciliation upload mismatch details.
- Vendor-provided refund/adjustment evidence.

Invoice Management applies redaction decisions using Tenant Company/Pricing evidence. It does not invent visibility authority.

## Export Permissions

Invoice export requests must validate:

- Export requester scope.
- View type: buyer, vendor, or system admin.
- Export schema version.
- Invoice period/date-basis.
- Redaction class/version.
- Recheck-before-download flag.
- Logs & Audit file/download evidence reference.
- Integration delivery reference if exported externally.
- Notification delivery reference if scheduled/emailed.

Invoice exports must not bypass source-module or Tenant Company visibility rules.

## Reconciliation Permissions

Reconciliation upload/review permissions should validate:

- Upload actor scope.
- Vendor/entity scope.
- Reconciliation reviewer role/scope.
- File evidence reference placeholder.
- Preview/review state.

Reconciliation remains detection/review only and does not permit settlement, payment correction, ledger mutation, or source-record mutation.

## Accounting Sync Permissions

Accounting sync request permissions should validate:

- Actor/service scope.
- Invoice/export eligibility.
- Accounting handoff permission placeholder.
- Integration delivery reference.
- Review-required state.

Invoice Management owns request state only. Integration Management owns external accounting transport evidence.

## AI Permission Boundary

AI Agent Services may recommend invoice review actions, mismatch triage, missing evidence review, or export risk review where authorized. AI must not finalize invoices, approve adjustments, create accounting sync requests, or bypass Tenant Company permissions without approved action contracts.

## Invoice Management Foundation Authority Notes

This section documents authority notes for the Invoice Management foundation hardening. All authority decisions flow through Tenant Company `check_access` per existing PR #103 baseline. **This PR introduces NO new tenant capabilities, NO new role bundles, and NO new service identity profiles.** The existing Tenant Company buyer / company / entity capability set + admin authority + Tenant API integration user authority is sufficient.

### Authority discipline (locked)

- Tenant Company `check_access` is the canonical authority surface for all Invoice Management actions:
  - Invoice Run creation (CIXCI System Admin per existing admin authority).
  - Invoice Period selection.
  - Invoice Eligibility Collection (system / service identity per existing Tenant API integration user authority).
  - Invoice Line generation, Invoice Adjustment recording.
  - Invoice Exception Record review and acknowledgment (CIXCI System Admin; per business decision on reconciliation exception approvers).
  - Invoice Approval (CIXCI System Admin per Workflow 9).
  - QuickBooks Handoff Request creation (CIXCI System Admin OR service identity per existing baseline).
  - QuickBooks Sync Reference Recording (service identity; Integration Management owns transport).
  - Vendor Reconciliation Upload Job creation (vendor user; admin-on-behalf per act-on-behalf authority).
  - Vendor Reconciliation Match Result / Exception review (CIXCI System Admin).
  - Vendor Payable Package Approval-Ready determination (CIXCI System Admin per Workflow 18).
  - Vendor Payment QuickBooks Handoff Request creation (CIXCI System Admin per Workflow 19).
  - Invoice Report Export (CIXCI System Admin OR authorized buyer / vendor per existing baseline).
- Buyer-facing actions use existing buyer / company / entity capabilities.
- Vendor-facing actions (reconciliation upload) use existing vendor / company / entity capabilities + Tenant Company act-on-behalf authority where applicable.
- Admin actions use existing CIXCI System Admin authority per existing baseline.
- Service identity actions use existing Tenant API integration user authority.
- Lifecycle blocking applies per existing PR #103 baseline (suspended / pending / inactive actors / targets blocked appropriately).
- All authority decisions are logged via existing Logs & Audit PR-D hardened Audit Access Record discipline.

### Tenant Company `audit_export.*` non-use (locked)

Invoice Management MUST NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for invoice / reconciliation / handoff actions unless future Tenant / Invoice capability coordination explicitly says so. Rationale (mirrors PR #104 + PR #105 boundary lock):

- `audit_export.*` governs COMPLIANCE / audit report exports per Logs & Audit PR-E Audit Report Export Record.
- Invoice generation, vendor reconciliation upload, QuickBooks handoff, and invoice report export are OPERATIONAL surfaces with different consumers (CIXCI System Admin / buyer / vendor billing reviewer, not compliance reviewer) and different authority (existing admin / Tenant API integration user authority, not compliance reviewer role bundle).
- Conflating the two would silently grant compliance-audit-export capabilities to invoice actors or vice versa.

This boundary is locked here and in `boundary-contracts.md`. Future Tenant / Invoice capability coordination MAY introduce explicit invoice-specific capabilities (e.g., `invoice_management.invoice.read`, `invoice_management.invoice_run.create`, `invoice_management.vendor_reconciliation.upload`, `invoice_management.invoice.approve`, `invoice_management.quickbooks_handoff.request`); NOT in this PR.

### Lifecycle blocking (existing baseline applies)

- Active actor + active target: normal evaluation.
- Suspended actor: cannot initiate Invoice Run creation, Invoice Approval, vendor reconciliation upload, or QuickBooks handoff requests.
- Pending Setup actor: cannot initiate invoice-affecting actions.
- Inactive actor: cannot initiate invoice-affecting actions.
- Suspended target company (admin-on-behalf scenarios): blocked unless CIXCI System Admin override applies per existing PR #103 baseline.
- Inactive target: actor MAY access historical Invoice Runs / Invoices / Reconciliation Uploads per existing baseline lifecycle blocking rules.

### Service identity authority

- Service identity Invoice Run actions: use existing Tenant API integration user authority.
- Service identity QuickBooks Sync Reference Recording: use existing Tenant API integration user authority; Integration Management owns the transport.
- Service identity actions require registered scope and expiring credentials.
- Service identity actions are logged via existing Logs & Audit discipline.
- Service identity actions do NOT use `service_identity.audit_export` (which is for compliance audit report exports per PR #103); they use existing Tenant API integration user authority for invoice scope.

### Admin-on-behalf authority

- CIXCI System Admin invoice approval, reconciliation exception acknowledgment, and QuickBooks handoff requests use existing admin authority.
- Vendor reconciliation upload performed by CIXCI on behalf of a vendor (e.g., manual paste-in by billing person) uses existing Tenant Company act-on-behalf authority.
- Admin-on-behalf actions are logged via existing Logs & Audit discipline with `actor_reference` recorded.
- Open business decision: whether explicit vendor consent is required IN ADDITION to act-on-behalf authority for vendor reconciliation upload (default per PR #103: act-on-behalf sufficient unless tenant policy requires explicit consent).

### Vendor payment authority (locked default)

- **CIXCI MUST NOT execute automatic vendor payment by default.** The billing person reviews and submits payment FROM QuickBooks.
- Auto-payment is FORBIDDEN by default and would require a future approved auto-payment workflow with additional controls (e.g., explicit per-vendor enablement, per-amount thresholds, dual-approval).
- This boundary is locked here, in `boundary-contracts.md`, in `spec.md`, and in `workflows.md` (Workflow 19).

### CIXCI System Admin Invoice Run authority

- Only CIXCI System Admin creates an Invoice Run by default.
- Buyer / vendor actors can READ their own invoices / reports / reconciliation uploads per existing buyer / vendor capabilities.
- Cross-counterparty reads are architecturally guarded by counterparty scope keys.

### Capability propagation latency

- Capability changes during in-flight invoice generation / approval / handoff are governed by existing PR #103 Workflow 12 discipline (active session / saved search authority recheck).
- Next `check_access` call re-evaluates current capability assignment.
- Concrete propagation latency is implementation.

### Reconciliation exception approval

- Open business decision: which actors can approve reconciliation exceptions (CIXCI System Admin by default; possibly vendor-side actor with admin-on-behalf approval).
- Default per scoping: CIXCI System Admin approves; admin-on-behalf scenarios require existing Tenant Company act-on-behalf authority.

### What this permissions section intentionally does NOT introduce

- No new audit capabilities.
- No new buyer-facing capabilities.
- No new vendor-facing capabilities.
- No new role bundles.
- No new service identity profiles.
- No use of `audit_export.*` for invoice / reconciliation / handoff actions.
- No new tenant-scoped permission structures.
- No concrete permission UI or admin assignment flow.
- No concrete notification surface for capability changes affecting in-flight Invoice Runs (future Notification Platform coordination).
- No counterparty-scope enforcement at the permissions layer beyond what existing Tenant Company `check_access` already provides. The counterparty scope (buyer / vendor / company / billing profile) is enforced at the DATA-MODEL layer in `data-model.md`; the permissions layer enforces who can create / read / approve / handoff.
