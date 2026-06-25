# ADR-0003: Initial Bounded Contexts

## Status
Proposed

## Context
CIXCI is a multi-tenant B2B SaaS platform with multiple domains. To avoid creating one large tangled system, the platform needs clear bounded contexts before API, data model, and workflow design begins.

## Decision
Define these initial bounded contexts as a boundary proposal, not final implementation design:

- Tenant Company
- Catalog
- Pricing
- Order Routing
- Fulfillment
- Analytics

Module-level specifications must align with this ADR. Where module specs need boundaries that differ from this proposal, the difference should be captured as an open question or a future architecture decision.

This ADR does not define final business rules. Use placeholders where decisions are not finalized.

## Tenant Company

### Purpose
Define the company, tenant, parent/child entity, user, role, and permission boundaries for the platform.

### Owns
- Placeholder: tenant and company hierarchy rules
- Placeholder: user-to-company/entity access relationships
- Placeholder: role and permission assignment boundaries

### Does Not Own
- Catalog product data ownership
- Pricing calculation rules
- Order routing decisions
- Fulfillment execution
- Analytics aggregation rules

### Key Entities
- Parent Company
- Child Entity
- User
- Role
- Permission Set
- Visibility Relationship

### Main Integrations/Events
- Placeholder: tenant/company created or updated events
- Placeholder: user access changed events
- Placeholder: permission assignment changed events

### Open Questions
- Can a child entity ever move between parent companies?
- Which permissions inherit from parent to child entities?
- Which tenant/company changes require audit events?

## Catalog

### Purpose
Define product, device, accessory, and catalog visibility boundaries.

### Owns
- Placeholder: product and accessory catalog records
- Placeholder: device compatibility records
- Placeholder: catalog visibility metadata

### Does Not Own
- Tenant hierarchy rules
- Final buyer-specific pricing rules
- Order routing decisions
- Fulfillment state
- Analytics reporting models

### Key Entities
- Accessory Product
- Device
- Product Activation
- Visibility Relationship

### Main Integrations/Events
- Placeholder: product created or updated events
- Placeholder: device compatibility updated events
- Placeholder: catalog visibility changed events

### Open Questions
- Which catalog data is read-only source data?
- Which fields can vendors, buyers, or admins edit?
- How should catalog visibility interact with buyer/vendor relationships?

## Pricing

### Purpose
Define price, pricing profile, discount, and quote-related boundaries.

### Owns
- Placeholder: pricing profiles
- Placeholder: price calculation inputs
- Placeholder: pricing overrides or exceptions

### Does Not Own
- Catalog product ownership
- Tenant/company hierarchy
- Order routing execution
- Fulfillment status
- Analytics aggregation rules

### Key Entities
- Pricing Profile
- Price Rule
- Price Override
- Quote Placeholder

### Main Integrations/Events
- Placeholder: price changed events
- Placeholder: pricing profile assigned events
- Placeholder: quote requested events

### Open Questions
- Which pricing rules are tenant-specific, buyer-specific, or vendor-specific?
- What approval flow is required for pricing overrides?
- Which pricing changes require audit logging?

## Order Routing

### Purpose
Define order intake, routing, parent order, and vendor suborder boundaries.

### Owns
- Placeholder: routing decision workflow
- Placeholder: parent order orchestration
- Placeholder: vendor suborder creation boundaries

### Does Not Own
- Product catalog source data
- Price calculation source rules
- Physical fulfillment execution
- Analytics rollups
- Tenant permission definitions

### Key Entities
- Parent Order
- Vendor Suborder
- Routing Rule Placeholder
- Routing Decision Placeholder

### Main Integrations/Events
- Placeholder: order submitted events
- Placeholder: order routed events
- Placeholder: vendor suborder created events

### Open Questions
- What inputs are required for routing decisions?
- Can routing decisions be manually overridden?
- How should failed routing attempts be retried or escalated?

## Fulfillment

### Purpose
Define shipment, return, fulfillment status, and operational execution boundaries.

### Owns
- Placeholder: shipment status
- Placeholder: return request status
- Placeholder: fulfillment lifecycle events

### Does Not Own
- Initial order routing decisions
- Catalog product ownership
- Pricing rules
- Tenant hierarchy rules
- Analytics reporting definitions

### Key Entities
- Shipment
- Return Request
- Fulfillment Status Placeholder
- Tracking Placeholder

### Main Integrations/Events
- Placeholder: shipment created events
- Placeholder: shipment status changed events
- Placeholder: return requested events

### Open Questions
- Which fulfillment responsibilities belong to vendors versus CIXCI?
- Which shipment or return events require buyer visibility?
- Which fulfillment exceptions require admin override?

## Analytics

### Purpose
Define reporting, rollups, metrics, and analytical read-model boundaries.

### Owns
- Placeholder: reporting models
- Placeholder: metric definitions
- Placeholder: parent/entity rollup views

### Does Not Own
- Source-of-record transactional data
- Tenant hierarchy source rules
- Catalog source records
- Pricing source rules
- Fulfillment execution state

### Key Entities
- Report Placeholder
- Metric Placeholder
- Rollup View Placeholder
- Analytics Snapshot Placeholder

### Main Integrations/Events
- Placeholder: consume tenant/company events
- Placeholder: consume catalog events
- Placeholder: consume order and fulfillment events
- Placeholder: analytics snapshot refreshed events

### Open Questions
- Which reporting dimensions are required by parent and child entities?
- What data latency is acceptable for analytics?
- Which metrics are platform-wide versus tenant-specific?

## Consequences
- The platform has initial boundaries for API, data model, and workflow design discussions.
- Module-level specs have a proposed context map to align against.
- Open questions remain explicit instead of being converted into final business rules prematurely.
- Future decisions can refine, split, merge, or rename these bounded contexts.
