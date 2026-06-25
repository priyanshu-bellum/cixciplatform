# Launch / Event Management Event Contracts

This document is proposal-level architecture. It defines event contract expectations between Launch / Event Management and source/consumer modules.

## Inbound Source Signal Contracts

Launch / Event Management may consume signals and references from:

- Device Catalog for Device References, release date, launch date, manufacturer ownership, lifecycle-safe references, source lifecycle version/hash, and source disposition.
- Product Catalog for product references, Product Type, product availability signals, product visibility references, product lifecycle references, compatibility context, and product lifecycle-safe references.
- Tenant Company for buyer/vendor/manufacturer references, participant scope, roles, permissions, activation/readiness, Product Type enablement, licensed-property scope, region scope, relationship eligibility, and tenant readiness signals.
- Pricing for pricing readiness signals, price snapshot references, quote readiness placeholders, promotional pricing readiness references, signal version/hash, and source disposition.
- Media / Image Asset Management for media readiness signals, asset readiness references, media gap references, signal version/hash, and source disposition.
- Integration Management for external task references, external calendar references, webhook/API notification references, external action references, integration readiness signals, and external reference conflict states.
- Notification Platform Service for notification trigger request status references where future contracts allow.
- Analytics / Reporting for tracking references where future contracts allow.
- AI Agent Services for AI readiness recommendation references and planning task drafts.
- Procurement / Purchase Orders for procurement planning signal references where future contracts allow.

Inbound signals should include source module, source reference id, source version/hash placeholder where available, tenant scope, redaction class, freshness timestamp, expiration timestamp, source disposition, and review state where applicable.

## Outbound Launch Event Contracts

Launch outbound events should include:

- Event id.
- Event type.
- Launch event reference.
- Tenant/company/entity scope.
- Launch type.
- Launch status.
- Device Reference where applicable.
- Product Catalog product reference where applicable.
- Product Type where applicable.
- Buyer/vendor/manufacturer participant references where applicable.
- Visibility window reference where applicable.
- Source visibility/lifecycle reference where applicable.
- Readiness workflow/checklist reference where applicable.
- Readiness evidence reference where applicable.
- Participant readiness references where applicable.
- Milestone references where applicable.
- Notification trigger/fanout reference where applicable.
- AI readiness signal reference where applicable.
- Analytics signal reference where applicable.
- Procurement planning signal reference where applicable.
- Exception/review state where applicable.
- Reason / conflict reason / waiver reason where applicable.
- Redaction class.
- Logs & Audit reference where applicable.

## Consumer Boundaries

### Product Catalog

Product Catalog owns product facts, product records, lifecycle, availability, visibility, publishing, compatibility, Product Type validation, product activation/download state, and media attachment references. Launch events may provide launch context but must not create, modify, activate, deactivate, publish, or infer product source records.

### Device Catalog

Device Catalog owns device facts, canonical Device References, device identity, release dates, launch dates, manufacturer ownership, and lifecycle state. Launch events may provide readiness context but must not alter canonical Device Records or Device References.

### Tenant Company

Tenant Company owns users, roles, permissions, company/entity scope, activation, readiness, participant eligibility, region scope, Product Type enablement, and licensed-property scope. Launch events do not grant permissions or infer eligibility.

### Pricing

Pricing owns pricing readiness facts, pricing rules, discounts, quotes, effective prices, snapshots, and commercial interpretation. Launch events do not define promotional pricing or price outcomes.

### Media / Image Asset Management

Media owns asset readiness facts, asset validation, transformation, URLs, downloads, metadata, storage, and access controls. Launch events may reference media readiness gaps but must not approve or process assets.

### Notification Platform Service

Notification may consume launch scheduled, readiness blocked, ready, active, completed, cancelled, readiness-required, notification-trigger, and fanout-requested events. Notification owns delivery, recipient resolution, templates, preferences, suppression, retry, digest behavior, fanout controls, and delivery history.

### Analytics / Reporting

Analytics may consume launch/event signals for reporting and owns metric definitions, dashboards, read models, exports, and aggregations.

### AI Agent Services

AI may consume launch signals and produce recommendations, readiness gaps, draft tasks, confidence scores, and action outcomes. AI must not change launch status, publish launch events, or trigger buyer-facing actions without approved action contracts and permissions.

### Integration Management

Integration Management may consume external task/calendar/action intents and owns external connection state, credentials, external ID mappings, delivery/receipt evidence, and external action records. External tools must not become the source of truth for CIXCI launch records.

### Logs & Audit

Logs & Audit owns audit evidence for launch creation, readiness updates, waivers/overrides, status changes, participant readiness, external references, notification trigger references, and AI-assisted actions.

### Procurement / Purchase Orders

Procurement may consume launch planning signals for bulk purchase planning. Procurement owns PO lifecycle and must not treat launch events as PO creation, approval, submission, receiving, or payment commands.

### Order Routing / Fulfillment / Invoice / Warranty

Order Routing, Fulfillment/Returns, Invoice Management, and Warranty support may consume context only where future contracts allow. Launch events must not create routed suborders, execute fulfillment, generate invoices, process payments, or approve warranty claims.

## Redaction And Payload Rules

Events must use minimal necessary data. Sensitive product, device, pricing, tenant, media, integration, licensing, warranty, customer, or commercial values should be represented by references or redacted summaries unless explicitly allowed.

## Non-Goals

Launch event contracts do not define source payloads for Product Catalog, Device Catalog, Pricing, Tenant Company, Media, Notification, Analytics, AI Agent Services, Integration Management, Logs & Audit, Procurement, Order Routing, Fulfillment/Returns, Invoice Management, or Warranty support. Those remain owned by their modules.