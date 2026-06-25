# Logs And Audit File Tracking OpenAPI Contracts

This document is an implementation-oriented API specification template. It is proposal-level and does not finalize endpoint names, schemas, authorization behavior, storage implementation, or payload retention mechanics.

## API Purpose

Expose audit record, file tracking, API transmission log, validation result, processing result, row-level error, retry/failure history, reprocess request, vendor file workflow, search/filtering, and retention review contracts for authorized platform consumers.

## Service Ownership

Service owner placeholder: Logs & Audit File Tracking.

## Endpoint Inventory

Proposal-level endpoints:

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/audit-records` | POST | Create audit record | Append-only evidence. |
| `/audit-records/{auditRecordId}` | GET | Lookup audit record | Redacted by caller class. |
| `/audit-records/{auditRecordId}/amendments` | POST | Add amendment/correction reference | Does not rewrite original evidence. |
| `/audit-records/{auditRecordId}/access-events` | POST | Record sensitive access/view event | Audits audit access. |
| `/file-tracking-records` | POST | Create file tracking record | Append-only; import/export direction required. |
| `/file-tracking-records/{fileTrackingId}` | GET | Lookup file tracking record | Includes processing references. |
| `/file-tracking-records/{fileTrackingId}/validation-results` | POST | Attach validation result | Append-only; does not mutate source records. |
| `/file-tracking-records/{fileTrackingId}/processing-results` | POST | Attach processing result | Append-only; does not own business state. |
| `/file-tracking-records/{fileTrackingId}/row-errors` | POST | Record row-level validation/processing errors | Evidence only. |
| `/file-tracking-records/{fileTrackingId}/duplicate-detections` | POST | Record duplicate detection | Review evidence only. |
| `/file-tracking-records/{fileTrackingId}/corrections` | POST | Record correction/reupload history | Source modules own corrections. |
| `/file-tracking-records/{fileTrackingId}/reprocess-requests` | POST | Record reprocess request | Source module owns execution. |
| `/api-transmission-logs` | POST | Create API transmission log | Request/response masked by default. |
| `/api-transmission-logs/{transmissionId}` | GET | Lookup API transmission log | Redacted by caller class. |
| `/audit-search` | GET | Search audit/file/API records | Filtered, permission-scoped, rate-limited. |
| `/audit-search-exports` | POST | Request controlled search result export | Export controls and audit required. |
| `/retention-reviews` | POST | Create retention review placeholder | Does not delete records by itself. |

## Request Methods

- `POST` for creating append-only evidence records, amendments, access events, row errors, reprocess requests, exports, and review placeholders.
- `GET` for lookup and search.
- `PATCH` should be avoided for evidence records; if used, it should be limited to non-evidence review metadata and create an audit/amendment record.

## Path Parameters

- `auditRecordId`
- `fileTrackingId`
- `transmissionId`
- `retentionReviewId`

## Query Parameters

Proposal-level filters:

- `dateFrom`
- `dateTo`
- `companyId`
- `entityId`
- `vendorId`
- `buyerId`
- `sourceModule`
- `fileType`
- `direction`
- `apiEventType`
- `status`
- `actorId`
- `errorType`
- `correlationId`
- `relatedRecordRef`
- `retentionClass`
- `redactionClass`
- `accessClass`
- `pageToken`
- `pageSize`

## Request Body Schema

Audit record placeholder:

```yaml
sourceModule: string
eventActionType: string
actorRef: string
companyEntityScope: string
relatedRecordRefs:
  - string
fileRef: string
payloadRef: string
maskedPayloadRef: string
fullPayloadExceptionRef: string
status: string
timestamp: string
beforeAfterSummary: string
validationResultRef: string
retryCount: integer
errorCode: string
errorMessage: string
retentionOwner: string
retentionClass: string
redactionClass: string
accessClass: string
legalContractHold: boolean
reviewStatus: string
correlationId: string
idempotencyKey: string
```

File tracking placeholder:

```yaml
fileName: string
fileType: string
direction: import | export
sourceModule: string
vendorRef: string
buyerEntityScope: string
dateRange:
  startDate: string
  endDate: string
generatedBy: string
uploadedBy: string
generatedAt: string
uploadedAt: string
rowCount: integer
acceptedRowCount: integer
failedRowCount: integer
validationStatus: string
processingStatus: string
errorSummary: string
fileVersion: string
checksumHash: string
storageRef: string
retentionClass: string
redactionClass: string
accessClass: string
```

Row-level error placeholder:

```yaml
rowIdentity: string
rowNumber: integer
sourceRowHash: string
validationErrorCode: string
validationErrorMessage: string
severity: string
retryable: boolean
blockingState: string
correctionRef: string
sourceModuleDisposition: string
```

API transmission log placeholder:

```yaml
sourceModule: string
targetSystem: string
transmissionDirection: outbound | inbound
requestRef: string
maskedRequestRef: string
responseRef: string
maskedResponseRef: string
status: string
retryCount: integer
errorCode: string
errorMessage: string
correlationId: string
idempotencyKey: string
retentionClass: string
redactionClass: string
accessClass: string
```

Reprocess request placeholder:

```yaml
sourceModule: string
relatedRecordRef: string
requestReason: string
requestedBy: string
requestedAt: string
requestStatus: string
sourceModuleResponseRef: string
outcomeRef: string
```

## Response Schemas

Common evidence response:

```yaml
recordId: string
recordType: string
sourceModule: string
status: string
createdAt: string
createdBy: string
retentionClass: string
redactionClass: string
accessClass: string
correlationId: string
links:
  relatedRecords:
    - string
```

## Error Models

Proposal-level codes:

- `SOURCE_MODULE_REQUIRED`
- `EVENT_ACTION_TYPE_REQUIRED`
- `FILE_TYPE_REQUIRED`
- `FILE_DIRECTION_REQUIRED`
- `CHECKSUM_REQUIRED`
- `RETENTION_CLASS_INVALID`
- `REDACTION_CLASS_INVALID`
- `ACCESS_CLASS_INVALID`
- `PAYLOAD_STORAGE_NOT_PERMITTED`
- `FULL_PAYLOAD_EXCEPTION_REQUIRED`
- `MASKED_PAYLOAD_REQUIRED`
- `PAYLOAD_SIZE_LIMIT_EXCEEDED`
- `DUPLICATE_FILE_DETECTED`
- `CROSS_TENANT_SEARCH_DENIED`
- `SEARCH_ACCESS_DENIED`
- `RESULT_EXPORT_DENIED`
- `SOURCE_BOUNDARY_VIOLATION`
- `REPROCESS_EXECUTION_NOT_OWNED`

## Authentication / Authorization

- Tenant/company/entity scoped authorization.
- Cross-tenant search denied by default.
- Source-module scoped service authorization.
- Role-based access by redaction class, retention class, and access class.
- Internal-only access for sensitive payload references unless explicitly allowed.
- Buyer/vendor access only for approved scoped audit views.
- Sensitive search, result export, and payload reference access should be auditable.

## Rate Limits / Throttling

Placeholder: define per-source-module and per-tenant limits for audit creation, file tracking creation, API transmission logging, search, result exports, and payload reference lookup.

## Pagination Standards

Search endpoints should use cursor pagination with `pageToken` and `pageSize`. Large result sets should support controlled export or async search only if future policy permits.

## Versioning Strategy

- Use explicit API versioning.
- Version audit record, file tracking, transmission log, retention class, redaction class, and access class schemas.
- Additive fields are preferred.
- Breaking retention/redaction/access behavior changes require new versions and migration guidance.

## Webhook Dependencies

Logs & Audit may emit events that future Notification, Analytics, and AI Agent Services consumers receive. Delivery mechanics remain outside Logs & Audit.

## Audit / Logging Requirements

Logs & Audit should audit its own sensitive operations, including search access, result export, payload reference access, retention review, amendment creation, and correction/reupload history updates.

## Example OpenAPI Snippet

```yaml
paths:
  /file-tracking-records:
    post:
      summary: Create file tracking record
      operationId: createFileTrackingRecord
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/FileTrackingRecordRequest'
      responses:
        '201':
          description: File tracking record created
        '422':
          description: File tracking validation failed
```

## Open Questions

- Which endpoints are source-module internal only?
- Which payload references can be dereferenced through API?
- Which searches require elevated approval?
- Which file tracking records can be visible to buyers or vendors?
- Which result exports are allowed at launch?
