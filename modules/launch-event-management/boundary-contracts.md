# Launch / Event Management Boundary Contracts

This document is proposal-level architecture. It clarifies what Launch / Event Management may answer and what must remain owned by other modules.

## Launch / Event Management May Answer

Launch / Event Management may answer proposal-level questions such as:

- Does a launch event record exist?
- What launch/event type is assigned?
- What is the launch status lifecycle state?
- What event calendar record or visibility window is associated with the launch?
- Which participants are associated with the launch?
- What participant readiness state is recorded?
- Which readiness checklist placeholders, task placeholders, source-owned readiness evidence references, or milestones exist?
- What readiness blockers, waivers, overrides, recheck requirements, or launch exceptions exist?
- Which notification trigger references, AI readiness signal references, analytics signal references, procurement planning signal references, or external task/calendar references are linked?
- What launch events were emitted?

## Launch / Event Management Must Not Answer

Launch / Event Management must not answer source-of-truth or workflow questions such as:

- What is the authoritative product record, product lifecycle, product visibility, product publishing state, compatibility, activation/download state, or product media attachment?
- What is the canonical Device Reference, device identity, release date, launch date, manufacturer source record, or device lifecycle state?
- What price, discount, quote, effective price, pricing readiness fact, pricing rule, or pricing interpretation applies?
- Which notification recipient should receive delivery, what template is used, whether digest is used, or whether delivery succeeded?
- What analytics metric, dashboard, report, export, or read model is authoritative?
- What AI recommendation, confidence score, draft, or action outcome is authoritative?
- What media asset is ready, approved, transformed, published, downloadable, or URL-ready?
- What external integration is configured, healthy, authenticated, or executing an external action?
- What audit evidence is retained?
- What purchase order was created, approved, submitted, received, or paid?
- How should a normal customer order be routed?
- What fulfillment, return, invoice, payment, or warranty state exists?
- Is a tenant, buyer, vendor, manufacturer, user, role, permission, Product Type, licensed property, region, or relationship eligible?
- What legal/licensing workflow applies?

## Module Boundaries

### Device Catalog

Owns device facts, canonical Device References, device identity, release dates, launch dates, manufacturer ownership, manufacturer source data, and lifecycle state. Launch may reference device launch/release data but must not alter canonical device records or treat Launch Active as Device Active.

### Product Catalog

Owns product facts, product source records, product lifecycle, product availability, product visibility, product publishing, compatibility, Product Type validation, product activation/download state, and product media attachment references. Launch may coordinate readiness around products but must not create, modify, publish, activate, deactivate, or infer product records.

### Tenant Company

Owns users, roles, permissions, company/entity scope, activation, readiness, buyer/vendor/manufacturer references, participant eligibility, Product Type enablement, licensed-property scope, region scope, and relationship eligibility. Launch consumes scope and participant references but does not infer eligibility.

### Pricing

Owns pricing readiness facts, pricing rules, discounts, quotes, effective prices, price snapshots, exceptions, and commercial interpretation. Launch may reference pricing readiness signals but does not calculate or interpret price.

### Media / Image Asset Management

Owns asset readiness facts, image/media readiness, validation, transformation, URL generation, downloadable assets, storage, metadata, and access controls. Launch consumes media readiness signals only.

### Notification Platform Service

Owns delivery, recipient resolution, templates, preferences, suppression, retry, digest behavior, fanout controls, and delivery history. Launch emits notification trigger/fanout references only.

### Analytics / Reporting

Owns reporting metrics, reporting models, metric definitions, dashboards, read models, exports, aggregations, and report permissions projections. Launch emits analytics-consumable signals only.

### AI Agent Services

Owns recommendations, drafts, confidence scores, and action outcomes. Launch owns approved launch records and readiness workflow state. AI cannot change launch status or trigger buyer-facing actions without approved action contracts and permissions.

### Integration Management

Owns external task/action references, external connection state, credentials, external ID mapping, delivery/receipt evidence, external action records, and integration health. Launch may link external task/calendar references but external tools must not become source of truth for CIXCI launch records.

### Logs & Audit

Owns audit evidence and file tracking. Launch owns launch workflow state and emits audit references.

### Procurement / Purchase Orders

Owns POs, PO creation, approval, submission, response, receiving placeholders, and PO lifecycle. Launch may emit planning signals but must not create or mutate POs.

### Order Routing

Owns normal customer order routing, routed suborders, routing decisions, routing snapshots, and routing exceptions. Launch must not route customer orders.

### Fulfillment / Returns

Owns fulfillment execution, shipment status, delivery status, return operational state, replacement execution, and fulfillment/return exceptions. Launch must not execute fulfillment or returns.

### Invoice Management / Payment

Invoice Management owns invoice lifecycle and invoice records. Payment remains future/placeholder. Launch must not generate invoices, determine invoice eligibility, or process payments.

### Warranty Registration / Claims

Warranty support remains outside Launch. Launch may reference warranty readiness but does not own registration delivery, claim eligibility, approval, or replacement execution.

## Ownership Summary

Launch / Event Management owns launch coordination, launch records, readiness workflow state, source-owned readiness evidence references, waiver/override records, milestones, participants, launch status, calendar views, visibility windows, notification trigger references, AI/analytics signal references, procurement planning signal references, external launch references, exception/review states, and launch events only.

Launch / Event Management must not move Device Catalog, Product Catalog, Pricing, Marketing/Campaign Execution, Notification, Analytics, AI Agent Services, Media, Integration Management, Logs & Audit, Procurement, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, Licensing, Payment, or Vendor Operational Interface ownership into Launch / Event Management.