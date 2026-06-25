# Assumptions / Open Questions

## Assumptions

- Pricing aligns with ADR-0005 and remains distinct from Tenant Company, Product Catalog, Device Catalog, Order Routing, Procurement, Fulfillment/Returns, Invoice Management, Integration Management, Notification, Logs & Audit, Analytics, AI Agent Services, and future Inventory, Payment, Accounting, Quote, or Buyer Storefront contexts.
- Vendors are authoritative for submitted pricing inputs where accepted by Product Catalog/Pricing governance.
- Product Catalog owns product records and catalog-carried pricing input storage; Pricing owns commercial interpretation, validation, calculations, snapshots, and pricing events.
- Pricing owns vendor-side commission and buyer-side commission interpretation as separate commercial components.
- Standard 7% / 7% commission behavior may exist as configurable default evidence, not hard-coded behavior.
- Buyer-facing Wholesale Price is a Pricing-owned calculated output/snapshot.
- Buyer-controlled customer-facing or resale pricing is separate from vendor source inputs and Pricing-owned wholesale/commission snapshots unless future scope assigns otherwise.
- Tenant Company owns hierarchy scope, eligibility scope, relationship eligibility, readiness, geography eligibility, user/entity access, roles, permissions, channel eligibility, and company-level commission configuration input scope.
- Pricing consumes Tenant Company evidence and must not infer tenant eligibility independently.
- Order Routing consumes quote-like results or order-bindable snapshots and owns routing decisions.
- Procurement consumes procurement-bindable quote/snapshot evidence, records accepted price evidence, and owns PO lifecycle.
- Invoice Management consumes invoice-bindable historical evidence and owns invoice lifecycle, reconciliation, disputes, payment, and accounting behavior.
- Fulfillment/Returns consumes return/refund pricing evidence where applicable and owns return/refund operational state.
- Pricing imports/exports follow `architecture/standards/import-export-validation-governance.md` for validation preview, update protection, blank-field protection, destructive action controls, identifier preservation, date/time handling, and audit evidence.

## Scale Assumptions

These assumptions are placeholders for pressure testing architecture choices. They should be replaced with measured or business-approved targets before implementation.

### Pricing Profiles, Rules, And Channels

- Placeholder: define expected profiles per tenant, buyer parent, buyer child/entity, vendor, product, Device Reference, category, region, channel, Product Type, contract, and timeframe.
- Placeholder: define expected channel count and channel-specific rule complexity for Online/DTC, Bulk PO, Owned Channel / Kaseory, Buyer Storefront, Marketplace, Retail POS, Promotional Campaign, and Buyer-Specific Contract placeholders.
- Placeholder: define maximum overlapping profiles or channel rules at equal specificity before blocking calculation.
- Placeholder: define expected profile, channel rule, approval, retirement, and supersession volume.

### Commission Components

- Placeholder: define expected vendor-side and buyer-side commission component count by tenant, vendor, buyer, entity, product, channel, Product Type, contract, and timeframe.
- Placeholder: define expected commission rule version retention, approval volume, expiration volume, and conflict frequency.
- Placeholder: define whether commission defaults are managed centrally, per tenant, per vendor, per buyer, per entity, per Product Type, or per contract.

### Effective Price Calculations

- Placeholder: define expected calculations per buyer session, order, PO, product page, batch import, export, downstream integration, and validation preview.
- Placeholder: define peak calculation throughput and burst behavior after upstream catalog, tenant, product, channel, commission, exception, override, or calculation-engine changes.
- Placeholder: define percentage of calculations expected to be synchronous versus precomputed or asynchronously refreshed.

### Quote-Like Results And Snapshots

- Placeholder: define expected quote-like result volume, validity window, expiration behavior, and conversion rate to order-bindable or procurement-bindable snapshots.
- Placeholder: define expected snapshots per order, PO, invoice, export, return/refund, and audit workflow.
- Placeholder: define snapshot retention, replay, supersession, historical reconstruction volume, and lookup latency.
- Placeholder: define order-bindable, procurement-bindable, export-bindable, invoice-bindable, return/refund, and audit snapshot classes.

### PO Pricing And Accepted-Price Variance

- Placeholder: define expected Bulk PO quote volume, line count, accepted-price variance frequency, requote rate, and review queue volume.
- Placeholder: define variance thresholds, expiration windows, retry behavior, and manual review SLA placeholders.
- Placeholder: define whether accepted prices can become invoice-bindable before all line-level variance issues are resolved.

### Buyer-Specific Overrides And Imports

- Placeholder: define expected override import row counts, validation preview volume, buyer-specific rule churn, expiration/revocation volume, and approval latency.
- Placeholder: define destructive update controls, blank-field behavior, and partial update limits for Pricing imports.
- Placeholder: define override conflict handling for equal-scope active overrides.

### Event Fanout, Redaction, And Replay

- Placeholder: define expected event fanout for profile, channel, commission, calculation, validation, quote-like result, snapshot, PO pricing, exception, override, sale pricing, stale marking, and recalculation changes.
- Placeholder: define replay volume, replay windows, dead-letter thresholds, consumer redaction classes, downstream lookup rates, and AI-safe event variants.

### Cache And Recalculation

- Placeholder: define expected cache cardinality by tenant, buyer parent, buyer child/entity, vendor, product, Device Reference, Product Type, category, region, channel, timeframe, rule version, commission version, input version, and output class.
- Placeholder: define max invalidation scope for parent-level, tenant-wide, vendor-wide, category-wide, channel-wide, commission-wide, or calculation-engine changes.
- Placeholder: define batch recalculation throughput, throttling thresholds, manual approval thresholds, stale result lifetime, and backpressure controls.

## Open Questions

- Which exact formulas apply for Buyer-facing Wholesale Price by channel and Product Type?
- Which commission settings live as Tenant Company configuration inputs versus Pricing-owned commercial rules?
- Should standard 7% / 7% commission be a default platform rule, tenant-level default, vendor-level default, buyer-level default, or only a placeholder?
- What is the confirmed precedence order for Vendor Wholesale Price, SRP/MSRP, MAP, No MAP, Sale Price, discounts, vendor-side commission, buyer-side commission, revenue share, exceptions, overrides, and buyer-specific contracts?
- How should MAP/No MAP behave: validation blocker, display rule, warning, approval workflow, or informational input?
- Which sale/promotion effective-date conflicts block calculation versus warn?
- Which buyers may accept or reject vendor sale pricing, and does that remain Pricing scope or Product Catalog/buyer storefront scope?
- Which commercial values are Product Catalog source inputs versus Pricing-calculated outputs?
- Which conflicts should block, warn, or calculate across scope, temporal, component, source, authorization, consumer, channel, commission, and bindability conflict classes?
- Are currency conversion, tax, fees, rebates, payment terms, or accounting treatment owned by Pricing, Invoice Management, future Payment/Accounting, or another future bounded context?
- Does CIXCI need a future Quote context for quote lifecycle distinct from Pricing, Order Routing, and Procurement?
- Which price calculations must be synchronous at order time, PO draft time, invoice time, or export time versus precomputed/asynchronous?
- How should stale upstream Product Catalog, Device Catalog, Tenant Company, or Procurement references affect new calculations, quote-like results, bindability, and historical snapshots?
- Which consumers can receive full component-level pricing details versus redacted summaries?
- What exact snapshot evidence does Invoice Management need for invoice lines, disputes, adjustments, reconciliation, and accounting sync?
- What exact pricing evidence does Fulfillment/Returns need for returns, refunds, exchanges, or adjustments?
- How should Owned Channel / Kaseory pricing exceptions interact with buyer-specific contracts and standard channel pricing?
- What replay and recalculation windows are acceptable after calculation engine, commission, channel, exception, override, or pricing rule changes?

## Decisions Needed

- Pricing profile scope lattice and specificity ranking.
- Pricing Channel vocabulary, channel selection evidence, and channel-specific formula ownership.
- Vendor-side and buyer-side commission component model, defaulting behavior, precedence, approval, redaction, and snapshot fields.
- Buyer-facing Wholesale Price formula and snapshot contract.
- Bulk PO pricing formula, bindability, accepted-price variance, requote, and invoice evidence model.
- Buyer-specific pricing override type, scope, import, approval, expiration, revocation, conflict, and audit model.
- Pricing validation hierarchy for Vendor Wholesale Price, Buyer-facing Wholesale Price, SRP/MSRP, MAP/No MAP, Sale Price, currency, negative values, blank fields, partial updates, invalid channel, invalid commission basis, and stale source inputs.
- Effective price snapshot immutability, supersession, adjustment, and correction model.
- Calculation result, quote-like result, order-bindable snapshot, procurement-bindable snapshot, export-bindable snapshot, invoice-bindable historical evidence, and return/refund evidence lifecycle split.
- API split for validation preview, calculation, quote, snapshot, PO bindability, accepted-price variance review, audit lookup, rule/commission/exception/override lookup, and administration.
- Event taxonomy, required fields, redaction classes, consumer boundaries, replay guarantees, and AI-safe signals.
- Recalculation, cache invalidation, stale marking, blast-radius, fanout, retry, and backpressure strategy.
- Scale targets for calculation throughput, snapshot volume, PO pricing variance volume, validation previews, override imports, cache cardinality, event fanout, lookup latency, and audit retention.

## Risks

- Pricing could absorb Tenant Company if hierarchy, eligibility, relationship approval, readiness, geography eligibility, user/entity access, channel eligibility, or tenant hierarchy signals become Pricing-owned decisions.
- Pricing could absorb Product Catalog if catalog-carried pricing inputs become Product Catalog-controlled calculated prices or if Pricing begins owning product lifecycle/availability facts.
- Pricing could absorb Order Routing if quote-like price results start selecting vendor, route, split, warehouse, or fulfillment path.
- Pricing could absorb Procurement if PO accepted-price evidence, response lifecycle, approval workflow, or PO state become Pricing-owned.
- Pricing could absorb Invoice Management if price snapshots become invoice lifecycle, payment, reconciliation, dispute, or accounting state.
- Pricing could absorb buyer storefront ownership if buyer customer-facing/resale pricing is treated as Pricing-owned without future scope.
- Parent/child commission override ambiguity could produce inconsistent buyer/entity-specific prices.
- MAP/SRP, No MAP, sale, discount, exception, channel, commission, and override conflicts could create non-auditable pricing outcomes without explicit precedence.
- Scope lattice explosion could make pricing profiles unmanageable at enterprise scale without specificity ranking, conflict detection, review queues, and blast-radius controls.
- High-volume recalculation could overload downstream consumers without batching, idempotency, cache invalidation, replay windows, and event fanout controls.
- Sensitive commercial terms could leak through events, logs, audit exports, caches, dead-letter queues, AI prompts, notification payloads, integration exports, or analytics feeds without redaction rules.
