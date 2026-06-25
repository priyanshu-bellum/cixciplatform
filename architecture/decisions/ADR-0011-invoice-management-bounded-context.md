# ADR-0011: Invoice Management Bounded Context

## Status

Proposed

## Context

Invoice Management sits downstream of Pricing, Order Routing, Fulfillment/Returns, Warranty support, future Logs & Audit, and future accounting integrations.

CIXCI needs invoice records, invoice reports, buyer invoice views, vendor invoice views, downloadable invoice CSV archives, invoice history, invoice status lifecycle, and invoice event signals based on completed operational events. Invoice Management must consume completed operational evidence without absorbing Pricing, Fulfillment, Payments, Accounting, Reconciliation, Order Routing, Product Catalog, Device Catalog, Tenant Company, Warranty, Notification, Logs & Audit, AI Agent Services, or Analytics responsibilities too early.

Invoice Management must also support buyer-specific pricing modes. Some buyers may use standard commission pricing. Others may need vendor wholesale only invoicing. Future buyers may require custom pricing exceptions. These invoice behaviors must rely on Pricing-provided snapshots and Tenant Company scope signals rather than reimplementing pricing rules inside Invoice Management.

This ADR is proposal-level. It does not finalize invoice timing, invoice numbering, tax handling, payment processing, accounting sync behavior, reconciliation ownership, refund workflow, CSV schema, retention policy, or implementation behavior.

## Decision

Introduce Invoice Management as a distinct bounded context.

Invoice Management owns invoice generation, invoice records, invoice reports, buyer/vendor invoice views, invoice status lifecycle, invoice lines, invoice archives, invoice history, invoice events, and proposal-level reconciliation placeholders.

Invoice Management consumes Pricing snapshots, routed order/suborder references, fulfillment delivery evidence, return/refund adjustment references, tenant scope, product/device references, Product Type, warranty-related adjustment placeholders, invoice period/date range, and commission/rev-share profile references.

Invoice Management must not recalculate price or commission independently. It must use Pricing-provided snapshot data and preserve snapshot references for audit and reconstruction.

### Invoice Management Owns

- Invoice generation.
- Invoice report creation.
- Buyer invoice views.
- Vendor invoice views.
- Invoice status lifecycle.
- Invoice line references.
- Commission/rev-share application using Pricing-provided snapshots.
- Delivered order invoice inclusion.
- Return/refund adjustment references.
- Reconciliation workflow placeholders.
- Downloadable invoice CSV archive.
- Invoice history.
- Invoice events.

### Invoice Management Does Not Own

- Price calculation.
- Pricing rules.
- Payment processing.
- Full accounting system ownership.
- Fulfillment execution.
- Return execution.
- Order routing decisions.
- Product/device source-of-truth.
- Tenant eligibility.
- Warranty claim approval.
- Audit log storage platform.
- Notification delivery.

## Relationship Boundaries

### Pricing

Pricing owns price calculation, pricing profiles, commission/rev-share interpretation, pricing exceptions, overrides, effective price snapshots, pricing audit, and pricing events.

Invoice Management consumes Pricing-provided snapshots, pricing snapshot references, commission/rev-share outputs, price component summaries where authorized, buyer pricing mode outputs, effective dates, and pricing audit references.

Invoice Management must not calculate price, recalculate commission, reinterpret MAP/SRP/sale pricing, alter pricing snapshots, or resolve Pricing-owned conflicts. If required pricing snapshot data is missing, stale, rejected, non-invoice-bindable, or inconsistent, Invoice Management should create invoice review or exception state rather than calculating the missing value.

### Order Routing

Order Routing owns routing decisions, order decomposition, routed orders, vendor/manufacturer suborders, split-order decisions, routing snapshots, routing exceptions, and routing events.

Invoice Management may consume routed order references, routed suborder references, routing snapshot references, parent order references, order line references, vendor/manufacturer assignment references, and Product Type context.

Invoice Management must not choose routes, split orders, select vendors/manufacturers, alter routing snapshots, or create suborders.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment handoff tracking, shipment execution, shipment status, delivery confirmation, operational fulfillment exceptions, return operational handling, return receipt, replacement shipment execution, immutable status history, and fulfillment/return events.

Invoice Management may consume delivered fulfillment status, delivery confirmation references, shipment evidence, return receipt references, replacement evidence, quantity reconciliation evidence, and operational exception references.

Invoice Management must not create shipments, mark delivery, execute returns, create replacements, resolve fulfillment exceptions, or decide carrier/vendor fulfillment status.

### Product Catalog

Product Catalog owns product records, Product Type definitions and validation, product lifecycle, product visibility/activation/download, accessory compatibility assertions, catalog-carried pricing inputs, product warranty facts, and product references.

Invoice Management may consume Product Catalog references, product identifiers, product display metadata where authorized, Product Type references, warranty product fact references, and invoice-safe product context.

Invoice Management must not mutate product records, determine product visibility, own Product Type validation, own compatibility, or interpret catalog-carried pricing inputs.

### Device Catalog

Device Catalog owns canonical Device records, Device References, device identifiers, normalization, lifecycle metadata, taxonomy, buyer-exportable device data, and device events.

Invoice Management may consume Device References and invoice-safe device context for device order lines or device-related invoice reporting.

Invoice Management must not mutate canonical device data, resolve device identity, own buyer device export state, or create manufacturer purchase order behavior.

### Tenant Company

Tenant Company owns tenant scope, buyer/entity hierarchy, buyer/entity scope, company market segment, Buyer Pricing Mode configuration, relationship eligibility, geography eligibility, activation readiness, Product Type enablement scope, licensed-property scope, user/entity access, and readiness signals.

Invoice Management may consume buyer/vendor/entity scope, buyer pricing mode reference, buyer/entity invoice configuration, and invoice period scope where authorized.

Invoice Management must not derive tenant eligibility, approve relationships, manage parent/child hierarchy, decide user/entity access, or define Buyer Pricing Mode independently of Tenant Company and Pricing contracts.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Invoice Management may consume warranty-related adjustment placeholders, replacement evidence, return evidence, or claim-related invoice adjustment references where a future owning workflow provides them.

Invoice Management must not decide warranty eligibility, claim approval, claim denial, vendor warranty registration delivery, customer warranty UX, or replacement execution.

### Logs & Audit

Logs & Audit may own centralized audit records, file tracking, transmission logs, source file retention, evidence retention, compliance review workflows, and audit platform storage where that platform service exists.

Invoice Management owns invoice records, invoice history, invoice CSV archives, invoice report outputs, invoice status history, and invoice events. Logs & Audit may consume or retain invoice files, exports, reconciliation uploads, and transmission logs once defined.

Invoice Management must not become the centralized audit log storage platform.

### Notification Platform Service Future Placeholder

Invoice Management may emit events that later trigger invoice-related notifications.

Notification delivery, templates, recipient resolution, preferences, suppression rules, retries, delivery status, and delivery audit belong to a future Notification platform service if introduced.

Invoice Management owns invoice business events and invoice state only. It should not become the notification system.

### AI Agent Services

AI Agent Services may consume invoice, reconciliation, mismatch, duplicate row, missing row, amount difference, commission variance, and vendor billing issue signals and produce recommendations, review queues, confidence scores, or suggested actions.

AI agents may recommend review actions but must not finalize invoices, alter financial records, change invoice status, resolve reconciliation mismatches, issue credits/refunds, bypass approval/audit workflows, or update accounting systems without approved action contracts.

### Analytics

Analytics owns reporting models, rollups, metrics, analytical read models, dashboards, and reporting latency decisions.

Invoice Management may emit invoice records, status events, invoice report references, and invoice/reconciliation signals for Analytics. Analytics must not become owner of invoice lifecycle, invoice records, invoice CSV archives, reconciliation workflow, or invoice status.

### QuickBooks / Accounting Sync Placeholder

QuickBooks or other accounting sync remains an integration placeholder.

Invoice Management may produce invoice export records, accounting sync references, sync status placeholders, and error/retry signals where authorized.

Invoice Management does not own the external accounting system, full accounting ledger, payment processing, bank reconciliation, tax accounting, or accounting platform configuration unless a future ADR assigns those responsibilities.

## Invoice Inputs

Proposal-level invoice inputs include:

- Price snapshot reference from Pricing.
- Routed order/suborder reference from Order Routing.
- Parent order reference and order line references.
- Delivered fulfillment status from Fulfillment and Returns.
- Delivery confirmation reference.
- Return/refund adjustment reference placeholder.
- Buyer/vendor/entity scope from Tenant Company.
- Product Catalog references.
- Device References where relevant.
- Product Type.
- Warranty-related adjustment placeholder.
- Date range / invoice period.
- Commission/rev-share profile reference.
- Buyer Pricing Mode reference.
- Fulfillment quantity reconciliation evidence where relevant.
- Return receipt or replacement evidence where relevant.

These inputs are consumed for invoice generation only. They do not transfer Pricing, Routing, Fulfillment, Product Catalog, Device Catalog, Tenant Company, Warranty, Payment, Accounting, Logs & Audit, Notification, AI, or Analytics ownership into Invoice Management.

## Buyer Pricing Mode

Invoice Management must support buyer-level pricing modes defined in Tenant Company and commercially interpreted by Pricing.

Proposal-level Buyer Pricing Mode options:

- Standard Commission Pricing.
- Vendor Wholesale Only.
- Custom Pricing Exception (future).

### Standard Commission Pricing

When Buyer Pricing Mode is Standard Commission Pricing:

- Commission is applied.
- Commission Amount = SRP x Commission %.
- Wholesale Price includes markup from Pricing.
- Invoice Management should use Pricing snapshot data for SRP, commission percent, commission amount, wholesale price, markup, and invoice-bindable price evidence.

### Vendor Wholesale Only

When Buyer Pricing Mode is Vendor Wholesale Only:

- Commission is not applied.
- Commission Amount = 0.
- Wholesale Price = Vendor Wholesale Price.
- Invoice must bill using Vendor Wholesale Price.
- Invoice Management should use Pricing snapshot data that explicitly identifies vendor wholesale only behavior.

### Custom Pricing Exception (Future)

When Buyer Pricing Mode is Custom Pricing Exception:

- Future Pricing and Tenant Company contracts must define how the mode is configured, approved, effective-dated, and exposed to Invoice Management.
- Invoice Management should not infer custom pricing behavior from invoice history or buyer labels.

### Buyer Pricing Mode Guardrails

- Invoice Management must not assume commission exists for every buyer.
- Invoice calculations must rely on Pricing snapshot data rather than recalculating commission independently.
- If Buyer Pricing Mode in Tenant Company conflicts with Pricing snapshot output, Invoice Management should create invoice review or exception state.
- If Pricing snapshot does not contain required invoice-bindable pricing mode evidence, Invoice Management should block finalization or require review.

## Invoice Outputs

Proposal-level invoice outputs include:

- Invoice record.
- Invoice line.
- Invoice report.
- Buyer invoice CSV.
- Vendor invoice CSV.
- Invoice status.
- Invoice adjustment reference.
- Reconciliation result placeholder.
- Downloadable invoice archive.
- Invoice history.
- Invoice event signals.
- Accounting sync placeholder reference.

Outputs should preserve upstream references rather than copying full source records where a boundary reference is sufficient.

## Invoice Report Scope

Proposal-level invoice report scope includes:

- Accessory orders with Delivered status.
- Return Refunded status / adjustment references where applicable.
- Device orders processed in selected date range.
- Future branded merchandise orders if enabled.
- Buyer-level invoice generation by entity.
- Configurable date ranges for MVNO, Wireless Carrier, Retailer, and future buyer types.
- Product Type-aware invoice lines for accessories, devices, and future branded merchandise.
- Delivered order inclusion based on Fulfillment/Returns evidence.
- Return/refund adjustment references where future owning contexts provide them.

Invoice report inclusion should not imply ownership of fulfillment status, return execution, refund decision, or pricing calculation.

## Reconciliation Workflow Placeholder

Invoice Management may include proposal-level reconciliation workflow placeholders.

Placeholder capabilities may include:

- Vendor reconciliation file upload.
- Comparison of vendor-submitted files against CIXCI order, invoice, pricing snapshot, routing, and fulfillment evidence references.
- Detection of mismatches.
- Detection of missing rows.
- Detection of duplicate rows.
- Detection of amount differences.
- Detection of status differences.
- Reconciliation review queues.
- Reconciliation result placeholders.

Full reconciliation ownership may stay in Invoice Management or split later if complexity grows into a dedicated Reconciliation or Accounting Operations context.

Reconciliation placeholders must not become payment processing, accounting ledger ownership, Product Catalog source-of-truth changes, Pricing recalculation, Order Routing correction, or Fulfillment status mutation.

## Payment Tracking Boundary

Invoice Management may track invoice/payment status lightly, such as:

- Draft.
- Generated.
- Finalized.
- Sent placeholder.
- Payment status updated placeholder.
- Paid placeholder.
- Partially paid placeholder.
- Overdue placeholder.
- Void/cancelled placeholder.
- Disputed placeholder.

Invoice Management does not process payments unless a future Payments context is introduced.

QuickBooks/accounting sync remains an integration placeholder. Payment capture, bank settlement, payment processor integration, payment failure handling, and accounting ledger ownership are out of scope unless a future ADR assigns those responsibilities.

## Events And Signals

Proposal-level events include:

- `invoice.generated`.
- `invoice.updated`.
- `invoice.finalized`.
- `invoice.export.created`.
- `invoice.adjustment.created`.
- `invoice.reconciliation.uploaded`.
- `invoice.reconciliation.mismatch.detected`.
- `invoice.payment.status.updated` placeholder.

Event payloads should use references and consumer-appropriate fields. Sensitive buyer, vendor, pricing, payment, accounting, warranty, customer, or reconciliation details should be redacted or scoped by consumer class.

## AI Agent Services Signals

Possible signals for AI Agent Services include:

- Reconciliation mismatch signal.
- Commission variance signal.
- Duplicate invoice row signal.
- Missing invoice row signal.
- Amount difference signal.
- Vendor billing issue signal.
- Pricing mode conflict signal.
- Return/refund adjustment review signal.
- Accounting sync failure signal placeholder.

AI agents may recommend review actions, summarize mismatch clusters, suggest reconciliation review queues, or identify invoice risk patterns.

AI agents must not finalize invoices, alter financial records, change payment status, approve credits/refunds, resolve reconciliation mismatches, update accounting systems, or bypass approval/audit workflows without approved action contracts and audit tracking.

## Notification Hooks

Invoice Management may emit events that later trigger notifications.

Possible notification-triggering events include invoice generated, invoice finalized, invoice export created, reconciliation mismatch detected, invoice adjustment created, payment status updated placeholder, and accounting sync failure placeholder.

Notification delivery, templates, recipient resolution, preferences, retries, delivery status, suppression rules, and delivery audit belong to a future Notification platform service.

Invoice Management should expose invoice business events and invoice state; it should not own notification delivery implementation.

## Open Questions

- Are device and accessory invoices combined or separate?
- Are buyer invoices and vendor invoices generated in the same cycle?
- Is vendor reconciliation required for every invoice cycle or optional?
- What exact lifecycle event makes an order invoice-eligible?
- Are returns handled as negative invoice lines or separate adjustment records?
- Does Invoice Management track payment status or only invoice generation?
- What fields are required for QuickBooks sync?
- How are partial shipments and partial returns invoiced?
- What timezone controls invoice periods?
- What retention period applies to invoice CSV archives?
- Which module owns accepted parent order lifecycle before invoice generation?
- Which invoice statuses are internal-only versus buyer/vendor-visible?
- Which buyer pricing mode conflicts should block invoice finalization?
- Which reconciliation workflows should remain in Invoice Management versus future Reconciliation or Accounting Operations?
- Which invoice events should trigger future notifications?

## Impacts

Future Invoice Management module drafting should define:

- Invoice record, invoice line, invoice report, and invoice CSV archive model.
- Invoice status lifecycle.
- Invoice period/date range model and timezone rules.
- Buyer/vendor/entity invoice view boundaries.
- Pricing snapshot input contract.
- Buyer Pricing Mode handling using Pricing snapshots.
- Delivered order inclusion rules from Fulfillment/Returns evidence.
- Return/refund adjustment reference model.
- Reconciliation upload and mismatch placeholder model.
- Downloadable archive retention and access rules.
- QuickBooks/accounting sync placeholder contracts.
- Notification hooks without owning notification delivery.
- AI Agent Services signal contracts.

Future Pricing, Tenant Company, Order Routing, Fulfillment/Returns, Warranty support, Logs & Audit, Notification, AI Agent Services, Analytics, and accounting integration refinements should preserve Invoice Management as owner of invoice lifecycle without moving their source-of-truth responsibilities into Invoice Management.

## Consequences

- Invoice Management becomes the canonical owner of invoice records, invoice lines, invoice reports, invoice CSV archives, invoice history, invoice status, invoice events, and proposal-level reconciliation placeholders.
- Pricing remains owner of price calculation, commission/rev-share interpretation, and invoice-bindable pricing snapshots.
- Tenant Company remains owner of buyer/entity scope and Buyer Pricing Mode configuration.
- Order Routing remains owner of routing decisions and routed suborder structure.
- Fulfillment/Returns remains owner of delivery, return, and replacement operational evidence.
- Warranty support remains separate from invoice lifecycle unless future financial warranty adjustments require explicit boundaries.
- Payments and full accounting ownership remain future contexts or integration placeholders.
- Logs & Audit, Notification, Analytics, and AI Agent Services can consume invoice signals without owning invoice lifecycle.
