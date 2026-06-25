# Order Routing OpenAPI Contracts

This document is proposal-level and implementation-oriented. It sketches possible OpenAPI contract structure without finalizing URLs, payloads, schemas, authentication, or deployment design.

## API Purpose

Expose route evaluation, route execution, routed order lookup, routing snapshot lookup, vendor routed-suborder export eligibility/batch/item/re-export/manual-download placeholders, routing-to-fulfillment handoff request and disposition-reference placeholders, routing exception review, routing retry, and routing supersession endpoints for authorized platform consumers.

## Service Ownership

Order Routing owns these endpoints only for routing decisions, route evaluation, route execution, suborder structure, routing snapshots, vendor routed-suborder export eligibility records, export batch/item workflow references, routing-to-fulfillment handoff request references, Fulfillment/Returns disposition references, routing exceptions, routing retry/review workflows, and routing supersession records.

Order Routing endpoints must not mutate fulfillment execution, shipment/tracking/delivery state, returns, refunds, invoices, external transport state, scheduled email delivery, or immutable Logs & Audit file evidence.

## Endpoint Inventory

Proposal-level endpoint candidates:

- `POST /order-routing/route-evaluations`
- `POST /order-routing/route-executions`
- `GET /order-routing/routed-orders/{routedOrderId}`
- `GET /order-routing/parent-orders/{parentOrderId}/routing`
- `GET /order-routing/routing-snapshots/{routingSnapshotId}`
- `GET /order-routing/routing-exceptions/{routingExceptionId}`
- `POST /order-routing/routing-exceptions/{routingExceptionId}/review-actions`
- `POST /order-routing/routing-exceptions/{routingExceptionId}/retry`
- `POST /order-routing/routing-snapshots/{routingSnapshotId}/supersessions`
- `GET /order-routing/vendor-suborders/{vendorSuborderId}`
- `GET /order-routing/manufacturer-suborders/{manufacturerSuborderId}`
- `POST /order-routing/vendor-exports/eligibility`
- `POST /order-routing/vendor-exports/batches`
- `GET /order-routing/vendor-exports/batches/{exportBatchId}`
- `GET /order-routing/vendor-exports/batches/{exportBatchId}/items`
- `GET /order-routing/vendor-exports/batch-items/{exportBatchItemId}`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/re-export-requests`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/manual-downloads`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/buyer-splits`
- `GET /order-routing/vendor-exports/review-records`
- `POST /order-routing/fulfillment-handoffs`
- `POST /order-routing/fulfillment-handoffs/{handoffRequestId}/disposition-references`
- `GET /order-routing/fulfillment-handoffs/{handoffRequestId}`

## Request Methods

- `POST` for route evaluation, route execution, vendor export eligibility creation, vendor export batch creation, buyer split creation, re-export requests, manual download records, fulfillment handoff requests, Fulfillment/Returns disposition reference recording, retries, review actions, and supersession actions.
- `GET` for routed order, snapshot, exception, suborder, vendor export batch, export batch item, fulfillment handoff request, and vendor export review lookup.

## Path Parameters

- `routedOrderId`
- `parentOrderId`
- `routingSnapshotId`
- `routingExceptionId`
- `vendorSuborderId`
- `manufacturerSuborderId`
- `exportBatchId`
- `exportBatchItemId`
- `handoffRequestId`

## Query Parameters

- `tenantScope`
- `parentOrderId`
- `routingState`
- `exceptionFamily`
- `exceptionType`
- `reviewState`
- `routingPolicyVersion`
- `productType`
- `vendorReference`
- `buyerEntityReference`
- `exportStatus`
- `includedExcludedStatus`
- `exportWindowStart`
- `exportWindowEnd`
- `exportSchemaVersion`
- `exportInclusionRuleVersion`
- `splitByBuyer`
- `handoffState`
- `fulfillmentDispositionState`
- `createdAfter`
- `createdBefore`
- `includeSnapshots`
- `includeExceptions`

## Request Body Schema

Proposal-level route evaluation / execution fields:

- `parentOrderReference`
- `tenantScopeReference`
- `orderLines[]`
- `orderLines[].lineReference`
- `orderLines[].productCatalogReference`
- `orderLines[].deviceReference`
- `orderLines[].productType`
- `orderLines[].quantity`
- `orderLines[].pricingSnapshotReference`
- `orderLines[].warrantyRegistrationRequired`
- `relationshipEligibilityReference`
- `fulfillmentCapabilityReference`
- `routingPolicyVersion`
- `requestedMode`: `evaluate` / `execute`
- `routingInputHash`
- `correlationId`
- `idempotencyKey`

Proposal-level vendor export request fields:

- `parentOrderReference`
- `vendorReference`
- `buyerEntityReference`
- `tenantScopeReference`
- `routedSuborderReferences[]`
- `routingSnapshotReferences[]`
- `exportWindow`
- `sourceEventReference`
- `sourceVersion`
- `exportSchemaVersion`
- `exportInclusionRuleVersion`
- `splitByBuyer`
- `buyerRetailerSplitReference`
- `reExportRequestReference`
- `manualDownloadAuthorizationReference`
- `requestedDeliveryModeReference`
- `batchIdempotencyKey`
- `correlationId`
- `idempotencyKey`

Proposal-level export batch item fields:

- `exportBatchReference`
- `routedSuborderReference`
- `routingSnapshotReference`
- `eligibilityRecordReference`
- `includedExcludedStatus`
- `includedExcludedReason`
- `priorExportMembershipReference`
- `reExportReason`
- `duplicatePreventionKey`
- `sourceEventReference`
- `sourceVersion`

Proposal-level fulfillment handoff request fields:

- `routedOrderReference`
- `routedSuborderReference`
- `exportBatchItemReference`
- `vendorSuborderReferences[]`
- `routingSnapshotReferences[]`
- `downstreamFulfillmentInstructionPlaceholder`
- `handoffSourceVersion`
- `handoffIdempotencyKey`
- `correlationId`
- `idempotencyKey`

Proposal-level Fulfillment/Returns disposition reference fields:

- `fulfillmentReturnsDispositionReference`
- `fulfillmentReturnsSourceVersion`
- `acceptedRejectedIgnoredState`
- `appliedVsIgnoredState`
- `sourceEventReference`
- `idempotencyKey`

## Response Schemas

Proposal-level route evaluation response fields:

- `evaluationId`
- `parentOrderReference`
- `candidateRoutes[]`
- `blockingExceptions[]`
- `warnings[]`
- `routingRuleConflicts[]`
- `executionAllowed`
- `routingPolicyVersion`
- `correlationId`

Proposal-level route execution response fields:

- `routedOrderId`
- `parentOrderReference`
- `routingState`
- `routingSnapshotReference`
- `vendorSuborders[]`
- `manufacturerSuborders[]`
- `routingExceptions[]`
- `fulfillmentInstructionPlaceholders[]`
- `warrantyRegistrationRequiredSignals[]`
- `decisionSummary`
- `supersessionReference`
- `correlationId`

Proposal-level vendor export eligibility response fields:

- `vendorOrderExportEligibilityRecord`
- `routedSuborderReference`
- `vendorReference`
- `buyerEntityReference`
- `tenantScopeReference`
- `eligibilityStatus`
- `eligibilityReason`
- `exclusionReason`
- `priorExportState`
- `reExportAllowedFlag`
- `supersessionCancellationState`
- `exportWindow`
- `sourceEventReference`
- `sourceVersion`
- `exportInclusionRuleVersion`
- `reviewRequiredState`
- `auditReference`
- `correlationId`

Proposal-level vendor export batch response fields:

- `routedSuborderExportBatchReference`
- `vendorOrderExportBatchItemReferences[]`
- `vendorOrderExportContentReference`
- `exportSchemaVersion`
- `exportWindow`
- `exportInclusionRuleVersion`
- `exportSplitByBuyerFlag`
- `buyerRetailerSplitReferences[]`
- `reExportRequestReference`
- `exportStatusReference`
- `manualDownloadEligibility`
- `fulfillmentHandoffRequestReferences[]`
- `routingSnapshotReferences[]`
- `auditReference`
- `correlationId`

Proposal-level export batch item response fields:

- `exportBatchItemId`
- `exportBatchReference`
- `routedSuborderReference`
- `routingSnapshotReference`
- `eligibilityRecordReference`
- `includedExcludedStatus`
- `includedExcludedReason`
- `priorExportMembershipReference`
- `reExportReason`
- `duplicatePreventionKey`
- `sourceEventReference`
- `sourceVersion`
- `resultingFulfillmentHandoffRequestReference`
- `reviewRequiredState`
- `auditReference`

Proposal-level fulfillment handoff response fields:

- `fulfillmentHandoffRequestId`
- `routedOrderReference`
- `routedSuborderReference`
- `exportBatchItemReference`
- `routingSnapshotReference`
- `handoffRequestedTimestamp`
- `handoffSourceVersion`
- `handoffIdempotencyKey`
- `fulfillmentReturnsDispositionReference`
- `fulfillmentReturnsSourceVersion`
- `acceptedRejectedIgnoredState`
- `appliedVsIgnoredState`
- `duplicateHandoffBlocker`
- `reviewRequiredState`
- `auditReference`
- `correlationId`

## Error Models

- `INVALID_PARENT_ORDER_REFERENCE`
- `INVALID_TENANT_SCOPE`
- `MISSING_PRICING_SNAPSHOT`
- `STALE_PRICING_SNAPSHOT`
- `PRODUCT_NOT_ROUTABLE`
- `UNSUPPORTED_PRODUCT_TYPE`
- `ROUTING_POLICY_NOT_FOUND`
- `ROUTING_RULE_CONFLICT`
- `INVALID_PRODUCT_REFERENCE`
- `INVALID_DEVICE_REFERENCE`
- `VENDOR_UNAVAILABLE`
- `MANUFACTURER_UNAVAILABLE`
- `MISSING_FULFILLMENT_TARGET`
- `WARRANTY_REGISTRATION_METHOD_MISSING`
- `ROUTING_REVIEW_REQUIRED`
- `EXPORT_ELIGIBILITY_CONFLICT`
- `EXPORT_BATCH_DUPLICATE`
- `EXPORT_BATCH_ITEM_DUPLICATE_BLOCKED`
- `EXPORT_SUBORDER_ALREADY_EXPORTED`
- `EXPORT_SUBORDER_VENDOR_MISMATCH`
- `EXPORT_SUBORDER_CANCELLED_OR_SUPERSEDED`
- `EXPORT_ROUTING_SNAPSHOT_MISSING`
- `EXPORT_SPLIT_CONFLICT`
- `RE_EXPORT_BLOCKED`
- `RE_EXPORT_DUPLICATE_PROCESSING_RISK`
- `MANUAL_DOWNLOAD_NOT_AUTHORIZED`
- `FULFILLMENT_HANDOFF_DUPLICATE_BLOCKED`
- `FULFILLMENT_DISPOSITION_MISSING_OR_STALE`
- `FULFILLMENT_DISPOSITION_REJECTED_OR_IGNORED`
- `FULFILLMENT_DISPOSITION_CONFLICT`
- `RETRY_BUDGET_EXHAUSTED`
- `IDEMPOTENCY_CONFLICT`
- `UNAUTHORIZED`

## Authentication / Authorization

- Placeholder: require tenant-scoped service or admin authorization.
- Placeholder: vendor manual download requires Tenant Company vendor/user/company/entity scope evidence.
- Placeholder: downstream modules should receive only consumer-appropriate fields and redaction classes.
- Placeholder: route execution, vendor export creation, export batch item lookup, re-export, manual download, handoff, disposition-reference recording, retry, review, and supersession actions require audit logging where configured.

## Idempotency Rules

- `POST /route-evaluations` should support idempotency by routing input hash.
- `POST /route-executions` should require an idempotency key scoped by parent order, tenant, and routing input hash.
- Routed suborders should carry dedupe keys per routed suborder.
- Vendor export eligibility and batch creation should require idempotency keys scoped by vendor, tenant, export window, export inclusion rule version, source event/version, schema version, split behavior, routed suborder references, re-export request reference, and batch idempotency key where applicable.
- Export batch items should enforce duplicate prevention keys per routed suborder, export batch, prior export membership, source event/version, and re-export reason.
- Manual download, re-export, buyer split, fulfillment handoff, and disposition-reference endpoints should require idempotency keys.
- Retry, review, and supersession endpoints should require idempotency keys.
- Conflicting payloads for the same key should return an idempotency conflict rather than route, export, create batch items, hand off, record disposition, or download twice.

## Rate Limits / Throttling

- Placeholder: define route evaluation throughput limits.
- Placeholder: define route execution throughput limits.
- Placeholder: define fanout limits for vendor/manufacturer suborder creation per parent order.
- Placeholder: define vendor export batch size, batch item volume, re-export frequency, manual download frequency, handoff request frequency, and split-by-buyer fanout limits.
- Placeholder: define retry budgets by exception family, tenant, parent order, export batch, export batch item, handoff request, and downstream target.
- Placeholder: define bulk retry/review limits.
- Placeholder: protect downstream Pricing, Product Catalog, Device Catalog, Tenant Company, Fulfillment, Integration Management, Notification, and Logs & Audit lookups from fanout spikes and retry storms.

## Pagination Standards

- Use pagination for routed order lists, exception queues, retry histories, review queues, suborder lookup collections, vendor export batches, export batch items, vendor export review records, manual download records, fulfillment handoff requests, and disposition reference histories.
- Placeholder: define cursor versus page-based pagination.

## Versioning Strategy

- Version OpenAPI contracts for route evaluation payloads, route execution payloads, routing snapshot payloads, vendor export payloads, export batch item payloads, export schema versions, export inclusion rule versions, handoff payloads, exception models, supersession models, and response redaction classes.
- Preserve schema version, Routing Policy Version, Routing Rule Version, source input versions, export schema version, export inclusion rule version, source event/version, handoff source version, and routing input hash inside routing/export/handoff evidence.

## Webhook Dependencies

- Placeholder: routing may emit events rather than webhooks initially.
- Placeholder: future downstream webhook delivery should remain outside Order Routing. Integration Management owns external delivery/receipt evidence.

## Audit / Logging Requirements

- Log request id, correlation id, idempotency key, routing input hash, actor/service, tenant scope, parent order reference, routing policy/rule versions, routing output references, exception references, supersession references, export eligibility records, export batch references, export batch item references, manual download references, fulfillment handoff request references, Fulfillment/Returns disposition references, and decision summary.
- Do not log raw sensitive payload fields where references and redacted summaries are enough.

## Example OpenAPI Snippet

```yaml
paths:
  /order-routing/vendor-exports/batches/{exportBatchId}/items:
    get:
      summary: List per-routed-suborder export batch item dispositions
      operationId: listVendorOrderExportBatchItems
      responses:
        '200':
          description: Export batch item references and dispositions
  /order-routing/fulfillment-handoffs/{handoffRequestId}/disposition-references:
    post:
      summary: Record a Fulfillment/Returns disposition reference without mutating fulfillment state
      operationId: recordFulfillmentDispositionReference
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
      responses:
        '202':
          description: Disposition reference recorded
        '409':
          description: Duplicate or conflicting disposition reference
```

## Open Questions

- Should route execution return synchronously with routing output or asynchronously with accepted status?
- Which endpoints are internal-only versus exposed to buyer-facing modules or vendor users?
- Which snapshot and export fields are safe for each consumer class?
- Should route evaluations be persisted, and who may view them?
- Which vendor export endpoints should integrate with scheduled email, API/webhook, SFTP placeholder, or manual download flows?
- Which Fulfillment/Returns disposition references should be visible to Order Routing and at what redaction level?
