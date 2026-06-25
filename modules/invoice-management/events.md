# Invoice Management Events

This document is proposal-level architecture. Event names and payloads are not final implementation contracts.

## Event Principles

- Events describe Invoice Management state or requests only.
- Events should carry source evidence references rather than recalculated values.
- Events must not imply Invoice Management owns Pricing calculation, fulfillment delivery truth, return operational disposition, Procurement accepted-price truth, Integration transport, Notification delivery, or Logs & Audit evidence.
- Sensitive invoice access/export events should support Logs & Audit and Tenant Company redaction/access review.

## Core Events

- `invoice.eligibility-evidence.created`
- `invoice.eligibility.blocked`
- `invoice.line.blocked.missing-evidence`
- `invoice.line.blocked.non-bindable-source-evidence`
- `invoice.preview.created`
- `invoice.generated`
- `invoice.finalized`
- `invoice.regeneration.requested`
- `invoice.regeneration.superseded`
- `invoice.adjustment.created`
- `invoice.adjustment.review-required`
- `invoice.adjustment.evidence-accepted`
- `invoice.adjustment.amount-blocked`
- `invoice.status.updated`

## Source Evidence Events

- `invoice.source-evidence.stale`
- `invoice.source-evidence.superseded`
- `invoice.source-evidence.ignored`
- `invoice.source-evidence.conflict-detected`
- `invoice.source-evidence.non-bindable`

These events should identify the source module, source reference id, source record version/hash, source timestamp, source disposition, applied-vs-ignored state, supersession reference, and blocked/review state.

## Pricing Evidence Events

- `invoice.pricing-snapshot.missing`
- `invoice.pricing-snapshot.stale`
- `invoice.pricing-snapshot.non-invoice-bindable`
- `invoice.pricing-redaction.blocked`
- `invoice.adjustment-pricing-evidence.missing`
- `invoice.adjustment-pricing-evidence.stale`

These events should reference Pricing snapshot id/version/hash, Pricing Channel, rule/version/hash, commission component references, and redaction/visibility evidence where applicable.

## Fulfillment / Return Evidence Events

- `invoice.delivered-shipment-line-evidence.missing`
- `invoice.delivered-shipment-line-evidence.stale`
- `invoice.return-line-evidence.missing`
- `invoice.return-line-evidence.stale`
- `invoice.vendor-refund-adjustment-evidence.recorded`
- `invoice.vendor-refund-evidence.variance-detected`
- `invoice.return-adjustment.review-required`

Shipment/tracking updates alone should not emit invoice-eligible events without delivered shipment line evidence.

## Procurement / PO Events

- `invoice.po-invoice-bindability.blocked`
- `invoice.po-evidence.missing`
- `invoice.po-evidence.stale`
- `invoice.po-invoice-line.created`

These events must reference Procurement PO/line and Pricing PO invoice-bindable evidence; they must not imply Invoice Management owns accepted PO price truth.

## Export And Access Events

- `invoice.export.created`
- `invoice.export.expired`
- `invoice.export.revoked`
- `invoice.export.superseded`
- `invoice.sensitive.accessed`
- `invoice.sensitive.export-accessed`
- `invoice.redaction-decision.applied`

Export events should carry export schema version, generated at/by, date-basis, Tenant Company scope/version, redaction class/version, Logs & Audit reference, Integration delivery reference, and Notification delivery reference where applicable.

## Reconciliation Events

- `invoice.reconciliation-upload.received`
- `invoice.reconciliation-upload.validated`
- `invoice.reconciliation-upload.reviewed`
- `invoice.reconciliation-mismatch.detected`
- `invoice.reconciliation.review-required`

Reconciliation events are detection/review signals only and must not imply payment settlement or source-record mutation.

## Accounting Sync Events

- `invoice.accounting-sync.requested`
- `invoice.accounting-sync.accepted-reference-recorded`
- `invoice.accounting-sync.failed-reference-recorded`
- `invoice.accounting-sync.review-required`
- `invoice.accounting-sync.duplicate-blocked`
- `invoice.accounting-sync.idempotency-key-reused`
- `invoice.accounting-sync.supersession-requested`
- `invoice.accounting-sync.correction-reference-recorded`

Integration Management owns external accounting delivery/receipt evidence and provider response truth.

## Notification / AI / Analytics Signals

Invoice events may be consumed by Notification Platform Service, AI Agent Services, Analytics / Reporting, Logs & Audit, and Integration Management where authorized. Consumers must apply Tenant Company scope and redaction rules.

## Invoice Management Foundation Event Discipline

This section documents the Invoice Management event discipline for the foundation hardening. **Exactly 11 new Invoice Management events** are introduced (8 base + 3 vendor reconciliation), all discriminator-based and additive to the existing Invoice Management event surface. Existing Invoice Management events are preserved without rename / removal where possible.

### Core discipline

- **Exactly 11 new Invoice Management events introduced.** No more, no less.
- **Discriminator-first design** consistent with PR-D, PR-E, PR #103, PR #104, and PR #105 discipline.
- **No event explosion.** All Invoice / Invoice Run status transitions, adjustment kinds, exception kinds, QuickBooks handoff object kinds, reconciliation upload statuses, and match result statuses are observable via discriminators on the 11 events.
- **Boundary discipline:** Invoice Management emits Invoice Management events for Invoice Management state changes. QuickBooks provider response events are owned by Integration Management. Payment events are owned by QuickBooks (external) and consumed back as REFERENCES via the `quickbooks-handoff.reference-recorded` event's `payment_status_update` discriminator value.
- **Existing Invoice Management events preserved.** No baseline event is renamed or removed (where this PR can determine; future contributors must maintain).

### The 8 base Invoice Management events

#### Event 1 - `invoice-management.invoice-run.requested`

**Emission trigger:** Invoice Run created (Workflow 1).

**Audit-coordination semantics carried:**

- New `invoice_run_id`.
- `invoice_period_reference`.
- `requested_by_actor_reference`.
- Counterparty scope summary.

**Payload context (reference-first):** see `event-contracts.md`.

#### Event 2 - `invoice-management.invoice-run.status-changed`

**Emission trigger:** every Invoice Run status transition.

**Discriminator:** `invoice_run_status` (one of 15 values: `requested`, `collecting_sources`, `validating_reconciliation`, `generating`, `generated`, `completed_with_exceptions`, `pending_review`, `approved`, `queued_for_sync`, `sync_requested`, `synced`, `sync_failed`, `canceled`, `superseded`, `archived`).

**Subsumes (no separate events needed for):**

- Invoice Run requested completed (use `invoice_run_status = generated` discriminator).
- Invoice Run completed with exceptions (use `invoice_run_status = completed_with_exceptions`).
- Invoice Run approved (use `invoice_run_status = approved`).
- Invoice Run failed sync (use `invoice_run_status = sync_failed`).
- Invoice Run canceled / superseded / archived (use respective discriminator value).

#### Event 3 - `invoice-management.invoice.generated`

**Emission trigger:** an Invoice transitions to `generated` for the first time within an Invoice Run.

**Audit-coordination semantics carried:**

- `invoice_id`, `invoice_run_reference`, `invoice_report_reference`.
- `invoice_type`, `counterparty_role`, counterparty scope.
- `invoice_total_snapshot_amount`.

#### Event 4 - `invoice-management.invoice.status-changed`

**Emission trigger:** every Invoice status transition (post-`generated`).

**Discriminator:** `invoice_status` (one of 14 internal values: `draft`, `generated`, `pending_review`, `approved`, `rejected`, `queued_for_sync`, `sync_requested`, `synced`, `sync_failed`, `adjustment_required`, `superseded`, `voided`, `canceled`, `archived`).

**Subsumes (no separate events needed for):**

- Invoice approved (use `invoice_status = approved`).
- Invoice rejected / voided / canceled (use respective discriminator).
- Invoice synced / sync_failed (use respective discriminator).
- Invoice adjustment_required (use `invoice_status = adjustment_required`).

#### Event 5 - `invoice-management.invoice-adjustment.recorded`

**Emission trigger:** an Invoice Adjustment is recorded.

**Discriminator:** `adjustment_kind` (one of: `refund`, `correction`, `late_refund`, `vendor_reconciliation_exception_resolution`, `manual_admin_adjustment`).

**Audit-coordination semantics carried:**

- `invoice_adjustment_id`, parent `invoice_line_reference`, parent `invoice_reference`, `adjusting_invoice_run_reference`.
- `adjustment_amount`, `adjustment_reason_reference`.
- Counterparty scope.

#### Event 6 - `invoice-management.invoice-exception.recorded`

**Emission trigger:** an Invoice Exception Record is created.

**Discriminator:** `exception_kind` (e.g., `missing_quickbooks_mapping`, `missing_commission_snapshot`, `missing_pricing_snapshot`, `missing_delivery_evidence`, `missing_refund_evidence`, `vendor_report_mismatch`, `parent_company_scope_unresolved`, `idempotency_collision`, `source_record_drift`).

**Audit-coordination semantics carried:**

- `invoice_exception_record_id`, `invoice_run_reference`, `invoice_reference` (nullable), `invoice_line_reference` (nullable), `vendor_reconciliation_match_result_reference` (nullable).
- `exception_severity`.

#### Event 7 - `invoice-management.invoice-report-export.recorded`

**Emission trigger:** an Invoice Report export file is generated (Invoice Export / File Reference populated).

**Audit-coordination semantics carried:**

- `invoice_report_id`, `invoice_export_file_reference`, `file_artifact_reference`.
- `exported_by_actor_reference`, `export_timestamp`.

#### Event 8 - `invoice-management.quickbooks-handoff.reference-recorded`

**Emission trigger:** QuickBooks Handoff Reference sub-structure populated (handoff requested OR sync reference recorded post-Integration-Management-dispatch).

**Discriminator:** `quickbooks_handoff_object_kind` (one of: `invoice`, `bill`, `vendor_payable_package`, `payment_status_update`).

**Audit-coordination semantics carried:**

- All `quickbooks_*_reference` fields (REFERENCES, not truth).
- `integration_management_dispatch_reference`.
- Parent `invoice_reference` OR `invoice_report_reference`.

### The 3 vendor reconciliation events

#### Event 9 - `invoice-management.vendor-reconciliation-upload.received`

**Emission trigger:** Vendor Reconciliation Upload Job created (Workflow 16).

**Audit-coordination semantics carried:**

- `vendor_reconciliation_upload_job_id`.
- `vendor_reference`, `company_scope_reference`, `invoice_period_reference`.
- `uploading_actor_reference`.
- `file_evidence_reference` (Logs & Audit File Tracking Record reference).

#### Event 10 - `invoice-management.vendor-reconciliation-upload.status-changed`

**Emission trigger:** every Vendor Reconciliation Upload Job status transition.

**Discriminator:** `reconciliation_upload_status` (one of 10 values: `uploaded`, `validating`, `validated`, `matching`, `reconciled`, `reconciled_with_exceptions`, `failed`, `review_required`, `superseded`, `canceled`).

**Subsumes (no separate events needed for):**

- Validation completed (use `reconciliation_upload_status = validated`).
- Matching completed (use `reconciliation_upload_status = reconciled` or `reconciled_with_exceptions`).
- Failed (use `reconciliation_upload_status = failed`).
- Review required (use `reconciliation_upload_status = review_required`).
- Superseded / canceled (use respective discriminator).

#### Event 11 - `invoice-management.vendor-reconciliation-match.completed`

**Emission trigger:** Vendor Reconciliation Match Result created (per-row matching outcome from Workflow 17).

**Discriminator:** `match_result_status` (one of 13 values: `matched`, `missing_in_vendor_file`, `missing_in_cixci`, `duplicate_in_vendor_file`, `status_mismatch`, `amount_mismatch`, `quantity_mismatch`, `sku_upc_mismatch`, `tracking_mismatch`, `date_mismatch`, `refund_mismatch`, `rejected_reason_mismatch`, `review_required`).

**Audit-coordination semantics carried:**

- `vendor_reconciliation_match_result_id`.
- `vendor_reconciliation_upload_job_reference`, `vendor_reconciliation_upload_row_reference`.
- Matched-side references where applicable.
- Mismatch details where applicable.
- `resulting_invoice_exception_record_reference` (nullable).

**Implementation note:** for high-volume runs, this event MAY be emitted as a batch / summary at the end of matching rather than per individual row; the discriminator and structure are preserved. Concrete batching is implementation.

### Events explicitly NOT introduced

The following proposed events are REJECTED because they would create event explosion. Each is subsumed by a discriminator-based event or owned by another module.

| Proposed event | Status | Subsumed by / Owned by |
|---|---|---|
| `invoice-management.invoice-run.completed` | REJECTED | `invoice-run.status-changed` + `invoice_run_status = generated` / `completed_with_exceptions` |
| `invoice-management.invoice-run.approved` | REJECTED | `invoice-run.status-changed` + `invoice_run_status = approved` |
| `invoice-management.invoice-run.failed` | REJECTED | `invoice-run.status-changed` + `invoice_run_status = sync_failed` |
| `invoice-management.invoice.approved` | REJECTED | `invoice.status-changed` + `invoice_status = approved` |
| `invoice-management.invoice.synced` | REJECTED | `invoice.status-changed` + `invoice_status = synced` |
| `invoice-management.invoice.voided` | REJECTED | `invoice.status-changed` + `invoice_status = voided` |
| `invoice-management.invoice-line.generated` | REJECTED | Per-line event explosion; use `invoice.generated` + result summary |
| `invoice-management.invoice-line.adjusted` | REJECTED | Use `invoice-adjustment.recorded` + `adjustment_kind` |
| `invoice-management.vendor-reconciliation-row.matched` | REJECTED | Per-row event explosion; use `vendor-reconciliation-match.completed` (batched) |
| `invoice-management.vendor-reconciliation-row.failed` | REJECTED | Same |
| `invoice-management.quickbooks.synced` | REJECTED | Use `quickbooks-handoff.reference-recorded` + `quickbooks_handoff_object_kind` + status |
| `invoice-management.quickbooks.provider-response.*` | REJECTED | Integration Management owns provider response events |
| `invoice-management.payment.*` | REJECTED | QuickBooks (external) owns payment events; reference-only via `quickbooks-handoff.reference-recorded` + `payment_status_update` discriminator |
| `invoice-management.analytics.*` | REJECTED | Analytics owns its own event surface |
| `invoice-management.notification.*` | REJECTED | Notification Platform owns delivery events |
| `invoice-management.tax.*` | REJECTED | Tax deferred / CPA / QuickBooks-owned |
| `invoice-management.settlement.*` | REJECTED | Future Settlement / Payout module |
| `invoice-management.vendor-payment-execution.*` | REJECTED | Auto-payment FORBIDDEN by default |

### Status-discriminator-based observability

Invoice / Invoice Run / Reconciliation / Match outcomes are BOTH records AND events:

- **Records:** Invoice, Invoice Run, Vendor Reconciliation Upload Job, Vendor Reconciliation Match Result, Invoice Adjustment, Invoice Exception Record are the sources of truth.
- **Events:** the 11 events above are the observability surfaces.

Subscribers consume events; Logs & Audit indexes records via existing `service_identity.evidence_emit`; UI reads records. There is no information loss between record and event; both surfaces are kept synchronized.

### Existing Invoice Management events preserved (no edits)

Where the existing Invoice Management baseline has events already declared, this PR does NOT rename or remove them. The 11 new events are additive.

### Net Invoice Management event inventory after this PR

- **New Invoice Management events: 11** (8 base + 3 vendor reconciliation).
- Existing Invoice Management events: preserved without modification.
- Existing Tenant Company / Logs & Audit / Integration Management / Notification Platform / Analytics / Order Routing / Fulfillment-Returns / Pricing / Product Catalog / Device Catalog events: preserved by reference; no adjacent file modified.

### Event boundary discipline

- Invoice Management emits Invoice Management events for Invoice Management state changes.
- Order Routing emits Order Routing events for order state changes.
- Fulfillment / Returns emits Fulfillment / Returns events for delivery / refund state changes.
- Pricing emits Pricing events for pricing / commission state changes.
- Tenant Company emits Tenant Company events for Tenant authority changes.
- Logs & Audit emits Logs & Audit events for evidence / retention lifecycle.
- Integration Management emits Integration Management events for transport / dispatch outcomes (including QuickBooks API transport).
- Notification Platform emits Notification Platform events for delivery.
- Analytics emits Analytics events for BI / reporting lifecycle.
- None of these modules emit events on behalf of the others.
- Cross-module correlation via `correlation_reference` per PR-A discipline.

### Forbidden event modifications

- No Invoice Management baseline event is renamed, removed, or version-bumped.
- No Order Routing / Fulfillment-Returns / Pricing / Product Catalog / Device Catalog / Tenant Company / Logs & Audit / Integration Management / Notification Platform / Analytics / Procurement event is modified.
- No new top-level event identifier outside the 11 Invoice Management events listed.
- No discriminator value is removed from an existing catalog (extensions are additive only).

### Subscriber composition guidance

Subscribers consuming the Invoice Management surface:

- Subscribe to `invoice-run.status-changed` with `invoice_run_status` filter for run-level lifecycle.
- Subscribe to `invoice.status-changed` with `invoice_status` filter for per-invoice lifecycle.
- Subscribe to `invoice-adjustment.recorded` with `adjustment_kind` filter.
- Subscribe to `invoice-exception.recorded` with `exception_kind` filter.
- Subscribe to `quickbooks-handoff.reference-recorded` with `quickbooks_handoff_object_kind` filter.
- Subscribe to `vendor-reconciliation-upload.status-changed` with `reconciliation_upload_status` filter.
- Subscribe to `vendor-reconciliation-match.completed` with `match_result_status` filter.

Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
