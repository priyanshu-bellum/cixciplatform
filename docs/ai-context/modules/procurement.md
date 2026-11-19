# Procurement and purchase orders

Purpose: buyer POs with nested frozen line pricing and approval/finalization.
Feature PRO-001 is partial because legacy finalization has material defects.

## Entry points, workflow and files

Active PurchaseOrderViewSet/serializers reside in
[shared_api.py](../../../backend/apps/shared_api.py); [models](../../../backend/apps/procurement/models.py),
[services](../../../backend/apps/procurement/services.py) contain line validation and
orchestrate_po_finalization. Frontend [ProcurementPage](../../../frontend/src/pages/ProcurementPage.tsx)
and TelcoCellularPage.

Create extracts lines/customer_shipping, validates products, freezes effective
prices/MSRP and computes totals within an atomic block. Some storefront/API-key
creates auto-approve. Approve saves state then calls the older orchestration service.
That service creates order/suborder (same PO/order UUID), export/delivery/handoff/SLA
records for API vendors; manual vendor placement returns earlier. This synthetic
delivery path is not verified external transport.

## API, entities and dependencies

[API](../reference/api/procurement.md): `/api/v1/procurement/purchase-orders/`, detail,
lines and approve actions. [Schema](../reference/schema/procurement.md): PurchaseOrder,
PurchaseOrderLine with unit_price_snapshot/msrp_snapshot/line_total.
Dependencies: Product orderability/media/compatibility, tenant company, pricing,
routing, fulfillment and invoices. PO create/approval and orchestration have
different transaction boundaries; no complete approve rollback guarantee.

## Rules, security, tests and precautions

BR-PRO-001, BR-TEN-001, BR-PRC-001. Quantity and product orderability validation
must apply consistently. MSRP-based line totals may differ from unit price; do not
replace the formula by assumption. ISSUE-003: fabricated delivery/address, UUID
assigned to timestamp, partial-failure risk. ISSUE-009: existing orchestration test
fixture fails before reaching these paths. UQ-003 needs business clarification.

Tests: [nested PO](../../../backend/tests/test_procurement_nested.py),
[orchestration](../../../backend/tests/test_po_orchestration.py),
[invoice generation](../../../backend/tests/test_invoice_auto_generation.py).
Add real approved-flow/failure regression before any repair; no production data
correction or orchestration rewrite is authorized by memory initialization.
