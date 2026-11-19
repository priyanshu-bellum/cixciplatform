# Order acceptance and vendor exports

Purpose: buyer-scoped orders, frozen supplier selections, immutable accepted lines,
supplier suborders and manual/export delivery evidence. Features ORD-001/002.

## Entry points, workflow and files

[api](../../../backend/apps/routing/api.py), [models](../../../backend/apps/routing/models.py),
[services](../../../backend/apps/routing/services.py), [tasks](../../../backend/apps/routing/tasks.py),
[offer resolution](../../../backend/apps/catalog/offer_services.py).
Frontend OrdersPage and TelcoCellularPage.

OrderCreateSerializer validates buyer purchase input → exported offer resolution
within company/entity/storefront → AcceptedOrderLine freezes mapping/supplier/pricing
→ order splits into RoutedSuborder → API supplier dispatch or manual export windows/
batch/log/re-export. Successful/failed export handlers update delivery evidence and
fulfillment/SLA; do not confuse a queued dispatch with provider acceptance.

## API, data and dependencies

[Routing API](../reference/api/routing.md) under `/api/v1/routing/`: orders,
export-schedules, export-windows, export-logs and associated actions.
[Schema](../reference/schema/routing.md): Order, AcceptedOrderLine, RoutedSuborder,
VendorExportSchedule/Window/BatchItem/DeliveryAttempt/DeliveryEvidence,
VendorOrderExportLog and VendorOrderReexportAttempt.
Dependencies: tenant triad, export mappings, Product, pricing, integration commerce
dispatch, notifications/audit and downstream fulfillment. Many cross-context
references are UUIDs validated in services, not database FKs.

## Rules, security, tests and precautions

BR-EXP-001, BR-TEN-001, BR-PRC-001, BR-AUD-001. Preserve accepted facts/idempotency,
supplier isolation and mapping version; client-supplied vendor ID cannot independently
choose an offer. Keep manual export/re-export history and delivery evidence truthful.
ISSUE-003 concerns older PO-generated routing/delivery records; ISSUE-012 coupling.

Tests: [supplier acceptance](../../../backend/tests/test_supplier_order_acceptance.py),
[mapping](../../../backend/tests/test_supplier_export_mapping.py),
[manual export](../../../backend/tests/test_manual_vendor_export.py),
[export validation](../../../backend/tests/test_vendor_export_validation.py),
[buyer B2B](../../../backend/tests/test_buyer_b2b_api.py).
Trace fulfillment/invoice and integration retries before modifying order status or
delivery confirmation. Do not merge legacy orchestration with dispatch by assumption.
