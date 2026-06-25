# Product Catalog Permissions

This document is proposal-level architecture. Tenant Company owns user, role, company/entity, relationship, channel, buyer account status, act-on-behalf, and permission authority. Product Catalog consumes those inputs for catalog actions and must not infer eligibility independently.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, export confirmation, confirmation-line eligibility, export apply disposition, Stop Selling, admin buyer context, and related permission evidence.

## Roles

Proposal-level roles:

- Vendor catalog manager.
- Vendor catalog viewer.
- Buyer catalog viewer.
- Buyer catalog activator/exporter.
- Buyer accessory discovery user.
- Buyer accessory export confirmer.
- Buyer selling manager.
- Buyer purchasing entry-point user.
- System admin.
- Catalog reviewer.
- Integration service account.
- AI-assisted review service placeholder.

## Permission Sets

Product Catalog permissions should cover:

- Create/import product records.
- Update product records.
- Manage vendor-submitted accessory facts.
- Manage structured attributes, colors, variants, and taxonomy assignments.
- Manage lifecycle state.
- Manage availability state.
- Manage Release Date, Launch Date, EOL Date, and archival references.
- Manage compatibility mappings.
- Select compatibility Add, Replace, or Selective Remove mode.
- View catalog-carried pricing inputs.
- View Pricing-provided buyer-facing price/snapshot references where authorized.
- Manage media/content attachment references.
- View accessory discovery results.
- Search/filter accessories in authorized buyer scope.
- Create/update accessory selection sets.
- Create, recheck, cancel, or confirm accessory export confirmations.
- Apply eligible accessory export confirmation lines.
- Activate/download/export products for buyer use.
- Use Latest Accessories filter/export.
- Manage Buyer Selling Status.
- Stop Selling individual or bulk accessories where allowed.
- View System Admin buyer context.
- Request or execute act-on-behalf actions where Tenant Company authority allows.
- View Accessory Details actions.
- View retail/sales channel eligibility.
- Review import failures and correction records.
- View catalog health dashboards.
- View catalog audit/change history references.

## Tenant Boundaries

- Vendor users may manage only authorized vendor-scoped product records.
- Buyer users may view, search/filter, select, export, activate, or stop selling products only within authorized buyer, parent, child entity, channel, and relationship scopes.
- System Admin access should be scoped by Tenant Company authority and audit requirements.
- System Admin buyer context is read-only unless Tenant Company evidence grants explicit act-on-behalf authority.
- Integration service accounts must be scoped to source module, tenant/entity, vendor/buyer, and operation type.
- Cross-tenant catalog search, export, activation, buyer selling, or admin actions are denied by default unless explicitly approved for internal roles.

## Destructive Or High-Risk Actions

High-risk Product Catalog actions require explicit permission, preview/impact summary where applicable, reason, and audit evidence.

Examples:

- Compatibility Replace or Selective Remove.
- Lifecycle transition to End of Life or Archived.
- Bulk availability update.
- EOL sell-through policy change.
- Buyer access/visibility bulk change.
- Buyer Selling Status bulk change.
- Bulk Stop Selling.
- Applying accessory export confirmations where confirmation lines include warning or review-required state.
- Product media attachment replacement.
- Identifier/SKU mapping correction.
- Locked field override.
- Import destructive action mode.

## Buyer Product Actions

Accessory Details and accessory discovery actions should be shown only when Tenant Company permissions and company configuration allow.

Actions may include:

- Export/download product.
- Add to selling catalog.
- Create accessory selection set.
- Confirm accessory export.
- Stop selling.
- Create purchase order.
- Add to existing purchase order.
- View compatibility.
- View media.
- View Pricing-provided price/snapshot reference.
- View availability.
- View lifecycle.

Procurement owns PO creation and PO lifecycle. Product Catalog may expose action entry points only.

## Accessory Discovery Permission Evidence

Product Catalog should preserve permission/scope evidence references on:

- Buyer Accessory Discovery Context.
- Buyer Accessory Search / Filter State where persisted or audit-worthy.
- Buyer Accessory Selection Set.
- Accessory Export Confirmation Record.
- Accessory Export Confirmation Line.
- Product Catalog export apply disposition.
- Buyer accessory relationship state changes.
- Stop Selling and bulk Stop Selling actions.
- Admin Buyer Context View.
- Act-on-behalf request references.

Missing, stale, conflicting, or insufficient Tenant Company permission evidence should block the action or route it to review. Product Catalog must not infer buyer account status, relationship scope, act-on-behalf authority, or permissions independently.

## Admin Overrides

Admin overrides may be allowed for catalog correction, visibility repair, compatibility repair, import failure resolution, lifecycle repair, availability correction, EOL/sell-through review, accessory export confirmation line review, buyer relationship repair, or buyer context act-on-behalf flow where Tenant Company and Product Catalog rules allow.

Admin overrides should capture:

- Override actor.
- Role/entity scope.
- Override reason.
- Source evidence.
- Affected records.
- Before/after summary.
- Audit reference.

## AI Permissions

AI Agent Services may recommend corrections, cleanup, compatibility review, pricing validation review, image quality review, buyer opportunity review, or promotion planning signals.

AI must not mutate Product Catalog records, apply corrections, change Buyer Selling Status, select destructive modes, confirm imports, confirm exports, apply confirmation lines, or execute Stop Selling without approved action contracts and permissions.

## Audit Requirements

Audit-ready actions include:

- Product creation/update.
- Lifecycle, availability, release/launch, EOL, and archival changes.
- Compatibility Add/Replace/Remove.
- Pricing input changes.
- Color/variant changes.
- Image/media attachment changes.
- Buyer visibility and activation/download changes.
- Buyer accessory discovery context access where sensitive.
- Buyer accessory selection, export confirmation, confirmation-line recheck/apply, export apply disposition, and Latest Accessories baseline changes.
- Buyer export/download and Latest Accessories timestamp changes.
- Buyer Selling Status changes.
- Stop Selling and bulk Stop Selling.
- System Admin buyer context view and act-on-behalf request.
- Import corrections and failed reviews.
- Admin overrides and destructive actions.

Logs & Audit owns immutable audit evidence. Product Catalog owns catalog change history/source state.

## Buyer Product Export Job Foundation Authority Notes

This section documents authority notes for the Buyer Product Export Job Foundation. All authority decisions flow through Tenant Company `check_access` per existing baseline. **This PR introduces NO new tenant capabilities, NO new role bundles, and NO new service identity profiles.** The existing Tenant Company buyer / company / entity capability set is sufficient.

### Authority discipline (locked)

- Tenant Company `check_access` is the canonical authority surface for all Buyer Product Export Job actions (Job creation, Job cancellation, Job retry / reprocess, admin-on-behalf, raw export file download where applicable).
- Buyer-facing actions (initiating Add Accessory, multi-select, select-all-visible, select-all-filtered, etc.) use existing buyer / company / entity capabilities.
- System / admin actions (`admin_on_behalf` trigger kind) require Tenant Company act-on-behalf authority per existing baseline.
- Service identity actions (scheduled jobs, retry processors, reprocess processors) use existing Tenant API integration user authority, scoped + expiring + logged per existing baseline.
- Lifecycle blocking applies: suspended / pending / inactive companies cannot exercise export Job actions per existing Tenant Company baseline.
- All authority decisions are logged via existing Logs & Audit PR-D hardened Audit Access Record discipline.

### Tenant Company `audit_export.*` non-use (locked)

Product Catalog must NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for normal buyer product exports unless future Tenant / Product capability coordination explicitly says so. Rationale:

- The `audit_export.*` family (5 capabilities: `create`, `view`, `download`, `approve_raw_export`, `view_export_history`) governs COMPLIANCE / audit report exports per Logs & Audit PR-E Audit Report Export Record.
- Buyer product exports are a different surface with different consumer (buyer's internal system, not compliance / audit reviewer) and different authority (buyer / company / entity, not compliance reviewer role bundle).
- Conflating the two would silently grant compliance-audit-export capabilities to buyer-facing actors or vice versa, which is exactly the silent-misbehavior failure mode the architecture is designed to prevent.

This boundary is locked here and in `boundary-contracts.md`. Future Tenant / Product capability coordination MAY introduce explicit product-export capabilities (e.g., `buyer_product_export.create`, `buyer_product_export.cancel`, `buyer_product_export.admin_on_behalf`); not in this PR.

### Lifecycle blocking (existing baseline applies)

- Active actor + active target: normal evaluation.
- Suspended actor: cannot create Jobs, cancel Jobs, retry Jobs, or reprocess Jobs.
- Pending Setup actor: cannot create Jobs.
- Inactive actor: cannot create Jobs.
- Suspended target company (when the export targets a child tenant in admin-on-behalf scenarios): blocked unless CIXCI System Admin override applies per existing PR #103 baseline.
- Inactive target: actor MAY access historical export records per existing baseline lifecycle blocking rules.

### Service identity authority

- Service identity Jobs (scheduled, retry processors, reprocess processors): use existing Tenant API integration user authority.
- Service identity Jobs require registered scope and expiring credentials per existing baseline.
- Service identity Jobs are logged via existing Logs & Audit discipline.
- Service identity Jobs do NOT use `service_identity.audit_export` (which is for compliance audit report exports per PR #103); they use existing Tenant API integration user authority for buyer / company / entity scope.

### Admin-on-behalf authority

- `admin_on_behalf` trigger kind requires explicit Tenant Company act-on-behalf authority per existing baseline.
- Open business decision: whether System Admin can self-initiate exports without explicit buyer consent. Default NO; tenant policy may override.
- Admin-on-behalf actions are logged via existing Logs & Audit discipline.

### Cancel-after-processing authority

- Open business decision: whether buyer can cancel a Job after processing begins.
- Default: YES with a bounded grace window; concrete window is implementation / business decision.
- Cancel action requires the same authority as Job creation; admins may cancel admin-on-behalf Jobs they initiated.

### Capability propagation latency

- Capability changes during an in-flight Job are governed by existing PR #103 Workflow 12 discipline (active session / saved search authority recheck): the next `check_access` call re-evaluates current capability assignment.
- Implementations MAY proactively invalidate in-flight Jobs on capability revocation; not required.
- Concrete propagation latency is implementation.

### What this permissions section intentionally does NOT introduce

- No new audit capabilities.
- No new role bundles.
- No new service identity profiles.
- No use of `audit_export.*` for buyer product exports.
- No new tenant-scoped permission structures.
- No concrete permission UI or admin assignment flow.
- No concrete notification surface for capability changes affecting in-flight Jobs (future Notification Platform coordination).
- No buyer-scope triad enforcement at the permissions layer beyond what existing Tenant Company `check_access` already provides. The buyer-scope triad is enforced at the DATA-MODEL layer in `data-model.md`; the permissions layer enforces who can initiate / cancel / retry Jobs.

## Buyer-Scoped Compatibility Projection Authority Notes

This section documents authority notes for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation (Product Catalog side). All authority decisions flow through Tenant Company `check_access` per existing baseline. **This PR introduces NO new tenant capabilities, NO new role bundles, and NO new service identity profiles.** The existing Tenant Company buyer / company / entity capability set is sufficient.

### Authority discipline (locked)

- Tenant Company `check_access` is the canonical authority surface for all Product Catalog projection / impact actions:
  - Read projection (buyer / admin per existing buyer / company / entity capabilities).
  - Trigger recalculation (typically system / service identity per existing service identity profile; buyer / admin may explicitly request refresh per implementation).
  - Acknowledge Buyer Accessory Compatibility Impact Record (buyer / admin).
  - System Admin Buyer Context projection view (existing System Admin Buyer Context discipline extends to projection scope).
- Buyer-facing actions use existing buyer / company / entity capabilities.
- Admin actions (admin-on-behalf impact acknowledgment, projection review override) use existing Tenant Company admin capabilities per existing baseline.
- Service identity actions (scheduled recalculation, projection failure recovery) use existing Tenant API integration user authority.
- Lifecycle blocking applies per existing PR #103 baseline (suspended / pending / inactive cannot exercise projection-affecting actions).
- All authority decisions are logged via existing Logs & Audit PR-D hardened Audit Access Record discipline.

### Tenant Company `audit_export.*` non-use (locked)

Product Catalog MUST NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for projection, impact, or any compatibility-related buyer-facing action unless future Tenant / Product capability coordination explicitly says so. Rationale:

- `audit_export.*` governs COMPLIANCE / audit report exports per Logs & Audit PR-E Audit Report Export Record.
- Compatibility projection and impact recording are buyer-facing operational surfaces with different consumer (buyer, not compliance reviewer) and different authority (buyer / company / entity, not compliance reviewer role bundle).
- Conflating the two would silently grant compliance-audit-export capabilities to buyer-facing actors or vice versa.

This boundary is locked here and in `boundary-contracts.md`. Future Tenant / Product capability coordination MAY introduce explicit projection-specific capabilities (e.g., `buyer_compatibility_projection.read`, `buyer_compatibility_projection.refresh`, `buyer_compatibility_impact.acknowledge`); NOT in this PR.

### Lifecycle blocking (existing baseline applies)

- Active actor + active target: normal evaluation.
- Suspended actor: cannot trigger recalculation, acknowledge impact, or override projection state.
- Pending Setup actor: cannot initiate compatibility-affecting actions.
- Inactive actor: cannot initiate compatibility-affecting actions.
- Suspended target company (admin-on-behalf scenarios): blocked unless CIXCI System Admin override applies per existing PR #103 baseline.
- Inactive target: actor MAY access historical projection / impact records per existing baseline lifecycle blocking rules.

### Service identity authority

- Service identity recalculation: uses existing Tenant API integration user authority per existing baseline.
- Service identity recalculation requires registered scope and expiring credentials.
- Service identity recalculation is logged via existing Logs & Audit discipline.
- Service identity recalculation does NOT use `service_identity.audit_export` (which is for compliance audit report exports per PR #103); it uses existing Tenant API integration user authority for buyer / company / entity scope.

### Admin-on-behalf authority

- Admin acknowledgment of Buyer Accessory Compatibility Impact Record on behalf of buyer requires Tenant Company act-on-behalf authority per existing baseline.
- Open business decision: whether explicit buyer consent is required IN ADDITION to act-on-behalf authority for projection-affecting My Devices changes; default per PR #103: act-on-behalf authority sufficient unless tenant policy requires explicit consent.
- Admin-on-behalf actions are logged via existing Logs & Audit discipline.

### System Admin Buyer Context projection view

- Existing System Admin Buyer Context allows admin to view the system as a selected buyer would view it.
- This PR extends the discipline: System Admin Buyer Context view of the projection respects the SELECTED BUYER's projection, NOT a global view (Workflow 12).
- Admin sees what the buyer would see; no projection scope leakage.
- Admin access to projection / impact records is logged via existing Logs & Audit Audit Access Record discipline.

### Capability propagation latency

- Capability changes during in-flight recalculation are governed by existing PR #103 Workflow 12 discipline (active session / saved search authority recheck).
- Next `check_access` call re-evaluates current capability assignment.
- Implementations MAY proactively invalidate in-flight recalculations on capability revocation; not required.
- Concrete propagation latency is implementation.

### Cancel-after-recalculation-start authority

- Buyer / admin MAY request cancellation of a recalculation in progress; default behavior is to allow with bounded grace window per implementation.
- Open business decision: concrete grace window.
- Cancel action requires same authority as recalculation initiation.

### What this permissions section intentionally does NOT introduce

- No new audit capabilities.
- No new buyer-facing capabilities.
- No new role bundles.
- No new service identity profiles.
- No use of `audit_export.*` for projection / impact actions.
- No new tenant-scoped permission structures.
- No concrete permission UI or admin assignment flow.
- No concrete notification surface for capability changes affecting in-flight recalculations (future Notification Platform coordination).
- No buyer-scope triad enforcement at the permissions layer beyond what existing Tenant Company `check_access` already provides. The buyer-scope triad is enforced at the DATA-MODEL layer in `data-model.md`; the permissions layer enforces who can read / refresh / acknowledge.
