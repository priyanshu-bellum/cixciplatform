# Procurement / Purchase Orders Events

This document is proposal-level architecture. It defines initial procurement event taxonomy without finalizing payload schema, transport, delivery guarantees, retention, or implementation behavior.

## Event Principles

- Procurement events should use references rather than copying full Product Catalog, Device Catalog, Pricing, Tenant Company, Integration, Invoice, Fulfillment, or external provider records.
- Event payloads should preserve PO id, PO line references, tenant scope, target references, Product Type, status, reason, source versions where applicable, and redaction class.
- Sensitive buyer, vendor, manufacturer, pricing, product, device, media, payment, or commercial details should be scoped and redacted by consumer class.
- Procurement events are PO lifecycle signals, not normal customer order routing commands.
- External PO references in events are workflow references and must not replace internal PO IDs.

## Event Catalog

Proposal-level events:

- `procurement.po.created`.
- `procurement.po.updated`.
- `procurement.po.approval.requested`.
- `procurement.po.approved`.
- `procurement.po.rejected`.
- `procurement.po.submitted`.
- `procurement.po.accepted`.
- `procurement.po.partially-accepted`.
- `procurement.po.backordered`.
- `procurement.po.cancelled`.
- `procurement.po.closed`.
- `procurement.po.superseded`.
- `procurement.po.review-required`.
- `procurement.po.vendor-response.received`.
- `procurement.po.manufacturer-response.received`.
- `procurement.po.target-conflict.detected` placeholder.
- `procurement.po.pricing-review.required` placeholder.
- `procurement.po.external-reference.conflict` placeholder.
- `procurement.po.approval.expired` placeholder.

## Event Families

### Lifecycle Events

- PO created.
- PO updated.
- PO submitted.
- PO accepted.
- PO partially accepted.
- PO backordered.
- PO cancelled.
- PO closed.
- PO superseded.

### Approval Events

- PO approval requested.
- PO approved.
- PO rejected.
- PO approval escalated placeholder.
- PO approval expired placeholder.

### Response Events

- Vendor response received.
- Manufacturer response received.
- Line response received placeholder.
- Response conflict detected placeholder.

### Exception / Review Events

- PO review required.
- Target conflict placeholder.
- Submission failure placeholder.
- Pricing evidence missing/stale/expired/superseded placeholder.
- Tenant scope or eligibility review placeholder.
- External PO reference conflict placeholder.

## Required Event Fields

Proposal-level fields:

- Event id.
- Event type.
- Occurred at.
- Source: Procurement / Purchase Orders.
- Tenant scope.
- Buyer parent/entity reference.
- Purchase order reference.
- Purchase order line references where applicable.
- Header seller target reference.
- Line seller target references where applicable.
- Target cardinality status.
- Product Type.
- Product Catalog product reference where applicable.
- Device Catalog Device Reference where applicable.
- Pricing snapshot / quote-like reference where applicable.
- Pricing snapshot version/hash where applicable.
- Approval policy/version where applicable.
- Approval evidence reference where applicable.
- Submission reference where applicable.
- External PO reference where applicable.
- External line reference where applicable.
- Response source reference where applicable.
- Response dedupe key where applicable.
- Revision/supersession reference where applicable.
- Status.
- Reason / review state where applicable.
- Redaction class.
- Logs & Audit reference where applicable.

## Consumer Notes

- Integration Management may consume submission intent or external action references, but owns connection/delivery evidence, receipt evidence, external ID mapping, and provider interaction state.
- Notification Platform Service may consume notification-triggering events and owns delivery.
- Analytics may consume procurement signals for reporting and owns metrics/read models.
- Logs & Audit may consume events/evidence references and owns audit/file evidence.
- AI Agent Services may consume procurement signals and owns recommendations/action outcomes.
- Order Routing must not treat procurement events as customer routed suborder commands.
- Fulfillment/Returns must not treat receiving placeholders as fulfillment execution unless a future ADR/module assigns that boundary.
- Invoice Management must not treat PO references as invoice lifecycle state until a future invoice eligibility contract is defined.

## Redaction Rules

Events should avoid full PO documents, raw pricing payloads, customer data, secret integration details, or unrestricted external provider responses. Use references and redaction classes.