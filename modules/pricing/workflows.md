# Pricing Workflows

This document is proposal-level architecture. It outlines Pricing workflows without finalizing commercial policy or moving neighboring module ownership into Pricing.

## Primary Workflows

### Calculate Effective Price

1. Receive an authorized calculation request from a downstream consumer.
2. Consume Tenant Company eligibility, permission, company/entity, channel, and scope signals without deriving relationship approval, readiness, geography eligibility, user/entity access, channel eligibility, or tenant hierarchy.
3. Resolve Product Catalog pricing input references and Device Catalog Device References where provided.
4. Resolve Pricing Channel and channel selection evidence from the source workflow or transaction type.
5. Resolve applicable Pricing Profile, Pricing Rule Versions, Commission Rule Versions, source input versions, and Calculation Engine Version.
6. Validate vendor pricing inputs, channel, commission basis, currency, effective dates, MAP/SRP, Sale Price, No MAP behavior, buyer-specific overrides, and exceptions.
7. Apply proposal-level calculation precedence for base price, Vendor Wholesale Price, vendor-side commission, buyer-side commission/markup, revenue share, margin, discount, MAP/SRP, sale pricing, exceptions, and overrides.
8. Return a Calculation Result with component summary, rule version summary, source input version summary, channel, audit reference, warnings, block reasons, and redaction class.

### Validate Pricing Preview

1. Receive a pricing import, pricing profile/rule change, override request, channel change, commission change, or snapshot bindability request.
2. Apply the pricing validation hierarchy for required scope, source inputs, channel, numeric values, currency, blank fields, locked fields, effective dates, commission basis, and source version state.
3. Produce validation outcomes: calculate, block, warning, review-required, or preview-ready.
4. Preserve preview before/after summaries where safe.
5. Do not mutate Pricing-owned rules, snapshots, or downstream source records from preview alone.

Pricing imports should follow `architecture/standards/import-export-validation-governance.md` for mode selection, blank-field protection, non-destructive defaults, confirmation, destructive controls, and audit evidence.

### Calculate Online / Direct-To-Consumer Price

1. Receive an authorized Online/DTC calculation request with tenant scope, buyer/entity scope, product reference, channel selection evidence, and Product Catalog pricing input reference.
2. Resolve Vendor Wholesale Price input and applicable buyer-side commission/markup component.
3. Resolve Buyer-facing Wholesale Price visibility evidence, including Tenant Company scope/version, role/scope projection, buyer/entity scope, channel eligibility, Product Catalog product-channel flag version, Product Catalog product visibility/reference version, redaction decision version, authorized consumer class, and visibility expiration.
4. Evaluate SRP/MSRP, MAP, No MAP, Sale Price, buyer-specific overrides, owned-channel exceptions, promotional placeholders, and channel-specific exceptions.
5. Calculate Buyer-facing Wholesale Price where rule evidence supports it.
6. Return calculation result, quote-like result, order-bindable snapshot, or export-bindable snapshot according to requested output class and visibility state.
7. Block or route buyer-facing display to review when visibility evidence is missing, stale, expired, unauthorized, or conflicting.
8. Order Routing consumes snapshots/quote-like results only; it owns routing and order decisions.
9. Invoice Management consumes invoice-bindable snapshot values only; it does not recalculate Online/DTC pricing.

### Calculate Bulk Purchase Order Price

1. Receive an authorized Bulk PO calculation request from Procurement or an approved preview workflow.
2. Resolve buyer/entity scope, seller/vendor/manufacturer target, Product Type, product or Device Reference, requested quantity, channel selection evidence, and requested output class.
3. Resolve Vendor Wholesale Price, Agreed Bulk PO Price, contract-specific PO price, or buyer-specific PO override where configured.
4. Do not automatically apply Online/DTC buyer-side commission unless an explicit Pricing rule or contract configures it.
5. Produce a quote-like result and/or procurement-bindable snapshot.
6. Preserve requested price, quote expiration, procurement-bindable status, invoice-bindable status, supersession/expiration state, and pricing review-required state.
7. Procurement owns PO lifecycle and accepted-price evidence.
8. Pricing owns accepted-price variance interpretation, requote-required behavior, and pricing review-required behavior.

### Interpret Accepted PO Price Variance

1. Receive Procurement accepted-price evidence as a reference, not as source Pricing mutation or standalone Pricing-owned truth.
2. Validate PO reference, PO line reference, Procurement source record version, Procurement disposition, applied vs ignored state, external response reference, accepted price source, accepted price evidence audit reference, and Procurement review state.
3. Compare accepted price placeholder against Pricing snapshot/quote evidence according to Pricing-owned variance rules.
4. Record accepted price variance, accepted price variance reason, requote-required state, superseded/expired state, supersession reference, and Pricing review-required state.
5. Produce a new quote/snapshot, review-required result, invoice-bindability-blocked result, or variance acknowledgement according to proposal-level rules.
6. Block invoice-bindable PO pricing or route to review when Procurement evidence is missing, stale, conflicting, ignored, review-required, or not applicable.
7. Do not mutate Procurement PO lifecycle, accepted response, receiving, invoice state, or payment state.

### Create Quote-Like Price Result

1. Receive an authorized request for a quote-like result from Order Routing, Procurement, or another approved consumer.
2. Validate that the calculation result is eligible for quote-like use and selected channel.
3. Record validity window, consumer reference, output class, warnings, block reasons, audit reference, and redaction class.
4. Return a quote-like result without selecting vendor, route, split, warehouse, fulfillment path, PO outcome, or order outcome.
5. Placeholder: define whether quote lifecycle stays in Pricing or moves to a future Quote context.

### Create Effective Price Snapshot

1. Downstream consumer requests an immutable snapshot for a calculated Effective Price or quote-like result.
2. Pricing verifies calculation request, channel, rule versions, commission rule versions, source input versions, calculation engine version, input references, effective date, transaction time, bindability state, consumer authorization, and visibility evidence where output is buyer-facing.
3. Pricing records an immutable Effective Price Snapshot with snapshot class, output class, order-bindable state, procurement-bindable state, export-bindable state, invoice-evidence state, audit reference, and redaction class.
4. Procurement-related snapshots should preserve Procurement accepted-price evidence references and Pricing variance disposition when used for PO invoice bindability.
5. Pricing publishes `pricing.effective-price.snapshot-created` or a more specific snapshot event.

### Provide Snapshot To Invoice Management

1. Invoice Management requests or consumes a price snapshot reference.
2. Pricing exposes snapshot evidence, component summary, effective dates, transaction time, version references, channel, commission fields, Buyer-facing Wholesale Price where authorized, and audit reference according to authorization.
3. For PO invoice evidence, Pricing exposes Procurement accepted-price evidence references, Procurement disposition, Pricing variance disposition, and invoice-bindability state rather than standalone accepted PO price truth.
4. Invoice Management validates required snapshot values and owns invoice lifecycle, reconciliation, dispute, payment, and accounting behavior.
5. Pricing does not recalculate invoices or mutate invoice state.

### Return / Refund Pricing Evidence

1. Fulfillment/Returns or Invoice Management supplies return/refund evidence references where pricing adjustment evidence is needed.
2. Pricing validates original transaction pricing snapshot reference, original snapshot version/hash, return/refund evidence reference and version, source module reference, source-module disposition, adjustment reason, quantity basis, refund/adjustment price basis, and audit reference.
3. Pricing identifies original snapshot references and any Pricing-owned adjustment or supersession evidence.
4. Pricing may produce a new adjustment-oriented calculation/snapshot reference where future rules allow.
5. Missing, stale, conflicting, or insufficient return/refund evidence blocks adjustment pricing output or routes to review.
6. Fulfillment/Returns owns return execution. Invoice Management owns invoice adjustment/refund lifecycle. Pricing owns pricing evidence only.
7. Pricing does not decide whether a refund, return, credit, payment, or invoice adjustment should occur.

### Manage Pricing Profile And Rules

1. Authorized Pricing Manager or Pricing Admin creates or updates a pricing profile.
2. Pricing validates scope references without owning upstream records.
3. Pricing records rule version, commission rule version/hash where applicable, channel, effective date, transaction time, expiration, approval state, and audit metadata.
4. Pricing publishes profile or rule change events where downstream consumers depend on them.
5. Pricing marks affected cached calculations, quote-like results, and future calculations stale or review-required according to invalidation rules.

### Apply Pricing Exception Or Buyer-Specific Override

1. Authorized user requests a typed pricing exception or buyer-specific override.
2. Pricing validates scope, affected subject, channel, effective date range, transaction time, expiration, approver, reason, override mode, Tenant Company scope evidence, and conflict behavior.
3. Pricing records audit metadata and approval state.
4. Pricing applies exception or override only during calculation and only within the approved scope.
5. Pricing publishes exception or override lifecycle events and invalidates affected cached outputs.

### Owned Channel / Kaseory Exception Workflow

1. Authorized user or configuration source proposes Owned Channel / Kaseory pricing behavior.
2. Pricing models it as a Pricing Channel, Pricing Profile, Pricing Exception, or Buyer-Specific Contract placeholder.
3. Pricing validates channel selection evidence, effective dates, component changes, redaction class, and audit reference.
4. Pricing applies the exception only within approved scope.
5. Pricing does not move owned-channel storefront execution, Product Catalog publishing, Order Routing, or Invoice Management behavior into Pricing.

## Recalculation / Cache Invalidation Strategy

This strategy is proposal-level and does not finalize infrastructure design.

### Stale Marking

- Mark calculation results, quote-like results, cached effective prices, and non-snapshot outputs stale when referenced Product Catalog, Device Catalog, Tenant Company, Pricing Rule, Pricing Profile, commission rule, exception, override, channel rule, visibility evidence, Procurement accepted-price evidence, return/refund evidence, or calculation engine versions change.
- Do not mark immutable snapshots mutable; snapshots may be superseded or annotated but should not be overwritten.
- Record stale reason, source event, affected scope, affected component family, and audit reference.

### Invalidation Scope

- Invalidation should be scoped by tenant, buyer parent, buyer child/entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, timeframe, pricing profile, pricing rule version, commission rule version, exception, override, visibility evidence, Procurement evidence, and adjustment evidence where available.
- Broad upstream changes should produce bounded invalidation plans before recalculation begins.
- Unknown blast radius should default to review-required or staged recalculation rather than full synchronous recalculation.

### Batch Recalculation

- Use batch recalculation for high-volume profile/rule/input/channel/commission changes.
- Batch jobs should carry batch id, source event references, scope filters, replay window, idempotency key, and audit reference.
- Recalculation should preserve source input versions and calculation engine version used for each output.
- Placeholder: define priority between order-time recalculation, PO-time recalculation, buyer-facing display recalculation, export recalculation, adjustment recalculation, and audit/replay recalculation.

### Async Fanout Controls

- Emit compact invalidation or recalculation events first; consumers needing sensitive detail should perform authorized lookup.
- Rate-limit fanout by tenant, vendor, buyer, product, Product Type, Device Reference, channel, and rule family.
- Use dead-letter and review queues for unresolved conflicts rather than retry storms.
- Preserve redaction class through retries, logs, queues, and replay.

### Cache Keys

- Proposal-level cache keys should include tenant scope, buyer parent, buyer child/entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, effective date, pricing profile version, pricing rule version summary, commission rule version summary, source input version summary, calculation engine version, exception/override version summary, visibility evidence version, and output class.
- Cache keys for redacted outputs should include consumer type and redaction class.
- Cache keys should not assume shared Product Catalog or Device Catalog references imply shared pricing visibility.

### Replay Windows

- Define replay windows for profile/rule changes, commission changes, source input changes, exception/override changes, channel changes, visibility evidence changes, Procurement accepted-price evidence changes, return/refund evidence changes, calculation engine changes, and audit reconstruction.
- Replay should preserve historical evidence and should not recalculate immutable snapshots from current state unless explicitly requested as a new calculation.
- Placeholder: define when replay creates supersession events versus review-required records.

### Blast-Radius Limits

- Parent-level, tenant-wide, vendor-wide, category-wide, Product Type-wide, channel-wide, commission-rule-wide, visibility-evidence-wide, or calculation-engine changes should declare estimated affected count before execution where possible.
- Large recalculation jobs should be staged, resumable, idempotent, and auditable.
- Placeholder: define thresholds for manual approval, throttling, or delayed recalculation.

## Alternate Flows

- Asynchronous recalculation after Product Catalog pricing input changes.
- Asynchronous recalculation after Device Catalog lifecycle or taxonomy changes used by Pricing rules.
- Recalculation review after Tenant Company hierarchy, relationship, geography, readiness, user/entity access, channel eligibility, or child override scope changes.
- Pricing exception approval workflow with multi-step review.
- Batch recalculation for buyer/entity-specific effective prices.
- Pricing import preview with partial pricing updates and blank-field protection.
- Buyer-specific override import preview.
- PO accepted-price evidence handoff review.
- PO accepted-price variance review.
- Buyer-facing visibility evidence review.
- Return/refund pricing evidence review.

## Failure Flows

- Missing Tenant Company scope blocks calculation or returns review-required status.
- Tenant Company scope signals that are missing, conflicting, stale, or unresolved block calculation or return review-required status.
- Unknown Product Catalog reference blocks calculation or returns review-required status.
- Unknown or deprecated Device Reference blocks calculation only where Pricing rules require a valid Device Reference.
- Missing, stale, superseded, expired, or conflicting Product Catalog pricing input blocks or routes to review.
- Missing, stale, or unauthorized buyer-facing visibility evidence blocks buyer-facing display or routes to review.
- Missing, stale, conflicting, ignored, or review-required Procurement accepted-price evidence blocks PO invoice bindability or routes to review.
- Missing, stale, conflicting, or insufficient return/refund evidence blocks adjustment pricing output or routes to review.
- Invalid Pricing Channel blocks or routes to review.
- Invalid commission basis blocks or routes to review.
- Negative price values block unless a future adjustment-specific rule explicitly allows signed adjustments.
- Blank field in partial pricing update does not clear existing value unless explicit clear behavior is allowed and confirmed.
- Conflicting pricing rules, expired exceptions, overlapping overrides, or unresolved precedence produce blocked or review-required results.
- Expired quote-like result cannot create a bindable snapshot without requote/review.
- Snapshot creation failure should not mutate order, PO, invoice, fulfillment, reconciliation, or analytics state inside Pricing.
- Downstream event publication failure should retry with the same event payload and audit reference.

## Operational Notes

- Pricing should prefer explicit input references, source input versions, rule versions, commission rule versions, channel evidence, visibility evidence, Procurement evidence references, return/refund evidence references, and calculation engine versions over implicit reads where snapshots must be explainable.
- Existing snapshots should remain immutable when upstream catalog, device, tenant, channel, commission, exception, override, Procurement, return/refund, or pricing rules change.
- High-volume recalculation should be bounded by batch controls, event fanout controls, replay windows, blast-radius controls, and idempotency keys.
- Pricing must not infer tenant eligibility, catalog ownership, device ownership, order routing, PO lifecycle, fulfillment, invoice lifecycle, refund execution, reconciliation, notification delivery, integration transport, or analytics decisions.
