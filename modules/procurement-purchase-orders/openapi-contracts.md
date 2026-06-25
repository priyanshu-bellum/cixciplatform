# Procurement / Purchase Orders OpenAPI Contract Notes

This document is proposal-level architecture for future OpenAPI contracts. It is not an implementation-ready API specification.

## Contract Goals

Future OpenAPI contracts should expose Procurement / Purchase Orders capabilities for PO draft creation, PO line management, target validation, approval workflow, pricing evidence review, submission, vendor/manufacturer response tracking, revisions, status lookup, receiving placeholders, and exception review.

## Common Request Fields

Proposal-level request fields:

- `tenantScopeRef`.
- `buyerParentRef`.
- `buyerEntityRef`.
- `actorRef`.
- `sellerTargetRef`.
- `sellerTargetType`.
- `targetCardinality` placeholder.
- `vendorTargetRef`.
- `manufacturerTargetRef`.
- `productType`.
- `productCatalogProductRef`.
- `deviceReference`.
- `requestedQuantity`.
- `pricingSnapshotRef`.
- `pricingSnapshotVersionHash` placeholder.
- `pricingBindabilityStatus` placeholder.
- `quoteLikeResultRef`.
- `requestedPrice`.
- `acceptedPriceSource` placeholder.
- `acceptedPriceVariance` placeholder.
- `approvalPolicyRef` placeholder.
- `approvalPolicyVersion` placeholder.
- `approvalEvidenceRef` placeholder.
- `shippingDestinationRef` placeholder.
- `receivingLocationRef` placeholder.
- `requestedDeliveryDate` placeholder.
- `integrationMethodRef`.
- `externalPoRef` placeholder.
- `externalLineRef` placeholder.
- `responseDedupeKey` placeholder.
- `idempotencyKey`.

## Common Response Fields

Proposal-level response fields:

- `purchaseOrderId`.
- `purchaseOrderLineIds`.
- `status`.
- `targetConflictState`.
- `approvalRef`.
- `approvalEvidenceRef`.
- `pricingReviewState`.
- `submissionRef`.
- `externalPoRef`.
- `externalReferenceConflictState`.
- `vendorResponseRef`.
- `manufacturerResponseRef`.
- `responseAggregationState` placeholder.
- `revisionRef`.
- `supersessionRef`.
- `receivingPlaceholderRef`.
- `exceptionRef`.
- `auditRef`.
- `createdAt` / `updatedAt`.

## Endpoint Groups

### Drafts And Lines

- `POST /procurement/purchase-orders`
- `GET /procurement/purchase-orders/{purchaseOrderId}`
- `PATCH /procurement/purchase-orders/{purchaseOrderId}`
- `POST /procurement/purchase-orders/{purchaseOrderId}/lines`
- `PATCH /procurement/purchase-orders/{purchaseOrderId}/lines/{lineId}`
- `DELETE /procurement/purchase-orders/{purchaseOrderId}/lines/{lineId}`
- `POST /procurement/purchase-orders/{purchaseOrderId}/validate`
- `POST /procurement/purchase-orders/{purchaseOrderId}/validate-targets` placeholder.

### Approval

- `POST /procurement/purchase-orders/{purchaseOrderId}/approval-request`
- `POST /procurement/purchase-orders/{purchaseOrderId}/approve`
- `POST /procurement/purchase-orders/{purchaseOrderId}/reject`
- `POST /procurement/purchase-orders/{purchaseOrderId}/approval-escalation-placeholder`
- `GET /procurement/purchase-orders/{purchaseOrderId}/approvals`

### Pricing Evidence

- `POST /procurement/purchase-orders/{purchaseOrderId}/pricing-evidence/validate` placeholder.
- `GET /procurement/purchase-orders/{purchaseOrderId}/pricing-review-state` placeholder.

### Submission

- `POST /procurement/purchase-orders/{purchaseOrderId}/submit`
- `GET /procurement/purchase-orders/{purchaseOrderId}/submission-status`
- `POST /procurement/purchase-orders/{purchaseOrderId}/submission-retry-placeholder`
- `POST /procurement/purchase-orders/{purchaseOrderId}/document-export-placeholder`

### Responses

- `POST /procurement/purchase-orders/{purchaseOrderId}/vendor-response`
- `POST /procurement/purchase-orders/{purchaseOrderId}/manufacturer-response`
- `POST /procurement/purchase-orders/{purchaseOrderId}/line-response-placeholder`
- `GET /procurement/purchase-orders/{purchaseOrderId}/response-aggregation-placeholder`

### Revision, Cancellation, Close

- `POST /procurement/purchase-orders/{purchaseOrderId}/revision`
- `POST /procurement/purchase-orders/{purchaseOrderId}/cancel`
- `POST /procurement/purchase-orders/{purchaseOrderId}/close`
- `GET /procurement/purchase-orders/{purchaseOrderId}/revision-history`

### Receiving Placeholders

- `POST /procurement/purchase-orders/{purchaseOrderId}/receiving-placeholder`
- `PATCH /procurement/purchase-orders/{purchaseOrderId}/receiving-placeholder/{receivingPlaceholderId}`

### Search / Lookup

- `GET /procurement/purchase-orders`
- `GET /procurement/purchase-orders/{purchaseOrderId}/events`
- `GET /procurement/purchase-orders/review-required`
- `GET /procurement/purchase-orders/bulk-status-placeholder`

## Security And Boundary Notes

Future contracts should require authorization through Tenant Company scope, roles, permissions, activation/readiness, buyer/vendor/manufacturer eligibility, Product Type enablement, and licensed-property scope where applicable.

OpenAPI contracts must not expose mutation endpoints for normal customer routed suborders, Pricing calculation, Product Catalog records, Device Catalog records, Fulfillment/Returns execution, Invoice lifecycle, payment processing, Integration credential state, Logs & Audit evidence, Notification delivery, Analytics metrics, Media assets, or AI recommendations.

## Error Shapes

Proposal-level errors should include error code, message, affected PO/line reference, source module reference where applicable, review-required flag, and audit reference placeholder.

Errors should cover target cardinality conflicts, approval evidence gaps, pricing evidence bindability failures, response aggregation conflicts, external PO reference conflicts, scale-limit review states, and boundary violations.