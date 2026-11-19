# Invoicing and reconciliation records

Purpose: invoice runs/periods/lines, manual/from-order generation, adjustments,
exceptions and reconciliation evidence. Feature INV-001; complete payment
collection/settlement was not verified.

## Entry points, workflow and files

[api](../../../backend/apps/invoicing/api.py), [models](../../../backend/apps/invoicing/models.py).
Frontend [InvoicingPage](../../../frontend/src/pages/InvoicingPage.tsx).
API declares explicit INVOICE_TRANSITIONS and INVOICE_RUN_TRANSITIONS. Manual
generation validates input/date/line amounts then transactionally creates run,
period, invoice and lines. create_from_orders aggregates PO source lines, freezes
pricing references/totals and creates exceptions for unusable source values.
Adjustment/match records preserve downstream evidence rather than silently repricing
previously issued facts. Inspect action code for exact type/role/state validation.

## API, entities and dependencies

[API](../reference/api/invoicing.md): `/api/v1/invoicing/` runs, invoices (detail,
lines/adjustments/create-manual/create-from-orders actions), exceptions and
match-results. [Schema](../reference/schema/invoicing.md): InvoiceRun, InvoicePeriod,
Invoice, InvoiceLine, InvoiceAdjustment, InvoiceReport, InvoiceExceptionRecord,
VendorReconciliationUploadJob and VendorReconciliationMatchResult.
Dependencies: tenant/counterparty, PO/order lines, effective price snapshots,
fulfillment/returns and audit. Provider finance mirror records are a separate
integration context, not proof of automatic reconciliation/settlement.

## Rules, security, tests and precautions

BR-INV-001, BR-PRC-001, BR-PRO-001, BR-TEN-001. Preserve Decimal precision,
idempotency/source references, role-specific visibility and issued-state history.
Model immutability is not a database trigger; follow service/transition paths.
No dedicated new runtime issue was verified here; PO source defects and undefined
currency/rounding policy remain downstream risks.

Tests: [auto generation](../../../backend/tests/test_invoice_auto_generation.py),
[immutability](../../../backend/tests/test_models_immutable.py),
[buyer data specification](../../../backend/tests/test_buyer_data_integration_spec.py).
Before financial changes, trace displayed totals, PO MSRP fallback, price snapshots,
delivered/returned quantities, counterparty scope and adjustment behavior.
