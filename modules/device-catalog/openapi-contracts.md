# Device Catalog OpenAPI Contracts

Use this draft to document implementation-oriented API specifications for Device Catalog. Details remain proposal-level and should not finalize business rules.

## API Purpose

Provide versioned APIs for canonical device lookup, Device Reference resolution, device import, buyer device export/download, and buyer device portfolio references.

## Service Ownership

Device Catalog owns these API contracts for canonical device data. Tenant Company, Product Catalog, Pricing, Order Routing, Fulfillment, buyer-facing modules, and future Procurement own their respective downstream decisions.

## Endpoint Inventory

- Placeholder: `GET /devices`
- Placeholder: `GET /devices/{deviceId}`
- Placeholder: `GET /device-references/{deviceReferenceId}`
- Placeholder: `POST /device-imports`
- Placeholder: `GET /device-imports/{importBatchId}`
- Placeholder: `POST /device-exports`
- Placeholder: `GET /device-exports/{exportId}`
- Placeholder: `POST /buyer-device-portfolio-references`
- Placeholder: `DELETE /buyer-device-portfolio-references/{referenceId}`

## Request Methods

- `GET` for lookup, search, detail, import status, and export status.
- `POST` for import submission, export request, portfolio reference creation, and proposal-level workflow starts.
- `PATCH` placeholder for controlled admin correction or lifecycle updates if allowed.
- `DELETE` placeholder for removing buyer portfolio references, not deleting canonical device records.

## Path Parameters

- Placeholder: `deviceId`
- Placeholder: `deviceReferenceId`
- Placeholder: `importBatchId`
- Placeholder: `exportId`
- Placeholder: `referenceId`

## Query Parameters

- Placeholder: manufacturer, brand, model, variant, taxonomy, lifecycle status, carrier, region, updated-since, and source-system filters.
- Placeholder: tenant, buyer, parent company, child entity, and relationship scope filters where authorized.
- Placeholder: pagination, sorting, and version filters.

## Request Body Schema

- Placeholder: device import request body.
- Placeholder: buyer export request body.
- Placeholder: buyer portfolio reference request body.
- Placeholder: admin correction request body if confirmed.

## Response Schemas

- Placeholder: device summary response.
- Placeholder: device detail response.
- Placeholder: Device Reference response.
- Placeholder: import result response.
- Placeholder: export result response.
- Placeholder: portfolio reference response.

## Error Models

- Placeholder: validation error.
- Placeholder: unauthorized or forbidden scope error.
- Placeholder: device not found or Device Reference unavailable error.
- Placeholder: duplicate identifier or normalization conflict error.
- Placeholder: import partial failure error.
- Placeholder: export unavailable or scope denied error.

## Authentication / Authorization

- Placeholder: require authenticated caller identity.
- Placeholder: use Tenant Company tenant scope, role, entity access, and relationship eligibility for buyer-visible and export operations.
- Placeholder: separate admin correction permissions from buyer export permissions.

## Idempotency Rules

- Placeholder: imports should use an idempotency key or source-system record identity.
- Placeholder: export requests should be deduplicated where retrying the same export request is expected.
- Placeholder: portfolio reference creation should not create duplicate references for the same authorized scope and Device Reference.

## Rate Limits / Throttling

- Placeholder: define separate limits for search/detail, bulk export, import, and operational admin APIs.
- Placeholder: define buyer export throttling to protect downstream channels and platform performance.

## Pagination Standards

- Placeholder: all list endpoints should support consistent pagination.
- Placeholder: large exports should use asynchronous export jobs or signed download references rather than unbounded synchronous responses.

## Versioning Strategy

- Placeholder: version APIs and export contracts where breaking field, identifier, or response shape changes are introduced.
- Placeholder: Device Reference stability rules must be documented before downstream modules store references.

## Webhook Dependencies

- Placeholder: manufacturer or external feed webhooks may trigger imports or source record updates.
- Placeholder: downstream modules should prefer Device Catalog events for lifecycle changes where possible.

## Audit / Logging Requirements

- Placeholder: log device create, update, merge, split, retire, import, export, and buyer portfolio reference changes.
- Placeholder: log failed authorization, denied export, and import failure events.

## Example OpenAPI Snippet

```yaml
openapi: 3.0.0
info:
  title: Device Catalog API
  version: 0.0.0
paths:
  /device-references/{deviceReferenceId}:
    get:
      summary: Resolve a Device Reference
      parameters:
        - name: deviceReferenceId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Placeholder Device Reference response
        '404':
          description: Placeholder not found response
```

## Open Questions

- Which endpoints are public, partner-facing, buyer-facing, or internal only?
- Should buyer exports be synchronous, asynchronous, or both?
- Which Device Reference changes are breaking for downstream consumers?
