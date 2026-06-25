# Procurement / Purchase Orders Event Contracts

This document is proposal-level architecture. It defines event contract expectations between Procurement / Purchase Orders and source/consumer modules.

## Inbound Source Signal Contracts

Procurement may consume signals and references from:

- Tenant Company for buyer parent/entity scope, roles, permissions, activation/readiness, buyer/vendor/manufacturer eligibility, Product Type enablement, licensed-property scope, and permission/approval authority evidence.
- Product Catalog for accessory/branded product references and Product Type-aware product context.
- Device Catalog for Device References and device-safe context.
- Pricing for price snapshots, quote-like results, pricing evidence, procurement-bindable pricing references, version/hash, expiration, and supersession status.
- Integration Management for submission methods, external action references, external PO references, external line references, delivery status references, receipt references, external ID mapping references, and conflict states.
- Media / Image Asset Management for media references where relevant.
- AI Agent Services for procurement recommendation references.

Inbound signals should include source module, source reference id, source version/hash placeholder where available, tenant scope, redaction class, and review state where applicable.

## Outbound Procurement Event Contracts

Procurement outbound events should include:

- Event id.
- Event type.
- Purchase order reference.
- Purchase order line references where applicable.
- Tenant/buyer/entity scope.
- Header seller target reference.
- Line seller target references where applicable.
- Target cardinality status.
- Product Type.
- Product Catalog product reference or Device Reference where applicable.
- Pricing snapshot / quote-like result reference where applicable.
- Pricing snapshot version/hash where applicable.
- Approval policy/version where applicable.
- Approval evidence reference where applicable.
- Submission/external PO reference where applicable.
- External line reference where applicable.
- Response source reference where applicable.
- Response dedupe key where applicable.
- Status.
- Reason/review state where applicable.
- Redaction class.
- Logs & Audit reference where applicable.

## Consumer Boundaries

### Order Routing

Order Routing must not treat Procurement events as normal customer order routing commands. Procurement events may be visible for context only where future contracts allow.

### Fulfillment / Returns

Fulfillment/Returns may later consume downstream receiving/fulfillment signal placeholders if a future ADR/module assigns the receiving boundary. Procurement events must not create fulfillment execution state by themselves.

### Invoice Management

Invoice Management may later consume accepted/received/completed PO references for billing where applicable. Procurement events do not create invoice lifecycle state by themselves.

### Integration Management

Integration Management may consume PO submission requests or external action references and owns delivery evidence, receipt evidence, credential references, webhook/API transmission records, external ID mappings, and connection state. Procurement may store external PO references as workflow references, but those references must not replace internal PO IDs.

### Notification Platform Service

Notification may consume PO approval required, PO submitted, response received, accepted/rejected/backordered, and review-required events. Notification owns delivery, recipient resolution, preferences, and delivery history.

### Logs & Audit

Logs & Audit owns audit evidence and file tracking for PO creation, approval, submission, revision, cancellation, response, export/import, and status changes.

### Analytics / Reporting

Analytics may consume procurement signals for bulk purchase interest, device demand, vendor demand, buyer purchasing behavior, procurement performance, and backorder trends. Analytics owns reporting models and metrics.

### AI Agent Services

AI may consume procurement signals and produce recommendations, drafts, confidence scores, and action outcomes. AI must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Redaction And Payload Rules

Events must use minimal necessary data. Sensitive buyer, vendor, manufacturer, pricing, product, device, media, payment, licensing, or commercial values should be represented by references or redacted summaries unless explicitly allowed.

## Non-Goals

Procurement event contracts do not define Product Catalog, Device Catalog, Pricing, Tenant Company, Order Routing, Fulfillment/Returns, Invoice Management, Integration Management, Logs & Audit, Notification, Analytics, Media, Warranty, or AI source payloads. Those remain owned by their modules.