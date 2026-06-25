# Fulfillment and Returns Permissions

This document is proposal-level architecture. It defines permission concepts without finalizing role names, entitlement implementation, identity provider behavior, or UI workflows.

## Permission Principles

- Permissions must be tenant-scoped, vendor-scoped, buyer/entity-aware, and operation-specific.
- Tenant Company owns users, roles, company/entity scope, import/export authority, destructive action authority, override authority, schedule/view permissions, and vendor/buyer/manufacturer eligibility.
- Fulfillment and Returns consumes permission/scope references; it must not infer tenant or vendor authority independently.
- Permission to update fulfillment evidence does not imply permission to change routing, order line facts, pricing, invoice state, refund state, Product Catalog records, Device Catalog records, Integration transport, Notification delivery, or Logs & Audit evidence.
- Sensitive tracking, customer-adjacent, pricing, return, refund-adjacent, warranty, and vendor/manufacturer fields should be redacted by role and consumer class.

## Proposal-Level Roles

### System Admin

May:

- Review blocked handoffs, severe fulfillment exceptions, RAN validation failures, repeated import failures, and vendor return disposition conflicts.
- Approve internal operational retries where policy allows.
- View audit references for investigation where Tenant Company scope allows.
- Review high-risk manual overrides for import correction or stale/out-of-order evidence handling.

Must not use Fulfillment permissions to override Pricing, Order Routing, Tenant Company, Product Catalog, Device Catalog, Warranty, Invoice Management, Integration Management, Notification, Logs & Audit, Procurement, Analytics, or AI boundaries.

### Fulfillment Operations User

May:

- View assigned fulfillment handoffs, handoff dispositions, execution records, shipments, tracking references, import jobs, row results, and exceptions.
- Validate, preview, confirm, or apply vendor fulfillment imports where permitted.
- Record shipment evidence where source authority allows.
- Create or update operational review records.
- Retry operational failures within retry budget.

Must not change locked order fields, choose routes, recalculate price, or deliver buyer updates externally.

### Returns Operations User

May:

- View assigned return exports, return imports, RAN validation results, return operational disposition evidence, return receipt/condition evidence, and return exceptions.
- Validate, preview, confirm, or apply vendor return imports where permitted.
- Record operational return disposition and vendor-provided refund/adjustment evidence references where authorized.
- Execute replacement shipment after approved replacement signal is present.

Must not approve warranty claims, issue refunds, apply credits, process payments, or alter invoice lifecycle unless a future owning context grants that through a separate workflow.

### Vendor / Manufacturer Integration Role

May:

- Submit or update fulfillment evidence for authorized vendor/manufacturer fulfillment targets.
- Provide tracking references where authorized.
- Submit return operational disposition evidence for authorized RANs/returns.
- View only scoped operational records tied to that vendor/manufacturer relationship.

Must not see unrelated buyer/entity data, price values, tenant hierarchy, routing policy internals, invoice state, or final refund/payment outcomes unless explicitly authorized.

### Vendor / Manufacturer Manual User

May:

- Download or upload fulfillment/return files only where Tenant Company permission and source-module workflow allow.
- View import previews, row errors, warnings, and correction prompts for scoped files.
- Confirm import apply only where the permission model allows manual confirmation.

Must not bypass preview/confirmation, locked field rules, blank field protection, RAN validation, or update-only protection.

### Buyer Operations Role

May:

- View buyer/entity-scoped shipment and operational return status where authorized.
- View buyer-safe tracking references where authorized.
- Initiate or reference return/warranty workflows through buyer-facing modules where assigned.

Must not update vendor/manufacturer fulfillment execution unless a future workflow explicitly assigns buyer-managed fulfillment responsibilities.

### Internal Service Role

May:

- Order Routing may create handoff request references and consume disposition references.
- Integration Management may provide transport/receipt references and consume buyer-update-ready references.
- Notification Platform Service may consume event trigger references.
- Logs & Audit may consume file/import/export/audit summaries and evidence references.
- Pricing may consume vendor refund/adjustment evidence references where authorized.
- Invoice Management may consume shipment, delivery, return, and financial-adjacent evidence references where authorized.
- Analytics and AI Agent Services may consume redacted events or signals.

Service roles should use least-privilege contracts and consumer-specific redaction.

## Permission Families

- `fulfillment.handoff_disposition.read`
- `fulfillment.handoff_disposition.record`
- `fulfillment.execution.read`
- `fulfillment.vendor_import.create`
- `fulfillment.vendor_import.validate`
- `fulfillment.vendor_import.preview`
- `fulfillment.vendor_import.confirm`
- `fulfillment.vendor_import.apply`
- `fulfillment.vendor_import.error_report.read`
- `fulfillment.shipment.read`
- `fulfillment.shipment.evidence.record`
- `fulfillment.tracking.validate`
- `fulfillment.tracking.reference.create`
- `fulfillment.status.update`
- `fulfillment.buyer_update.signal`
- `return.vendor_export.eligibility.create`
- `return.vendor_export.batch.create`
- `return.vendor_export.manual_download.record`
- `return.vendor_import.create`
- `return.vendor_import.validate`
- `return.vendor_import.preview`
- `return.vendor_import.confirm`
- `return.vendor_import.apply`
- `return.vendor_import.error_report.read`
- `return.ran.validate`
- `return.disposition.record`
- `return.vendor_refund_evidence.record`
- `return.buyer_update.signal`
- `replacement.shipment.create`
- `fulfillment.exception.read`
- `fulfillment.exception.review`
- `fulfillment.exception.retry`
- `fulfillment.audit_reference.read`

## Approval Guardrails

Proposal-level actions that should require elevated approval, explicit source-module support, or review:

- Applying a fulfillment import with warning rows.
- Applying a return import with warning rows.
- Overriding locked field validation.
- Applying a correction/reupload after source state changed.
- Reopening a delivered shipment.
- Marking a shipment delivered without vendor/carrier evidence.
- Accepting stale or out-of-order status evidence.
- Resolving duplicate tracking references.
- Applying return disposition with conflicting RAN evidence.
- Recording vendor refund/adjustment evidence with conflict against Pricing/Invoice evidence.
- Creating a replacement shipment.
- Retrying exhausted import, handoff, or carrier/vendor failures.
- Viewing customer-sensitive tracking or refund-adjacent details.

## Boundary Restrictions

Fulfillment permissions must not grant:

- Route reassignment authority.
- Vendor order export eligibility authority.
- Price calculation or adjustment pricing authority.
- Refund, payment, credit, invoice, or settlement authority.
- Tenant eligibility approval.
- Product/device/media source-record editing.
- Warranty claim approval.
- Integration transport retry or provider callback authority.
- Notification template/delivery authority.
- Logs & Audit evidence mutation authority.
- Analytics metric or AI action authority.

## Audit Requirements

Every permissioned mutation should record:

- Actor or service actor.
- Role/permission used.
- Tenant scope.
- Vendor and buyer/entity scope where applicable.
- Affected record.
- Import/export job or batch reference where applicable.
- Row identity where applicable.
- Before/after summary where safe.
- Reason or review note where required.
- Timestamp.
- Correlation id.
- Audit reference.

## Open Questions

- Which roles exist at launch versus future refinements?
- Which vendor manual users can confirm imports versus upload-only?
- Which return disposition and refund-adjacent fields are redacted by default?
- Which import warning classes require System Admin approval?
- Which fields can ever be explicitly cleared through Fulfillment/Returns imports?

## Vendor Fulfillment Response SLA Authority (PR-A)

PR-A introduces authority operationalization for the SLA evaluation surface. PR-A does not modify any existing Fulfillment / Returns authority class. PR-A introduces (or extends, per existing taxonomy) two authority concerns: SLA Configuration Authority and SLA Override Authority.

**Existing Fulfillment / Returns authority taxonomy is the preferred starting point.** If the existing taxonomy provides an authority class that naturally extends to cover SLA Configuration and SLA Override (e.g., a generic Fulfillment / Returns Admin Authority that already gates Fulfillment Import validation, Shipment / Tracking review, and similar admin actions), PR-A extends that taxonomy. If no existing class fits the SLA semantics, PR-A introduces SLA Override Authority and SLA Configuration Authority as distinct classes.

The bundle reviewer should determine, from the current `permissions.md` content, whether extension or distinct-class is the right approach. Either way, the **semantics described below are required regardless of class structure.**

### SLA Configuration Authority

**Purpose:** Authority to create, edit, supersede, or retire Vendor Fulfillment Response SLA Policy records.

**Required for:**

- Creating a new SLA Policy.
- Editing an active SLA Policy (which produces a new Policy version per Workflow 1).
- Retiring an SLA Policy.
- (Optionally per existing Fulfillment / Returns admin patterns) viewing the SLA Policy history.

**Phase 1 holders:** CIXCI System Admin.

**Excluded:** vendor users (no vendor self-service Policy editing in Phase 1).

**Resolution mechanism:** Tenant Company `check_access` per the platform standard.

### SLA Override Authority

**Purpose:** Authority to create or reverse SLA Override / Excuse Evidence records on Late, Missing, or Partial Fulfillment Import Exceptions.

**Required for:**

- Creating an SLA Override / Excuse Evidence record (Workflow 10).
- Creating a reversing Override Evidence record.
- Transitioning an Exception to `overridden` state (which depends on Override Evidence creation).

**Phase 1 holders:** CIXCI System Admin.

**Excluded:** vendor users (PR-A explicitly excludes vendor self-override).

**Resolution mechanism:** Tenant Company `check_access`.

### SLA Breach Review actions and authority

**Workflow 9 (SLA Breach Review)** transitions Exceptions through `open → under_review → (resolved | overridden | closed)`. The authority gating depends on the transition:

- `open → under_review` — requires SLA Override Authority **or** an equivalent existing Fulfillment / Returns review authority (per existing permissions.md taxonomy). The transition acknowledges the Exception for investigation; PR-A treats this as a review action that any authorized reviewer may perform.
- `under_review → resolved` — requires the same authority as acknowledgement. Closure as resolved indicates the breach is acknowledged operationally; no override is granted.
- `under_review → overridden` — requires **SLA Override Authority specifically** (not a substitute review authority). Override transitions consume an SLA Override / Excuse Evidence record per Workflow 10.
- `under_review → closed` — requires the same authority as acknowledgement. Closure indicates operational reason (duplicate, cancelled suborder, etc.).
- Reopening (terminal → `under_review`) — requires the same authority as acknowledgement.

### Distinct failure modes

PR-A defines two distinct authority-related failure modes. **They are not interchangeable.**

#### `SLA_OVERRIDE_AUTHORITY_REQUIRED`

The actor attempted an action requiring SLA Override Authority (or SLA Configuration Authority for Policy actions) but does not hold the required class.

**Fires for:**

- An actor without SLA Override Authority attempts to create SLA Override / Excuse Evidence.
- An actor without SLA Override Authority attempts to transition an Exception to `overridden`.
- An actor without SLA Configuration Authority attempts to create, edit, supersede, or retire an SLA Policy.
- An actor without SLA Override Authority attempts a reversing Override Evidence.

**Behavior:** the action is rejected. No Exception state transition occurs. No Override Evidence record is created. No Policy state transition occurs.

#### `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`

The actor holds the required authority but the Override Evidence record being created lacks required audit-bearing content.

**Fires for:**

- Missing `actor_reference`, `timestamp`, `affected_exception_reference`, `reason_category`, `reason_text`, or `audit_reference` on an attempted Override Evidence creation.
- An override action that does not produce a corresponding Override Evidence record (process violation).

**Behavior:** the override action is rejected. The actor is informed of the missing evidence. The Exception remains in `under_review`.

**Critical:** these two failure modes are not mixed. `SLA_OVERRIDE_AUTHORITY_REQUIRED` is an authority-class failure; `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING` is an audit-content failure. An actor may hold the authority and still produce an audit-content failure; an actor may produce complete audit content and still fail authority resolution. Validation rules and error paths treat these distinctly.

### Vendor user exclusion

Vendor users are explicitly excluded from:

- Creating, editing, superseding, or retiring SLA Policies.
- Creating SLA Override / Excuse Evidence on any Exception.
- Reversing prior SLA Override / Excuse Evidence.
- Transitioning Exceptions to `overridden`.
- Resolving or closing Exceptions on their own behalf.

Vendor users may continue to perform existing vendor-permitted actions (fulfillment imports via Integration Management, return processing, etc.) per existing Fulfillment / Returns permissions. **PR-A introduces no vendor-facing SLA actions.**

### Authority extension guidance

If the existing Fulfillment / Returns permissions taxonomy provides:

- A "Fulfillment Returns Admin Authority" or equivalent that already covers admin-level Fulfillment Import review actions → SLA Configuration Authority and SLA Override Authority can be modeled as extensions of that class. The bundle reviewer should confirm by reading the existing taxonomy.
- A "Review Authority" or equivalent that covers exception review across Fulfillment / Returns → SLA Breach Review acknowledgement (`open → under_review`) can route to that class.

If no existing classes fit:

- SLA Configuration Authority and SLA Override Authority are introduced as distinct classes per this PR-A append-block.

Either approach satisfies the discipline: authority flows through Tenant Company `check_access`; CIXCI System Admin holds the relevant authority in Phase 1; vendor users are excluded; the two failure modes are distinct.

### What PR-A does NOT change in `permissions.md`

- Does not modify any existing authority class definition.
- Does not modify existing Fulfillment / Returns read-access permissions.
- Does not introduce notification authority (Notification Platform Service territory).
- Does not introduce analytics authority (Analytics / Reporting territory).
- Does not introduce Order Routing-related authority (Order Routing files are not modified).
- Does not introduce invoice / payment / pricing authority.
- Does not contract API-surface authority enforcement (deferred to Boundary/Handoff PR or future contracts-PR).
## Delivery Date Override / Correction Authority (PR-B)

PR-B introduces authority gating for Delivery Date Correction Evidence and for manual Buyer Update-Ready Signal hold actions. Authority resolution flows through Tenant Company `check_access` per the established pattern from PR #91 (Export Schedule Authority) and PR #92 (SLA Override Authority).

### Authority class direction

Two options are available during bundle review based on the current state of `permissions.md`:

- **Option A (preferred when existing taxonomy supports extension):** extend an existing Fulfillment / Returns authority class that already covers shipment-state corrective actions. The extension adds the specific scopes needed for Delivery Date Correction Evidence application and manual Buyer Update-Ready Signal hold actions.
- **Option B (when no existing class fits):** introduce a distinct **Delivery Date Override / Correction Authority** class. The class is held by CIXCI System Admin in Phase 1 and excludes vendor users.

The applier confirms direction during bundle drafting by inspecting the current `permissions.md` content. The conservative default is Option B; deviation requires explicit evidence from existing taxonomy.

### Authority scope (Phase 1)

The authority covers:

- Application of Delivery Date Correction Evidence in `proposed` state, transitioning it to `applied` (Workflow 6 step 5).
- Rejection of Delivery Date Correction Evidence in `proposed` state, transitioning it to `rejected` (Workflow 6 steps 2-4 when authority is exercised to deny).
- Creation of Buyer Update-Ready Signal records in `held_manual` state (Workflow 9 / Workflow 11; manual hold by System Admin).
- Release of Buyer Update-Ready Signal records from `held_manual` state (Workflow 11).

The authority does not cover:

- Direct mutation of Delivery Date Evidence in terminal state. Terminal records are immutable; corrections produce new records via Delivery Date Correction Evidence.
- Override of `rejected_*` Delivery Date Evidence outcomes outside the correction flow. The correction flow is the only path; ad-hoc override is not introduced by PR-B.
- Modification of any PR #92 SLA entity, event, or contract. SLA semantics are preserved per the boundary-contracts.md PR #92 SLA-semantics preservation invariant.
- Modification of any Order Routing record, event, or contract.
- Vendor self-service actions of any kind. Vendor users are explicitly excluded from this authority.

### Authority resolution

Authority is resolved through Tenant Company `check_access` consultation. The flow is:

1. Workflow 6 (Delivery Date Correction Evidence) or Workflow 9 / Workflow 11 (manual hold actions) requests authority resolution for the proposed action.
2. Tenant Company `check_access` evaluates the requesting actor's role, scope, and Tenant Company-level permissions.
3. Resolution produces an authority decision: present or absent.
4. The action proceeds (if present) or transitions to a rejection terminal state (if absent).

The authority resolution is recorded as an `authority_reference` on the Delivery Date Correction Evidence record (and analogously on Buyer Update-Ready Signal manual-hold transitions). This reference distinguishes the authority decision from the supporting evidence reference.

### Distinct failure modes

PR-B enforces distinct failure mode vocabulary. Authority-missing and audit-evidence-missing are never mixed; each has a specific failure code:

- **`DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED`** - Workflow 6 step 2 rejects a Delivery Date Correction Evidence transition to `applied` because the requesting actor lacks the Delivery Date Override / Correction Authority via Tenant Company `check_access`. The correction evidence transitions to `rejected` with this failure code.
- **`DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`** - Workflow 6 step 4 rejects a Delivery Date Correction Evidence transition to `applied` because required supporting evidence (per Phase 1 policy) is absent. The correction evidence transitions to `rejected` with this failure code.
- **`BUYER_UPDATE_MANUAL_HOLD_AUTHORITY_REQUIRED`** - Workflow 9 or Workflow 11 rejects a manual hold action because the requesting actor lacks the relevant authority. The Buyer Update-Ready Signal is not transitioned; the rejection is audited.

These failure modes are explicit and never collapsed. An audit record showing one of these codes is unambiguous about which gate failed.

### Vendor user exclusion (Phase 1 reaffirmation)

Vendor users are explicitly excluded from the Delivery Date Override / Correction Authority in Phase 1. Specifically:

- Vendor users cannot create Delivery Date Correction Evidence for Shipment Lines in Delivered state.
- Vendor users cannot transition Delivery Date Correction Evidence from `proposed` to `applied` or `rejected`.
- Vendor users cannot create Buyer Update-Ready Signal records in `held_manual` state.
- Vendor users cannot release Buyer Update-Ready Signal records from `held_manual` state.
- Vendor users cannot override `rejected_*` Delivery Date Evidence outcomes via any path.

A vendor that disputes a `rejected_*` Delivery Date Evidence outcome routes the dispute through CIXCI System Admin review. The System Admin, holding the Delivery Date Override / Correction Authority, may produce a Delivery Date Correction Evidence in `proposed` state via Workflow 6 path 6b. The correction's outcome is determined by the standard Workflow 6 steps.

### Audit discipline

Every authority-gated transition produces an audit reference. The audit record includes:

- The requesting actor.
- The Tenant Company `check_access` decision.
- The proposed action (correction application, correction rejection, manual hold, manual hold release).
- The resulting state transition (or rejection).
- The specific failure code if applicable.

Audit references are produced by Fulfillment / Returns. Retention is owned by Logs & Audit per the boundary-contracts.md Logs & Audit section. PR-B does not specify retention duration or storage.

### Future authority evolution

Phase 1 is conservative. Future PRs may broaden the authority taxonomy additively to cover:

- Delegation of correction authority to non-System-Admin roles within CIXCI.
- Vendor-side dispute submission paths (not direct correction authority).
- Buyer-side authority for any buyer-update-ready actions (deferred to a future Integration Management / Buyer Integration Profile hardening PR).
- AI agent authority for automated correction or hold actions (deferred to future AI Agent Services scope).

PR-B does not anticipate any of these in the authority class definition. Future PRs introduce them additively.
