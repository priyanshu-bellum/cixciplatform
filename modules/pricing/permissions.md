# Permissions

This document is proposal-level architecture. Tenant Company remains authority for users, roles, company/entity scope, eligibility, channel eligibility, and permission grants. Pricing consumes those signals and records Pricing-specific authorization evidence without independently granting tenant access.

## Roles

- Pricing Viewer
- Pricing Component Viewer
- Pricing Manager
- Pricing Channel Manager
- Commission Manager
- Buyer-Specific Override Manager
- Pricing Exception Approver
- Pricing Override Approver
- PO Pricing Reviewer
- Pricing Audit Viewer
- Pricing Integration Consumer
- Pricing Import Reviewer
- Platform Admin Placeholder

## Permission Sets

### Pricing Viewer

- View authorized pricing profile summaries, pricing rule summaries, effective price summaries, and snapshots for assigned tenant scope.
- View Buyer-facing Wholesale Price only where redaction class and Tenant Company scope allow it.
- Cannot view restricted commission components unless separately authorized.
- Cannot create, update, approve, revoke, import, or export Pricing configuration.

### Pricing Component Viewer

- View authorized component-level pricing detail, including vendor-side commission, buyer-side commission, exception, override, and channel component summaries.
- Must be scoped by tenant/company/entity, user role, consumer type, and redaction class.

### Pricing Manager

- Create or update proposal-level pricing profiles and rules within assigned commercial scope.
- Request validation previews, recalculations, and quote-like results.
- Request pricing exceptions and buyer-specific overrides where workflow allows.
- Cannot approve own exception, override, commission change, or destructive import unless a future policy explicitly allows it.

### Pricing Channel Manager

- Manage proposal-level channel rule configuration for Online / Direct-to-Consumer, Bulk Purchase Order, Owned Channel / Kaseory, Buyer Storefront, Marketplace placeholder, Retail POS placeholder, Promotional Campaign placeholder, and Buyer-Specific Contract placeholder.
- Must not grant buyer/entity channel eligibility; Tenant Company owns that authority.
- Must preserve channel rule version/hash and audit metadata.

### Commission Manager

- Manage vendor-side and buyer-side commission component proposals within authorized scope.
- Must record commission rate source, commission basis, effective dates, precedence, contract reference placeholder, status, visibility/redaction class, rule version/hash, and audit reference.
- Cannot bypass Tenant Company scope/permission authority.

### Buyer-Specific Override Manager

- Create or update buyer-specific override proposals within authorized buyer/vendor/entity/product/channel/Product Type scope.
- Must preserve source input references, effective dates, override reason, validation preview, approval state, redaction class, and audit reference.
- Cannot alter Product Catalog product records or buyer storefront resale prices.

### Pricing Exception Approver

- Approve, reject, revoke, expire, or route typed pricing exceptions within assigned scope.
- Must provide reason, effective date evidence, redaction class, and audit metadata.

### Pricing Override Approver

- Approve, reject, revoke, expire, or route buyer-specific pricing overrides within assigned scope.
- Must validate Tenant Company scope, channel eligibility evidence, Product Catalog input references, and Pricing validation preview outcome before approval.

### PO Pricing Reviewer

- Review Procurement accepted-price variance evidence, quote expiration, bindability state, and requote-required state.
- May mark Pricing review disposition but must not mutate Procurement PO lifecycle or accepted-price evidence.

### Pricing Audit Viewer

- View authorized audit records, snapshot references, component summaries, event history, rule versions, source input versions, commission versions, and redaction decisions.
- Full component details require explicit redaction-class authorization.

### Pricing Integration Consumer

- Request calculation, validation preview, quote-like result, effective price lookup, or snapshot creation on behalf of authorized downstream modules.
- Must supply tenant scope, consumer type, channel selection evidence, correlation identifiers, and requested output class.
- Must not deliver external updates; Integration Management owns transport evidence.

### Pricing Import Reviewer

- Review Pricing import previews, errors, warnings, blank-field behavior, partial update behavior, destructive controls, and user-facing summaries under the shared Import / Export / Validation Governance standard.
- Cannot apply destructive pricing changes without explicit Tenant Company authority and Pricing approval workflow.

## Tenant Boundaries

- Pricing access must be scoped by tenant, parent company, child entity, buyer, vendor, relationship, region, channel, Product Type, contract placeholder, or another confirmed commercial scope.
- Tenant Company owns whether a user, role, company, entity, buyer, vendor, channel, or relationship is eligible to act.
- Shared Product Catalog or Device Catalog references must not imply shared price visibility.
- Child entity users must not see parent or sibling pricing unless Tenant Company grants scope and Pricing redaction rules allow it.
- Cross-tenant pricing profile, commission, exception, override, or snapshot access should require explicit platform-level authorization.

## Price Visibility By User Type

- Vendors may view authorized vendor-submitted pricing inputs and vendor-visible Pricing outcomes, subject to redaction.
- Buyers may view authorized buyer-facing price/snapshot references, not vendor-restricted component detail unless explicitly allowed.
- System Admins may review Pricing health and exceptions according to role and audit controls.
- Order Routing, Procurement, Invoice Management, Analytics, Notification, Integration, Logs & Audit, and AI consumers receive only the fields allowed by consumer class and redaction class.
- AI prompts and outputs must not receive restricted pricing detail unless explicitly authorized and governed by AI Agent Services action/visibility controls.

## Admin Overrides

- Pricing exceptions and buyer-specific pricing overrides are Pricing-owned commercial constructs.
- Tenant Company admin exceptions may affect eligibility, readiness, channel scope, or permissions, but must not directly set calculated prices or commission rates.
- Every Pricing override should include type, scope, affected subject, effective date range, expiration, approver, reason, validation preview reference, redaction class, and audit trail.
- Override actions that affect order-bindable, procurement-bindable, export-bindable, or invoice-bindable outputs should emit Pricing events and preserve historical snapshots.

## Audit Requirements

- Log actor or service identity for every pricing profile, channel rule, commission rule, exception, override, import preview, validation preview, calculation, quote-like result, snapshot, PO variance review, and permission-sensitive lookup.
- Log tenant scope, affected subject references, effective dates, rule versions, commission versions, channel, exception/override references, input versions, redaction class, and requested output class.
- Preserve immutable audit references for order-time, procurement, export, invoice, return/refund, and historical snapshot review.
- Protect sensitive commercial details from unauthorized logs, events, notifications, exports, analytics feeds, dead-letter queues, and AI prompts.
