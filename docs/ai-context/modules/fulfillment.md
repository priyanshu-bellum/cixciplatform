# Fulfillment, shipment tracking and returns

Purpose: vendor handoffs/shipping imports, delivery evidence, buyer tracking/SLA
signals, return requests and vendor confirmations. Features FUL-001 and RET-001.

## Entry points and workflow

[api](../../../backend/apps/fulfillment/api.py), [models](../../../backend/apps/fulfillment/models.py),
[tasks](../../../backend/apps/fulfillment/tasks.py), [carrier integration](../../../backend/apps/fulfillment/carrier_tracking.py).
Frontend [FulfillmentPage](../../../frontend/src/pages/FulfillmentPage.tsx).

Routing/provider responses create or resolve a vendor-scoped handoff. CSV imports,
shipment polling, signed webhook handlers and carrier observations supply tracking/
dates/evidence. BuyerShipmentTrackingViewSet is a dedicated buyer read surface.
SLA tasks evaluate confirmed export evidence and emit buyer/notification signals.
Return creation/import has separate RAN/status/inspection/refund details and logs;
provider finance/returns mirror records are not automatically settled CIXCI refunds.

## API, data and dependencies

[Active API](../reference/api/fulfillment.md): `/api/v1/fulfillment/` handoffs,
buyer-shipments, SLA policies/evaluations/overrides, buyer-signals, return-requests
and import logs. [Full schema](../reference/schema/fulfillment.md) lists all 13 models,
including delivery/correction evidence and late/missing/partial import exceptions.
Dependencies: routing suborders/delivery evidence, tenant scope, integration polling/
webhooks, carrier credentials, pricing return evidence, notification and audit.

## Rules, security, tests and precautions

BR-TEN-001, BR-AUD-001, BR-PRC-001. Keep buyer order scope separate from vendor
actor scope; imports must match scoped order/SKU/UPC evidence. Preserve date
corrections and immutable SLA/history facts. One tracking observation does not
prove unrelated parent/line completeness. ISSUE-003 affects legacy PO handoff/SLA
creation; live carrier delivery was not exercised.

Tests: [shipping](../../../backend/tests/test_fulfillment_shipping.py),
[shipping import](../../../backend/tests/test_shipping_import.py),
[buyer shipping](../../../backend/tests/test_buyer_shipping_import.py),
[returns](../../../backend/tests/test_returns_import.py),
[return create](../../../backend/tests/test_returns_request_creation.py),
[webhook/shipment](../../../backend/tests/test_webhook_and_shipment.py).
Trace import, poll, webhook and carrier callers together when changing handoff
fields/state; don't introduce a new refund/fee policy during a mechanical repair.
