# ADR-0012: Logs And Audit File Tracking

## Status

Proposed

## Context

CIXCI needs platform-wide traceability for imports, exports, API transmissions, file processing, retries, validation results, operational events, invoice generation, reconciliation uploads, shipping/return imports, warranty registration transmissions, and manual vendor file workflows.

Logs & Audit must support transparency, troubleshooting, audit readiness, operational accountability, customer support, vendor support, and review of historical processing behavior.

The platform already defines source-of-truth boundaries across Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Tenant Company, AI Agent Services, and future platform services. Logs & Audit should observe and retain evidence about actions, files, transmissions, and processing outcomes without becoming the owner of the business records it observes.

This ADR is proposal-level. It does not finalize log storage implementation, file storage implementation, retention periods, payload backup rules, search index design, security model, regulatory policy, or implementation behavior.

## Decision

Introduce Logs & Audit File Tracking as a cross-cutting platform service / bounded context.

Logs & Audit owns audit records, import/export file tracking, API transmission logs, processing results, validation outcomes, retry/failure history, source file references, user-trigger history, payload backup references where permitted, audit search/filtering, and retention placeholders.

Logs & Audit does not own the underlying business records, operational workflows, pricing calculations, fulfillment state, invoice decisions, notification delivery, or analytics definitions. It records evidence and traceability about those activities.

### Logs & Audit Owns

- Audit records.
- Import/export file tracking.
- API transmission logs.
- Processing results.
- Validation outcomes.
- Row counts and failed row counts.
- Retry/failure history.
- User-trigger history.
- Source file references.
- Payload backup references where permitted.
- Audit search and filtering.
- Audit/event retention placeholders.
- File processing status history.
- Duplicate file detection evidence.
- Correction/reupload history references.

### Logs & Audit Does Not Own

- Product Catalog source records.
- Device Catalog source records.
- Pricing calculations or snapshots.
- Order Routing decisions.
- Fulfillment/Returns operational state.
- Invoice records or reconciliation decisions.
- Warranty claim state.
- Notification delivery.
- Analytics reporting definitions.
- Tenant eligibility or user/entity access decisions.
- AI recommendation decisions or action outcomes.

## Relationship Boundaries

### Product Catalog

Product Catalog owns product records, product identity, compatibility assertions, product visibility/activation/download state, catalog import semantics, catalog-carried pricing inputs, product warranty facts, and product references.

Logs & Audit may track Product Catalog imports, exports, downloads, validation outcomes, failed rows, source files, processing results, API transmissions, manual file actions, retry history, and audit evidence.

Logs & Audit must not create, correct, publish, activate, deactivate, validate as source-of-truth, or mutate Product Catalog records.

### Device Catalog

Device Catalog owns canonical Device records, Device References, device identity, normalization, lifecycle metadata, taxonomy, buyer-exportable device data, and device events.

Logs & Audit may track device CSV imports, validation outcomes, file processing history, image-readiness audit references, buyer device exports, API transmissions, duplicate file detection, correction/reupload history, and failed row evidence.

Logs & Audit must not resolve canonical device identity, change Device References, approve device lifecycle status, or decide buyer device visibility.

### Pricing

Pricing owns price calculation, pricing profiles, commission/rev-share interpretation, pricing exceptions, effective price snapshots, pricing audit, and pricing events.

Logs & Audit may track Pricing API transmissions, snapshot publication events, calculation request references, validation/failure outcomes, retry history, and audit references needed to reconstruct pricing activity.

Logs & Audit must not calculate price, alter Pricing snapshots, resolve pricing conflicts, approve pricing exceptions, or define commercial interpretation.

### Order Routing

Order Routing owns routing decisions, order decomposition, routed orders, vendor/manufacturer suborders, routing snapshots, routing exceptions, and routing events.

Logs & Audit may track routing API transmissions, routed order exports, routing failure/retry history, routing snapshot audit references, manual vendor file exports, and operational evidence of handoff attempts.

Logs & Audit must not choose routes, alter routing snapshots, create suborders, select vendors/manufacturers, or resolve routing exceptions.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment handoff tracking, shipment status, tracking information, delivery status, return operational handling, return receipt, replacement execution, fulfillment exceptions, return exceptions, and operational events.

Logs & Audit may track shipping imports, return outcome imports, vendor/carrier/manufacturer file uploads, manual export/import workflows, validation failures, processing results, retry history, and transmission logs.

Logs & Audit must not mark shipments delivered, create shipments, execute returns, create replacements, approve returns, or resolve fulfillment/return operational state.

### Invoice Management

Invoice Management owns invoice generation, invoice records, invoice lines, invoice reports, buyer/vendor invoice views, invoice status lifecycle, invoice CSV archives, invoice history, invoice events, and proposal-level reconciliation placeholders.

Logs & Audit may track invoice generation actions, invoice CSV export events, reconciliation upload files, validation outcomes, download events, API transmissions, retry/failure history, and audit references linking invoice evidence to source files or processing activity.

Logs & Audit must not generate invoices, finalize invoices, mutate invoice records, resolve reconciliation decisions, correct invoice lines, process payment, or own accounting outcomes.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Logs & Audit may track warranty registration transmissions, vendor API attempts, manual exports, retry/failure history, confirmation payload references where permitted, and audit evidence for warranty-related file or API flows.

Logs & Audit must not decide warranty eligibility, approve/deny warranty claims, execute warranty replacements, own customer warranty UX, or become vendor warranty system state.

### Tenant Company

Tenant Company owns tenant scope, buyer/entity hierarchy, company market segment, relationship eligibility, geography eligibility, activation readiness, Product Type enablement scope, licensed-property scope, user/entity access, roles, permissions, and admin exceptions.

Logs & Audit may track admin exception events, user-trigger history, tenant-scoped audit records, role/action references, source module references, and before/after summaries where permitted.

Logs & Audit must not approve tenant eligibility, assign roles, manage hierarchy, decide access, or own admin exception business rules.

### AI Agent Services

AI Agent Services owns recommendations, insights, suggested actions, confidence scores, feedback signals, action outcome records, and agent governance records where defined.

Logs & Audit may track AI recommendation/action audit references, prompt/policy version references where permitted, approval trail references, user-trigger history, and AI action outcomes as evidence.

AI Agent Services may consume Logs & Audit signals for operational risk, but AI agents must not delete audit logs, overwrite source files, bypass retention rules, or mutate business records through Logs & Audit.

### Notification Platform Service Future Placeholder

Logs & Audit may emit events that later trigger notifications about failures, retry exhaustion, audit gaps, retention review, or operational review needs.

Notification delivery, templates, recipient resolution, preferences, suppression rules, retries, delivery status, and delivery audit belong to a future Notification platform service.

Logs & Audit owns audit events and traceability evidence only. It should not become the notification system.

### Analytics

Analytics owns reporting models, rollups, metrics, analytical read models, dashboards, and reporting latency decisions.

Logs & Audit may provide audit signals, file processing events, transmission events, validation outcomes, and processing history to Analytics.

Analytics may consume audit signals, but Analytics owns reporting models and rollups. Logs & Audit should not become the Analytics reporting layer.

### Vendor Operational Data Flows

Accessory vendors may use manual CSV/file flows where APIs are unavailable, incomplete, delayed, or not yet configured.

Logs & Audit should track file and processing history for vendor operational data flows. It should not own the resulting business state.

Fulfillment/Returns owns shipping and return operational state. Order Routing owns routing/suborder decisions. Invoice Management owns invoice and reconciliation outcomes. Product Catalog and Device Catalog own source records.

## Activities Logs & Audit Must Cover

Proposal-level coverage includes:

- Accessory imports.
- Device imports.
- Product exports/downloads.
- Buyer exports.
- Order exports/transmissions.
- Return exports/transmissions.
- Shipping imports.
- Return outcome imports.
- Invoice generation.
- Invoice CSV exports.
- Reconciliation uploads.
- Warranty registration transmissions.
- API failures/retries.
- Manual file uploads/downloads.
- AI recommendation/action audit references.
- Admin exception events.
- Vendor API transmissions.
- File validation and processing outcomes.

## Vendor Operational Data Flows

Accessory vendors may need manual CSV/file workflows before full API integrations exist.

Logs & Audit should track:

- Manual export of order data to vendors.
- Manual export of return data to vendors.
- Vendor import of shipping information.
- Vendor import of return outcome information.
- File name.
- File type.
- Vendor.
- Buyer/entity scope.
- Date range.
- Generated by / uploaded by.
- Generated at / uploaded at.
- Row counts.
- Failed row counts.
- Validation status.
- Processing status.
- Error summary.
- File version.
- Duplicate detection.
- Correction/reupload history.

Logs & Audit tracks the file and processing history only.

Fulfillment/Returns owns shipping/return operational state. Order Routing owns routing/suborder decisions. Invoice Management owns invoice/reconciliation outcomes.

## Audit Record Model

Proposal-level audit record fields:

- Audit record id.
- Source module.
- Event/action type.
- Actor/user/service.
- Company/entity scope.
- Related record references.
- File reference.
- Payload reference or masked payload reference.
- Status.
- Timestamp.
- Before/after summary placeholder.
- Validation result reference.
- Retry count.
- Error code/message.
- Retention class.
- Redaction class.
- Correlation id.
- Idempotency key where applicable.

Audit records should preserve traceability without copying unrestricted source records into the audit store.

## File Tracking Model

Proposal-level file tracking concepts:

- File tracking record.
- File type.
- File direction: import/export.
- Source module.
- Owning company/entity.
- Target company/entity.
- Vendor reference where applicable.
- Buyer/entity scope where applicable.
- Date range where applicable.
- Storage reference.
- Checksum/hash.
- Row count.
- Failed row count.
- Processing result.
- Validation result reference.
- Duplicate file detection.
- Reprocess/retry reference.
- File version.
- Correction/reupload history reference.
- Retention policy placeholder.
- Redaction class.

File tracking records are evidence records. They do not transfer ownership of the business entities contained in a file.

## Payload And Privacy Guardrails

Full payload storage may be restricted by privacy, file size, contract, or security requirements.

Masked payload references may be required where full source payload retention would create privacy, security, contractual, or data minimization risk.

Sensitive customer, order, pricing, invoice, license, media, warranty, tenant, user, and operational data must use redaction classes.

Logs & Audit must not become a data lake of unrestricted sensitive payloads. It should store the minimum durable evidence needed for traceability, troubleshooting, audit readiness, and operational accountability.

Payload backup references should identify what is stored, where it is stored, who may access it, and what retention class applies. The exact storage implementation remains unresolved.

## Events And Signals

Proposal-level events include:

- `audit.record.created`.
- `file.export.created`.
- `file.import.received`.
- `file.validation.completed`.
- `file.processing.failed`.
- `file.processing.completed`.
- `api.transmission.failed`.
- `api.transmission.retried`.
- `api.transmission.completed`.
- `audit.retention.review.required`.

Event payloads should use references and redaction classes. Sensitive source payloads should not be included unless explicitly permitted by retention and security policy.

## AI Agent Services Signals

Possible signals for AI Agent Services include:

- Repeated import failure signal.
- Repeated export failure signal.
- Vendor file quality risk.
- API reliability risk.
- Reconciliation upload issue signal.
- Shipping import failure signal.
- Return import failure signal.
- Audit gap signal.
- Retention risk signal.
- Duplicate vendor file signal.
- Reupload/correction pattern signal.

AI agents may recommend review actions, summarize repeated operational failures, identify risky file flows, or suggest support queues.

AI agents must not delete audit logs, overwrite source files, bypass retention rules, or mutate business records.

## Notification Hooks

Logs & Audit may emit events that later trigger notifications.

Possible notification-triggering events include repeated processing failure, retry exhaustion, retention review required, audit gap detected, vendor file quality issue, reconciliation upload issue, or API reliability issue.

Notification delivery, templates, recipient resolution, preferences, retries, delivery status, suppression rules, and delivery audit belong to a future Notification platform service.

## Search And Reporting

Proposal-level searchable fields include:

- Date range.
- Company.
- Child entity.
- Vendor.
- Buyer.
- Source module.
- File type.
- API event type.
- Status.
- Actor/user.
- Error type.
- Import/export direction.
- Correlation id.
- Related record reference.
- Retention class.
- Redaction class.

Logs & Audit should support audit search and filtering for operational investigation and accountability.

Analytics may consume audit signals, but Analytics owns reporting models, rollups, metrics, dashboards, and analytical definitions.

## Open Questions

- What file types require full backup?
- What payloads must be masked?
- What retention periods apply by file type?
- Which failed API calls store full payloads versus masked payload references?
- Who can view sensitive audit records?
- Can files be reprocessed from backup?
- What duplicate detection strategy is used for manual vendor uploads?
- What audit records are required for regulatory, contractual, or customer support needs?
- How should audit records link to invoice evidence, routing snapshots, fulfillment evidence, and pricing snapshots?
- Which audit records are internal-only versus buyer/vendor-visible?
- Which modules are required to emit audit events synchronously versus asynchronously?
- What redaction classes are required for customer, pricing, invoice, warranty, tenant, media, and licensing data?
- Which correction/reupload histories must be immutable?

## Impacts

Future Logs & Audit module drafting should define:

- Audit record model.
- File tracking record model.
- API transmission log model.
- Validation result and processing result model.
- Retry/failure history model.
- User-trigger history model.
- Source file reference and payload reference rules.
- Retention and redaction classes.
- Search/filtering contracts.
- Vendor manual file workflow tracking.
- AI Agent Services signal contracts.
- Notification hooks without owning notification delivery.

Future Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty support, Tenant Company, AI Agent Services, Notification, and Analytics refinements should emit or expose audit/file tracking signals without moving their source-of-truth responsibilities into Logs & Audit.

## Consequences

- Logs & Audit becomes the canonical platform service for audit records, file tracking, transmission logs, processing outcomes, validation outcomes, retries, failures, user-trigger history, and retention placeholders.
- Source modules remain owners of their business records and decisions.
- Vendor manual file flows gain traceability without forcing early API-only integration assumptions.
- Sensitive payload retention must be controlled through redaction, masking, retention classes, and access policy.
- Analytics, Notification, and AI Agent Services can consume audit signals without owning audit records or file processing history.
