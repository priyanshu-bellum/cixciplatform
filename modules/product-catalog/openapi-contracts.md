# Product Catalog OpenAPI Contracts

Use this draft to shape implementation-oriented API specifications. Endpoint names, schemas, and behaviors are placeholders until confirmed.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery and buyer selection behavior. OpenAPI implementation should reference that sub-contract for detailed confirmation-line, export disposition, and buyer relationship advancement rules.

## API Purpose

Expose Product Catalog ingestion, product lookup, compatibility lookup, lifecycle/availability visibility, accessory discovery, buyer selection, export confirmation, buyer export/download, Buyer Selling Status, Pricing handoff references, media attachment references, and admin oversight capabilities through versioned APIs.

## Service Ownership

- Owning bounded context: Product Catalog.
- Dependencies: Tenant Company, Device Catalog, Pricing, Media / Image Asset Management, Notification Platform Service, Integration Management, Logs & Audit, Procurement, Launch / Event Management, Analytics, AI Agent Services.
- Product Catalog owns product records, catalog state, accessory discovery projections, export apply disposition, and buyer-product relationship state only.

## Endpoint Inventory

- `POST /catalog/v1/products/imports` placeholder for API-first or CSV-backed ingestion job creation.
- `GET /catalog/v1/products/imports/{importId}` placeholder for import status/preview/error report references.
- `POST /catalog/v1/products/imports/{importId}/confirm` placeholder for import confirmation.
- `GET /catalog/v1/products` placeholder for product search/list.
- `GET /catalog/v1/products/latest` placeholder for Latest Accessories lookup by buyer scope.
- `GET /catalog/v1/products/{productId}` placeholder for product detail.
- `GET /catalog/v1/products/{productId}/compatibility` placeholder for compatibility lookup.
- `POST /catalog/v1/products/{productId}/compatibility/imports` placeholder for compatibility Add/Replace/Remove import jobs.
- `GET /catalog/v1/products/{productId}/buyer-status` placeholder for buyer-facing derived status.
- `POST /catalog/v1/products/{productId}/activations` placeholder for buyer activation/download request.
- `POST /catalog/v1/products/{productId}/exports` placeholder for buyer export/download action.
- `POST /catalog/v1/products/{productId}/buyer-selling-status` placeholder for Buyer Selling Status changes.
- `GET /catalog/v1/accessories/discovery-context` placeholder for buyer accessory discovery context and My Devices prerequisite state.
- `GET /catalog/v1/accessories` placeholder for accessory search/list with combined filters.
- `POST /catalog/v1/accessories/selection-sets` placeholder for buyer accessory selection sets.
- `POST /catalog/v1/accessories/export-confirmations` placeholder for export confirmation creation with confirmation-line eligibility records.
- `GET /catalog/v1/accessories/export-confirmations/{confirmationId}` placeholder for export confirmation summary and line dispositions.
- `POST /catalog/v1/accessories/export-confirmations/{confirmationId}/recheck` placeholder for pre-confirm source evidence recheck.
- `POST /catalog/v1/accessories/export-confirmations/{confirmationId}/cancel` placeholder for cancellation without losing selection state.
- `POST /catalog/v1/accessories/export-confirmations/{confirmationId}/confirm` placeholder for confirmed export apply.
- `GET /catalog/v1/accessories/exports/{exportId}/disposition` placeholder for export apply, delivery reference, baseline, and buyer relationship advancement disposition.
- `POST /catalog/v1/buyer-accessory-relationships/{relationshipId}/stop-selling` placeholder for single-item Stop Selling.
- `POST /catalog/v1/buyer-accessory-relationships/bulk-stop-selling` placeholder for bulk Stop Selling.
- `GET /catalog/v1/admin/buyer-context/accessories` placeholder for System Admin buyer-context catalog view.
- `POST /catalog/v1/admin/buyer-context/act-on-behalf-requests` placeholder for act-on-behalf request reference.
- `GET /catalog/v1/admin/health` placeholder for System Admin catalog health oversight.

## Request Methods

- `GET` for read/query operations.
- `POST` for imports, activation/download/export commands, accessory selection/export confirmation commands, compatibility import jobs, and Buyer Selling Status changes.
- Placeholder: decide whether direct product updates use `PUT`, `PATCH`, or import/application jobs.

## Query Parameters

- Tenant/company/entity scope, subject to Tenant Company rules.
- Buyer scope.
- Vendor scope.
- Product Type.
- Device Reference.
- My Devices portfolio reference.
- Compatibility filter.
- Lifecycle state.
- Availability state.
- Release Date / Launch Date / EOL Date range.
- Latest since last successful export flag.
- Retail/sales channel eligibility.
- Buyer Selling Status.
- Derived buyer-facing status.
- Accessory discovery context reference.
- Selection set reference.
- Export confirmation reference.
- Export disposition state.
- Pagination and sorting parameters.

## Product Schemas

Product summary/detail schemas should support:

- Product id, product master id, variant id.
- Vendor, brand, Product Type.
- Accessory name.
- SKU and UPC as text identifiers.
- Product category/subcategory.
- Vendor color, normalized System Color, and structured color assignments.
- Variant attributes.
- Compatibility reference summary.
- Catalog-carried pricing input or Pricing-provided price/snapshot reference where authorized.
- Lifecycle state.
- Availability state.
- Release Date, Launch Date, EOL Date.
- EOL sell-through policy reference.
- Buyer Selling Status where buyer scope is supplied.
- Buyer-facing derived status where buyer scope is supplied.
- Sales channel eligibility summary.
- Media attachment/readiness reference.
- Export/download status summary.
- Accessory discovery/export disposition summary where buyer scope is supplied.

## Accessory Discovery Schemas

Accessory discovery schemas should support proposal-level references for:

- Buyer Accessory Discovery Context.
- Selected Device Filter State.
- Buyer Accessory Search / Filter State.
- Buyer Accessory Selection Set.
- Accessory Export Confirmation Record.
- Accessory Export Confirmation Line / Selected Accessory Eligibility Line.
- Buyer Accessory Export Baseline.
- Per-Buyer Accessory Relationship State.
- Admin Buyer Context View.

Accessory Export Confirmation Line should carry product/variant reference, product source version/hash, visibility projection reference/version, compatibility evidence reference/version, lifecycle/availability/channel/buyer access dispositions, buyer account status evidence reference, already exported state, warning/blocker classification, stale/missing/conflicting evidence state, recheck-before-confirm flag, selected/applied/ignored/blocked state, resulting export line reference, resulting buyer relationship update reference, review state, supersession reference, and audit reference.

## Import Schemas

Import schemas should align with `architecture/standards/import-export-validation-governance.md`.

Include proposal-level fields for import mode, create/update behavior, preview reference, validation errors/warnings, confirmation state, destructive action evidence, row counts, error report reference, and audit reference.

## Compatibility Import Schemas

Compatibility import request should include:

- Product/variant reference.
- Import mode: Add, Replace, Selective Remove.
- Device Reference list or file reference.
- Preview/confirmation behavior.
- Idempotency key.

Compatibility response should include added/removed/unchanged/review-required counts, missing or stale Device Reference errors, preview warning references, and audit reference.

## Buyer Export / Latest Accessories Schemas

Buyer export response should include:

- Export id.
- Buyer scope.
- Export method.
- Export status.
- Export timestamp.
- Last successful export timestamp.
- Exported product lookup reference.
- Confirmation line references.
- Export apply disposition.
- Delivery disposition reference where applicable.
- Baseline advancement reference.
- File/export reference.
- Integration delivery reference where applicable.
- Logs & Audit evidence reference where applicable.
- Redaction class.

Latest Accessories response should indicate disabled/unavailable when no successful applicable prior export baseline exists.

## Buyer Selling Status Schema

Request should include product/variant reference, buyer scope, requested status, reason, actor/service, source export/confirmation reference where applicable, and idempotency key.

Response should include prior status, new status, export apply disposition where applicable, delivery disposition reference where applicable, baseline advancement reference where applicable, effective timestamp, audit reference, and integration/update signal reference where applicable.

## Error Models

- `CatalogValidationError`.
- `CatalogHeaderValidationError`.
- `CatalogIdentifierConflictError`.
- `CatalogLockedFieldError`.
- `CatalogCompatibilityReferenceError`.
- `CatalogUnauthorizedScopeError`.
- `CatalogPricingEvidenceUnavailableError`.
- `CatalogMediaEvidenceUnavailableError`.
- `CatalogLaunchConflictReviewRequired`.
- `CatalogAccessoryExportConfirmationLineBlocked`.
- `CatalogAccessoryExportEvidenceStaleError`.
- `CatalogAccessoryExportApplyFailed`.
- `CatalogBuyerRelationshipAdvancementBlocked`.
- `CatalogDestructiveConfirmationRequired`.
- `CatalogImportPartialFailure`.

## Authentication / Authorization

Tenant Company owns users, roles, permissions, company/entity scope, relationship eligibility, channel eligibility, buyer account status, act-on-behalf authority, and configuration inputs. Product Catalog consumes those inputs and must not infer them.

## Idempotency Rules

- Imports require import idempotency keys.
- Compatibility import modes require idempotency keys.
- Buyer export/download actions should be idempotent by request/action key.
- Accessory export confirmation creation, recheck, cancellation, and confirmation should be idempotent by buyer/selection/confirmation/action key.
- Confirmation line application should be idempotent by confirmation line id and product/version evidence.
- Buyer Selling Status changes should be idempotent by buyer/product/action key.

## Rate Limits / Throttling

Placeholder controls:

- Product search/list pagination.
- Accessory discovery pagination.
- Accessory search/filter throttling.
- Bulk selection/export confirmation limits.
- Bulk Stop Selling limits.
- Bulk import throttling.
- Compatibility import limits.
- Export/download throttling.
- Buyer derived-status lookup rate limits.
- Admin buyer-context query limits.
- Admin health dashboard query limits.

## Audit / Logging Requirements

Product Catalog should record catalog change history. Logs & Audit owns immutable audit/file evidence.

Meaningful ingestion, lifecycle, availability, compatibility, media attachment, pricing input, accessory discovery context access where sensitive, buyer export/download, export confirmation, confirmation-line recheck/apply, Buyer Selling Status, admin buyer-context, and visibility changes should be audit-ready.

## Example OpenAPI Snippet

```yaml
openapi: 3.0.0
info:
  title: Product Catalog API
  version: 0.1.0
paths:
  /catalog/v1/accessories/export-confirmations:
    post:
      summary: Placeholder accessory export confirmation endpoint
      responses:
        '202':
          description: Placeholder confirmation created response
  /catalog/v1/accessories/export-confirmations/{confirmationId}/confirm:
    post:
      summary: Placeholder export confirmation apply endpoint
      responses:
        '202':
          description: Placeholder export apply accepted response
  /catalog/v1/products/{productId}/buyer-selling-status:
    post:
      summary: Placeholder Buyer Selling Status change endpoint
      responses:
        '202':
          description: Placeholder status change accepted response
```

## Open Questions

- Which endpoint families are public, partner-facing, internal, or admin-only?
- Which export schemas are buyer-specific?
- Which direct write operations are allowed outside import jobs?
- Which fields are exposed in buyer-facing derived status responses?
- Which confirmation-line blocker classifications are fatal versus warning-only by buyer/channel/Product Type?
