# Procurement / Purchase Orders Boundary Contracts

This document is proposal-level architecture. It clarifies what Procurement / Purchase Orders may answer and what must remain owned by other modules.

## Procurement May Answer

Procurement may answer proposal-level questions such as:

- Does a buyer bulk purchase order exist?
- What is the PO draft, approval, submission, response, revision, or status lifecycle state?
- Which PO lines reference Product Catalog products or Device Catalog Device References?
- Which seller target was selected for a bulk PO?
- Does the PO have a target conflict, decomposition requirement, or ambiguous target cardinality?
- What price snapshot / quote-like reference was preserved on a PO line?
- What approval evidence was recorded for the PO workflow?
- What PO document/export reference exists?
- What vendor/manufacturer response was received?
- Which receiving placeholder or downstream signal placeholder is linked to the PO?
- Which PO exception or review state exists?

## Procurement Must Not Answer

Procurement must not answer source-of-truth or workflow questions such as:

- How should a normal customer order be routed?
- What routed suborders exist for a customer order?
- What is the authoritative product record, Product Type definition, category validation rule, or product visibility state?
- What is the canonical Device Reference or device lifecycle status?
- What is the authoritative price, pricing exception, commercial interpretation, or accepted price meaning?
- Is a tenant, buyer, vendor, manufacturer, user, role, permission, product type, licensed property, or relationship eligible?
- Has fulfillment shipped, delivered, received, returned, or replaced goods as operational execution?
- What invoice is generated or payment is processed?
- What warranty claim is eligible or approved?
- What audit evidence is retained?
- Was a notification delivered?
- What integration credentials, external ID mapping authority, delivery evidence, or receipt evidence exist as source of truth?
- What analytics metric or AI recommendation is authoritative?

## Module Boundaries

### Tenant Company

Owns roles, permissions, company/entity scope, buyer/vendor/manufacturer eligibility, activation/readiness, Product Type enablement, licensed-property scope, and relationship eligibility. Procurement consumes these signals but does not define tenant eligibility or infer permission rules independently.

### Product Catalog

Owns accessory/branded product records, Product Type validation, category validation, product visibility, lifecycle, compatibility assertions, and product media attachment references. Procurement references products for PO lines only.

### Device Catalog

Owns canonical Device References and device source records. Procurement references Device References for device PO lines only.

### Pricing

Owns quote-like results, price snapshots, pricing exceptions, commercial interpretation, and pricing calculations. Procurement consumes price references and bindability evidence, but must not recalculate price or reinterpret pricing conflicts.

### Order Routing

Owns normal customer order routing and routed suborders. Procurement owns buyer bulk purchase workflows. Procurement must not create normal customer routed suborders, and Order Routing must not own bulk PO approval, submission, receiving, or PO lifecycle.

### Fulfillment / Returns

Owns operational fulfillment, return, shipment, delivery, replacement, and possible future receiving execution if assigned. Procurement may store receiving placeholders only.

### Invoice Management / Payment

Invoice Management may later consume PO references for billing where applicable. Procurement does not own invoice lifecycle or process payments. Payment remains future/placeholder.

### Integration Management

Owns external connection state, credentials references, delivery evidence, receipt evidence, webhook/API transmission records, external action references, and external ID mappings. Procurement owns the PO record, PO lifecycle, and external PO references only as workflow references.

### Logs & Audit

Owns audit evidence and file tracking. Procurement owns PO workflow/state and emits audit references.

### Notification Platform Service

Owns delivery. Procurement emits notification-triggering events only.

### Analytics / Reporting

Owns metrics and reporting models. Procurement owns PO source records and lifecycle.

### AI Agent Services

Owns recommendations, confidence, drafts, and action outcomes. Procurement owns approved PO records and PO workflow. AI cannot create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

### Media / Image Asset Management

Owns media asset IDs, renditions, storage references, access policy, and processing state. Procurement may reference approved media context only.

### Warranty Registration / Claims

Warranty support remains outside Procurement. Procurement may preserve warranty-related references but does not own eligibility, registration delivery, claim approval, or replacement execution.

## Ownership Summary

Procurement owns PO records, approval workflow evidence, PO lifecycle, PO lines, PO submission references, vendor/manufacturer response tracking, revision/supersession, receiving placeholders, PO exceptions, and procurement events only.

Procurement must not move Order Routing, Pricing, Product Catalog, Device Catalog, Tenant Company, Fulfillment/Returns, Invoice Management, Payment, Warranty, Logs & Audit, Notification, Integration Management, Analytics, Media, AI Agent Services, or Vendor Operational Interface ownership into Procurement.