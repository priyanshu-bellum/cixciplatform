# CIXCI Module Registry

This index is a developer-facing guide for reviewing the CIXCI platform rebuild Phase 1 architecture documentation. It is not a source of new architecture behavior. Module specs, sub-contracts, ADRs, and committed module files remain authoritative.

## Phase 1 Rebuild Estimate Readiness

The repo is partially estimate-ready for the CIXCI platform rebuild Phase 1. Several bounded contexts have enough functional documentation for an outside developer to estimate implementation effort. Some areas remain partially documented or referenced/planned only.

Product Catalog should be reviewed with PR #77 through PR #83 and Product Catalog Section 12 Validation Rules work, not from older main-only assumptions.

## Estimate-Ready Modules

- Tenant Company / Company Foundation - `tenant-company-model`
- Device Catalog - estimate-ready with documented caveats - `device-catalog`
  - Phase 1 System Admin CSV import, Device References, Buyer Device Portfolio References, Device Image Readiness References, feature evidence foundation, import/review workflows, API placeholders, events/signals, test scenarios, and edge cases are documented. Remaining caveats: exact Device Capability Profile content, OpenAPI schemas, platform event/versioning/redaction standards, and future manufacturer/distributor/API ingestion.
- Pricing - `pricing`
- Media / Image Asset Management - `media-image-asset-management`
- Integration Management - `integration-management`
- Order Routing - `order-routing`
- Fulfillment / Returns - `fulfillment-returns`
- Procurement / Purchase Orders - `procurement-purchase-orders`
- Invoice Management - `invoice-management`
- Logs & Audit File Tracking - `logs-audit-file-tracking`
- Notification Platform Service - `notification-platform-service`

## Partially Estimate-Ready Modules

- Product Catalog - `product-catalog`
  - Current committed docs should be reviewed alongside accepted Product Catalog hardening work and Section 12 Validation Rules.
- Analytics / Reporting - `analytics-reporting`
  - Reporting read model concepts and AI/analytics hooks exist. Workflows, APIs, exports, refresh behavior, and metric implementation need more definition.
- Launch / Event Management - `launch-event-management`
  - Boundary and launch/event concepts are documented. Readiness checklist behavior, transition rules, and event execution detail need more definition.

## Referenced / Planned Only

- AI Agent Services
  - Currently represented through Analytics / Reporting AI-facing governance and hooks. Not yet a standalone module-complete bounded context.
- Warranty Registration / Claims
  - Referenced by other modules and ADR guidance. Not yet module-complete in `/modules`.
- User Roles, Vendor Onboarding, and Buyer Onboarding
  - Represented through Tenant Company / Company Foundation concepts rather than standalone module-complete bounded contexts.

## Module Directories

- `_template`
- `analytics-reporting`
- `architecture`
- `device-catalog`
- `fulfillment-returns`
- `integration-management`
- `invoice-management`
- `launch-event-management`
- `logs-audit-file-tracking`
- `media-image-asset-management`
- `notification-platform-service`
- `order-routing`
- `pricing`
- `procurement-purchase-orders`
- `product-catalog`
- `tenant-company-model`

## Review Guidance For Phase 1 Estimate

Developers should begin with Tenant Company, Product Catalog, Device Catalog, Pricing, Media, Integration, Notification, Logs & Audit, Order Routing, Fulfillment / Returns, Procurement, and Invoice Management.

This index is for navigation and estimate readiness only. It does not change module ownership, source-of-truth boundaries, API contracts, event contracts, permissions, validation rules, or implementation scope.
