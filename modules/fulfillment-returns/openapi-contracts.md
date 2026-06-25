# Fulfillment and Returns OpenAPI Contracts

This document is an implementation-oriented API specification template. It is proposal-level and does not finalize endpoint names, payload schemas, auth behavior, carrier/vendor integration mechanics, file schemas, or storage design.

## API Purpose

Expose operational fulfillment and return execution contracts for trusted platform consumers while keeping routing, pricing, tenant eligibility, catalog, warranty approval, invoice, payment, notification, integration transport, and audit/file responsibilities outside this module.

## Service Ownership

Service owner placeholder: Fulfillment and Returns.

## Endpoint Inventory

Proposal-level endpoints:

| Endpoint | Method | Purpose | Boundary notes |
| --- | --- | --- | --- |
| `/fulfillment-handoff-dispositions` | POST | Record disposition for Order Routing handoff request | Request is not accepted execution until disposition is recorded. |
| `/fulfillment-handoff-dispositions/{dispositionId}` | GET | Lookup handoff disposition | Tenant/vendor scoped. |
| `/fulfillment-imports` | POST | Create vendor fulfillment import job | Follows shared import/export governance. |
| `/fulfillment-imports/{importId}/validate` | POST | Validate headers, locked fields, rows, and line mapping | No mutation. |
| `/fulfillment-imports/{importId}/preview` | GET | Retrieve validation preview | Includes proposed shipment line evidence. |
| `/fulfillment-imports/{importId}/confirm` | POST | Confirm import preview | Captures actor/service confirmation. |
| `/fulfillment-imports/{importId}/apply` | POST | Apply confirmed import | Creates operational evidence only. |
| `/fulfillment-imports/{importId}/error-report` | GET | Retrieve error report reference | Logs & Audit owns file evidence. |
| `/shipment-line-evidence` | POST | Record shipment line evidence | Per-line/package operational evidence. |
| `/shipment-line-evidence/{evidenceId}` | GET | Lookup shipment line evidence | Redacted by caller class. |
| `/shipment-line-evidence/{evidenceId}/supersede` | POST | Supersede shipment line evidence | Preserves prior evidence. |
| `/shipments/{shipmentId}` | GET | Lookup shipment state | Redacted by caller class. |
| `/shipments/{shipmentId}/evidence` | POST | Record shipment evidence | Idempotent. |
| `/shipments/{shipmentId}/tracking` | POST | Validate/create tracking reference | Carrier/tracking validation. |
| `/shipments/{shipmentId}/status` | POST | Record shipment status evidence | Source/version required. |
| `/buyer-updates/shipments` | POST | Record shipment update ready for buyer transport | Integration owns transport. |
| `/return-exports/eligibility` | POST | Create return export eligibility record | Validates RAN/source authorization freshness. |
| `/return-exports/batches` | POST | Create return export batch | Logs owns file evidence. |
| `/return-exports/batches/{batchId}/items` | POST | Include/exclude return export batch item | Per-item disposition. |
| `/return-exports/re-exports` | POST | Request return re-export | Explicit and auditable. |
| `/return-exports/manual-downloads` | POST | Record manual download workflow reference | Logs owns immutable download evidence. |
| `/return-imports` | POST | Create vendor return import job | Follows shared import/export governance. |
| `/return-imports/{importId}/validate` | POST | Validate return import | Includes RAN/matching/chronology/quantity checks. |
| `/return-imports/{importId}/preview` | GET | Retrieve return import preview | Includes proposed line dispositions. |
| `/return-imports/{importId}/confirm` | POST | Confirm return import preview | Captures actor/service confirmation. |
| `/return-imports/{importId}/apply` | POST | Apply confirmed return import | Creates operational line disposition evidence. |
| `/return-imports/{importId}/error-report` | GET | Retrieve error report reference | Logs & Audit owns file evidence. |
| `/return-line-disposition-evidence` | POST | Record return line disposition evidence | Not refund approval. |
| `/return-line-disposition-evidence/{evidenceId}` | GET | Lookup return line disposition evidence | Redacted by caller class. |
| `/return-line-disposition-evidence/{evidenceId}/supersede` | POST | Supersede return line evidence | Preserves prior evidence. |
| `/returns/{returnId}/dispositions` | POST | Record return disposition summary | Derived/linked from line evidence where needed. |
| `/returns/{returnId}/vendor-refund-evidence` | POST | Record vendor-provided refund/adjustment evidence | Not final financial state. |
| `/buyer-updates/returns` | POST | Record return update ready for buyer transport | Integration owns transport. |
| `/fulfillment-exceptions` | GET | List exceptions | Filter by family/status/scope. |
| `/fulfillment-exceptions/{exceptionId}/review` | POST | Record review action | Audited. |
| `/fulfillment-exceptions/{exceptionId}/retry` | POST | Retry operation | Retry budget required. |

## Common Request Fields

```yaml
correlationId: string
idempotencyKey: string
tenantScopeRef: string
vendorRef: string
buyerEntityRef: string
parentOrderRef: string
routedSuborderRef: string
routedSuborderLineRef: string
routingSnapshotRef: string
source:
  system: string
  sourceEventId: string
  sourceVersion: string
  sourceTimestamp: string
receivedAt: string
redactionClass: string
auditRef: string
```

## Handoff Disposition Request Placeholder

```yaml
orderRoutingHandoffRequestRef: string
routedSuborderRef: string
routingSnapshotRef: string
orderRoutingSourceVersion: string
dispositionState: accepted | rejected | ignored | duplicate-blocked | review-required
appliedVsIgnoredState: applied | ignored | pending-review
rejectionReason: string
duplicateHandoffBlocker: string
```

## Vendor Fulfillment Import Request Placeholder

```yaml
importMode: update-only | validate-only | correction-reupload | supersession-revision
importSchemaVersion: string
sourceExportBatchRef: string
sourceExportBatchItemRefs:
  - string
fileOrPayloadRef: string
vendorRef: string
buyerEntityRef: string
```

## Fulfillment Import Row / Shipment Line Evidence Placeholder

```yaml
rowNumber: integer
sourceImportRowRef: string
sourceExportBatchItemRef: string
routedSuborderRef: string
routedSuborderLineRef: string
skuText: string
upcText: string
expectedQuantity: integer
shippedQuantity: integer
deliveredQuantity: integer
vendorConfirmationNumber: string
shippingCarrier: USPS | UPS | FedEx | DHL | Other
shippingTrackingNumber: string
customTrackingUrl: string
trackingInstructions: string
shippedDate: string
deliveredDate: string
packageId: string
shipmentLineId: string
shipmentLineEvidenceRef: string
duplicatePreventionKey: string
appliedVsIgnoredState: applied | ignored | rejected | superseded | review-required
lineLevelDisposition: applied | ignored | rejected | superseded | review-required
vendorNotes: string
```

## Tracking Reference Placeholder

```yaml
shippingCarrier: USPS | UPS | FedEx | DHL | Other
carrierNameDetails: string
shippingTrackingNumber: string
generatedTrackingUrl: string
customTrackingUrl: string
trackingUrlSource: string
trackingUrlValidationStatus: valid | invalid | unsafe | malformed | review-required
carrierProviderEvidenceRef: string
trackingUrlSupersessionRef: string
shipmentLineEvidenceRefs:
  - string
```

## Return Export Eligibility Placeholder

```yaml
returnRef: string
sourceReturnRequestRef: string
returnLifecycleState: string
returnLineRefs:
  - string
ranRef: string
returnAuthorizationRanSourceVersion: string
returnAuthorizationFreshness: fresh | stale | missing | review-required
staleAuthorizationState: boolean
closedReturnState: boolean
supersededReturnState: boolean
exportBlockedReviewReason: string
returnExportSchemaVersion: string
returnInclusionRuleVersion: string
```

## Return Export Batch Placeholder

```yaml
vendorRef: string
buyerRetailerSplitMode: none | split-by-buyer | split-by-retailer | review-required
returnExportSchemaVersion: string
returnInclusionRuleVersion: string
exportWindow:
  startsAt: string
  endsAt: string
batchIdempotencyKey: string
returnExportContentRef: string
```

## Vendor Return Import Request Placeholder

```yaml
importMode: update-only | validate-only | correction-reupload | supersession-revision
returnImportSchemaVersion: string
sourceReturnExportBatchRef: string
sourceReturnExportBatchItemRefs:
  - string
fileOrPayloadRef: string
vendorRef: string
buyerEntityRef: string
```

## Return Import Row / Line Disposition Placeholder

```yaml
rowNumber: integer
sourceImportRowRef: string
sourceReturnExportBatchItemRef: string
sourceReturnRequestRef: string
ranRef: string
returnLineRef: string
cixciReturnLineId: string
suborderRef: string
skuText: string
upcText: string
expectedReturnQuantity: integer
receivedQuantity: integer
acceptedQuantity: integer
rejectedQuantity: integer
partiallyAcceptedQuantity: integer
returnReceivedDate: string
returnRefundedAmount: string
rejectedReason: string
partialAcceptanceRefundReason: string
returnCondition: string
vendorNotes: string
vendorOperationalDisposition: received-by-vendor | operationally-accepted | operationally-rejected | partially-accepted | closed | exception | review-required
returnLineDispositionEvidenceRef: string
duplicatePreventionKey: string
appliedVsIgnoredState: applied | ignored | rejected | superseded | review-required
```

## Response Schema Placeholder

```yaml
id: string
status: string
tenantScopeRef: string
vendorRef: string
buyerEntityRef: string
parentOrderRef: string
routedSuborderRef: string
links:
  routingSnapshotRef: string
  handoffDispositionRef: string
  sourceExportBatchItemRef: string
  shipmentLineEvidenceRef: string
  returnExportBatchItemRef: string
  returnLineDispositionEvidenceRef: string
  pricingSnapshotRef: string
  invoiceEvidenceRef: string
  integrationTransportRef: string
  logsAuditEvidenceRef: string
auditRef: string
redactionClass: string
createdAt: string
updatedAt: string
```

## Error Codes

Proposal-level codes:

- `FULFILLMENT_HANDOFF_REQUEST_INVALID`
- `FULFILLMENT_HANDOFF_DUPLICATE_BLOCKED`
- `FULFILLMENT_IMPORT_HEADER_INVALID`
- `FULFILLMENT_IMPORT_LOCKED_FIELD_CHANGED`
- `FULFILLMENT_IMPORT_UPDATE_MATCH_INVALID`
- `FULFILLMENT_IMPORT_SOURCE_EXPORT_MISMATCH`
- `FULFILLMENT_SUBORDER_VENDOR_MISMATCH`
- `FULFILLMENT_SUBORDER_LINE_MISSING`
- `FULFILLMENT_SKU_UPC_MISMATCH`
- `FULFILLMENT_QUANTITY_MISMATCH`
- `FULFILLMENT_SHIPPED_QUANTITY_EXCEEDS_EXPECTED`
- `FULFILLMENT_DELIVERED_QUANTITY_EXCEEDS_SHIPPED`
- `FULFILLMENT_DUPLICATE_ROW`
- `FULFILLMENT_SHIPMENT_LINE_CONFLICT`
- `SHIPMENT_CARRIER_REQUIRED`
- `SHIPMENT_TRACKING_NUMBER_REQUIRED`
- `SHIPMENT_TRACKING_URL_INVALID`
- `SHIPMENT_DELIVERED_BEFORE_SHIPPED`
- `RETURN_EXPORT_ELIGIBILITY_CONFLICT`
- `RETURN_EXPORT_AUTHORIZATION_STALE`
- `RETURN_EXPORT_CLOSED_OR_SUPERSEDED`
- `RETURN_IMPORT_HEADER_INVALID`
- `RETURN_IMPORT_LOCKED_FIELD_CHANGED`
- `RETURN_RAN_INVALID`
- `RETURN_RAN_VENDOR_MISMATCH`
- `RETURN_EXPORT_ITEM_MISMATCH`
- `RETURN_LINE_MISSING`
- `RETURN_SKU_UPC_MISMATCH`
- `RETURN_QUANTITY_MISMATCH`
- `RETURN_QUANTITY_RECONCILIATION_FAILED`
- `RETURN_DUPLICATE_RAN_ROW`
- `RETURN_RECEIVED_BEFORE_INITIATED`
- `REFUND_EXECUTION_OUT_OF_SCOPE`
- `PERMISSION_DENIED`
- `RETRY_BUDGET_EXHAUSTED`

## Authentication / Authorization

- Internal service authentication for Order Routing handoff disposition.
- Tenant-scoped authorization for buyer/entity lookup.
- Vendor/manufacturer scoped access only where explicitly authorized.
- Tenant Company owns user/vendor permissions, destructive action authority, override authority, and company/entity scope.
- Redaction by consumer class for tracking, customer-adjacent, pricing, return, and tenant-sensitive references.

## Audit / Logging Requirements

Every mutating API should produce audit references for:

- Actor or system actor.
- Role/permission used where available.
- Source system.
- Import/export job and batch references.
- Row counts and validation outcomes where applicable.
- Before/after summary where safe.
- Correlation id.
- Idempotency key.
- Tenant scope.
- Timestamp.

Logs & Audit owns immutable audit/file/download evidence. Fulfillment and Returns owns workflow references and source-module operational state.

## Open Questions

- Which endpoint paths become public vendor APIs versus internal service APIs?
- Which file upload payloads are handled directly versus through Integration Management?
- Which error report file format is used?
- Which carrier-specific validation rules are implemented at launch?
