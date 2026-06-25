# Pricing OpenAPI Contracts

Use this template to document implementation-oriented API specifications for the Pricing module. This file is proposal-level and should not finalize business rules.

## API Purpose

Define implementation-oriented contract placeholders for pricing calculation, pricing validation preview, quote-like result creation, immutable snapshot creation and lookup, PO pricing bindability, Procurement accepted-price evidence handoff, accepted-price variance review, buyer-facing pricing visibility evidence, return/refund adjustment pricing evidence, pricing audit lookup, pricing rule/profile/commission lookup, pricing exception lookup, buyer-specific override administration, and pricing profile administration.

## Service Ownership

Pricing owns these API contracts for commercial interpretation, validation, calculation, quote-like results, snapshots, commission interpretation, channel pricing, redaction-safe pricing outputs, bindability, variance review, exceptions, and overrides. Tenant Company, Product Catalog, Device Catalog, Order Routing, Procurement, Fulfillment/Returns, Invoice Management, Integration Management, Notification Platform Service, Logs & Audit, and Analytics retain their own bounded-context responsibilities.

## Endpoint Inventory

- `POST /pricing/validate`
- `POST /pricing/calculate`
- `POST /pricing/quotes`
- `GET /pricing/quotes/{quoteLikeResultId}`
- `POST /pricing/snapshots`
- `GET /pricing/snapshots/{snapshotId}`
- `GET /pricing/effective-prices/{effectivePriceId}`
- `POST /pricing/visibility-evidence/validate`
- `GET /pricing/visibility-evidence/{visibilityEvidenceId}`
- `POST /pricing/po-pricing/evidence-handoffs`
- `POST /pricing/po-pricing/variance-review`
- `GET /pricing/po-pricing/{poPricingBindabilityId}`
- `POST /pricing/adjustment-pricing/evidence`
- `GET /pricing/adjustment-pricing/evidence/{adjustmentPricingEvidenceId}`
- `GET /pricing/channels`
- `GET /pricing/profiles/{pricingProfileId}`
- `POST /pricing/profiles`
- `PATCH /pricing/profiles/{pricingProfileId}`
- `GET /pricing/rules/{pricingRuleId}`
- `GET /pricing/commission-rules/{commissionRuleId}`
- `GET /pricing/exceptions/{pricingExceptionId}`
- `POST /pricing/exceptions`
- `PATCH /pricing/exceptions/{pricingExceptionId}`
- `GET /pricing/overrides/{pricingOverrideId}`
- `POST /pricing/overrides`
- `PATCH /pricing/overrides/{pricingOverrideId}`
- `GET /pricing/audit-records/{auditRecordId}`

## Request Methods

- `POST` for validation preview, calculation, quote-like result creation, snapshot creation, visibility evidence validation, PO evidence handoff, PO variance review, adjustment pricing evidence, profile creation, exception creation, and override creation.
- `GET` for quote-like result, effective price, snapshot, visibility evidence, PO pricing bindability, adjustment pricing evidence, channel, profile, rule, commission rule, exception, override, and audit retrieval.
- `PATCH` for proposal-level profile, exception, and override updates.

## Path Parameters

- `effectivePriceId`: Pricing-owned effective price identifier.
- `quoteLikeResultId`: Pricing-owned quote-like result identifier.
- `pricingProfileId`: Pricing-owned profile identifier.
- `pricingRuleId`: Pricing-owned rule identifier.
- `commissionRuleId`: Pricing-owned commission rule identifier.
- `pricingExceptionId`: Pricing-owned exception identifier.
- `pricingOverrideId`: Pricing-owned buyer-specific override identifier.
- `snapshotId`: Pricing-owned immutable snapshot identifier.
- `visibilityEvidenceId`: Pricing-owned visibility-safe output evidence identifier.
- `poPricingBindabilityId`: Pricing-owned PO bindability identifier linked to Procurement-owned evidence.
- `adjustmentPricingEvidenceId`: Pricing-owned return/refund adjustment pricing evidence identifier.
- `auditRecordId`: Pricing-owned audit record identifier.

## Query Parameters

- Placeholder: tenant scope filter.
- Placeholder: buyer parent and buyer child/entity filters.
- Placeholder: vendor, product, Device Reference, Product Type, category, region, channel, contract, and timeframe filters.
- Placeholder: effective date filter.
- Placeholder: transaction time filter.
- Placeholder: rule version, commission rule version, source input version, visibility evidence version, Procurement evidence version, return/refund evidence version, calculation engine version, snapshot class, and output class filters.
- Placeholder: redaction or consumer class filter.

## Request Body Schema

- Tenant scope reference from Tenant Company.
- Buyer parent, buyer child/entity, vendor, region, channel, channel selection evidence, contract placeholder, Product Type, and timeframe references.
- Product reference, product visibility reference, product channel flag version, and catalog-carried pricing input reference from Product Catalog.
- Device Reference and device attribute references from Device Catalog.
- Quantity, requestedAt, effectiveAt, correlationId, consumer type, requested output class, and redaction class.
- Buyer-facing visibility evidence: Tenant Company scope reference/version, role/scope projection reference, buyer/entity scope reference, channel eligibility reference, Product Catalog product-channel flag version, Product Catalog product visibility/reference version, redaction decision version, authorized consumer class, pricing output visibility state, visibility evidence expiration, recheck-before-display flag, and audit reference.
- PO evidence handoff: Procurement accepted price evidence reference, PO reference, PO line reference, Procurement source record version, Procurement disposition, applied vs ignored state, external response reference, accepted price source, accepted price variance reason, accepted price evidence audit reference, Procurement review state, requote-required state, supersession reference, and Pricing review-required state.
- Return/refund adjustment evidence: original transaction pricing snapshot reference, original snapshot version/hash, return/refund evidence reference/version, source module reference, source-module disposition, adjustment reason, quantity basis, refund/adjustment price basis, invoice adjustment reference placeholder, review-required state, supersession reference, and audit reference.
- Pricing profile, pricing rule, commission rule, exception, or override administration payloads.

## Response Schemas

- Calculation result response with Pricing Channel, component summary, vendor-side commission component, buyer-side commission component, Buyer-facing Wholesale Price where authorized, buyer-facing visibility evidence summary, applied exception references, applied override references, warnings, block reasons, source input versions, rule versions, commission rule versions, calculation engine version, and audit reference.
- Validation preview response with errors, warnings, review-required states, blank-field behavior, partial update behavior, stale/superseded source inputs, missing/stale visibility evidence, missing/stale Procurement evidence, missing/stale return/refund evidence, invalid channel, invalid commission basis, and before/after preview summary where safe.
- Quote-like result response with validity window, order/procurement binding eligibility, consumer reference, warnings, block reasons, visibility evidence reference where applicable, and audit reference.
- Immutable price snapshot response with snapshot class, output class, input references, source input versions, rule versions, commission rule versions, calculation engine version, component summary, channel, visibility evidence reference, Procurement accepted-price evidence reference where applicable, return/refund evidence reference where applicable, order/procurement/export/invoice-bindable state, effective dates, transaction time, and consumer reference.
- PO pricing bindability response with Procurement accepted price evidence reference, PO reference, PO line reference, Procurement source record version, Procurement disposition, applied vs ignored state, external response reference, requested price, accepted price placeholder, accepted price source, accepted price variance, accepted price variance reason, accepted price evidence audit reference, Procurement review state, requote-required state, procurement-bindable status, invoice-bindable status, supersession reference, and review-required state.
- Return/refund adjustment pricing evidence response with original snapshot reference/version, return/refund evidence reference/version, source module reference, source-module disposition, adjustment reason, quantity basis, refund/adjustment price basis, adjustment calculation reference, invoice adjustment reference placeholder, review-required state, supersession reference, and audit reference.
- Pricing profile, rule, commission rule, exception, and override lookup responses.
- Redacted response variants by consumer class.

## Error Models

- `TENANT_SCOPE_REQUIRED`
- `TENANT_SCOPE_UNAUTHORIZED`
- `TENANT_SCOPE_UNRESOLVED`
- `CHANNEL_REQUIRED`
- `CHANNEL_INVALID`
- `CHANNEL_UNAUTHORIZED`
- `PRODUCT_REFERENCE_UNKNOWN`
- `PRODUCT_VISIBILITY_EVIDENCE_MISSING`
- `PRODUCT_VISIBILITY_EVIDENCE_STALE`
- `DEVICE_REFERENCE_UNKNOWN`
- `PRICING_PROFILE_NOT_FOUND`
- `PRICING_RULE_CONFLICT`
- `COMMISSION_RULE_CONFLICT`
- `COMMISSION_BASIS_INVALID`
- `PRICING_SCOPE_CONFLICT`
- `PRICING_TEMPORAL_CONFLICT`
- `PRICING_COMPONENT_CONFLICT`
- `PRICING_EXCEPTION_CONFLICT`
- `PRICING_OVERRIDE_CONFLICT`
- `PRICE_INPUT_STALE`
- `PRICE_INPUT_SUPERSEDED`
- `PRICE_NEGATIVE_INVALID`
- `CURRENCY_FORMAT_INVALID`
- `BLANK_FIELD_BLOCKED`
- `EFFECTIVE_DATE_INVALID`
- `SALE_PRICE_INVALID`
- `MAP_POLICY_CONFLICT`
- `QUOTE_EXPIRED`
- `QUOTE_NOT_ORDER_BINDABLE`
- `QUOTE_NOT_PROCUREMENT_BINDABLE`
- `SNAPSHOT_CREATION_FAILED`
- `SNAPSHOT_NOT_INVOICE_BINDABLE`
- `PO_ACCEPTED_PRICE_EVIDENCE_MISSING`
- `PO_ACCEPTED_PRICE_EVIDENCE_STALE`
- `PO_ACCEPTED_PRICE_EVIDENCE_CONFLICTING`
- `PO_ACCEPTED_PRICE_EVIDENCE_IGNORED`
- `PO_PRICE_VARIANCE_REVIEW_REQUIRED`
- `PO_PRICING_INVOICE_BINDABILITY_BLOCKED`
- `RETURN_REFUND_EVIDENCE_MISSING`
- `RETURN_REFUND_EVIDENCE_STALE`
- `ADJUSTMENT_PRICING_REVIEW_REQUIRED`
- `OUTPUT_REDACTED`

## Authentication / Authorization

- Define authorization for pricing viewers, pricing managers, pricing exception approvers, pricing override approvers, pricing integration consumers, procurement consumers, invoice consumers, return/refund consumers, and audit users.
- All tenant-scoped requests must be authorized against Tenant Company scope.
- Pricing consumes Tenant Company scope signals but must not derive relationship approval, readiness, geography eligibility, user/entity access, channel eligibility, or tenant hierarchy.

## Idempotency Rules

- Calculation requests may be repeatable with correlationId, input hash, source input versions, rule versions, commission rule versions, channel evidence, visibility evidence, and calculation engine version.
- Quote-like result creation should use idempotency keys to avoid duplicate quote-like results for the same consumer request.
- Snapshot creation should use idempotency keys to avoid duplicate snapshots for the same order, PO, export, invoice, or adjustment consumer request.
- PO accepted-price variance review should deduplicate by PO reference, line reference, Procurement accepted price evidence reference, Procurement source record version, quote/snapshot reference, and source version.
- Adjustment pricing evidence should deduplicate by original snapshot reference, return/refund evidence reference/version, source-module disposition, adjustment reason, and quantity basis.
- Profile, commission, exception, and override writes should use version or ETag-style concurrency controls.

## Rate Limits / Throttling

- Define separate limits for validation preview, visibility evidence lookup, PO evidence handoff, adjustment evidence, interactive lookup, order-time calculation, PO-time calculation, quote-like result creation, batch recalculation, snapshot creation, and audit access.
- Protect Pricing from catalog, device, tenant, profile, commission, exception, override, visibility evidence, Procurement evidence, return/refund evidence, and calculation-engine change fanout with asynchronous recalculation where appropriate.

## Pagination Standards

- Profile, rule, commission rule, exception, override, quote-like result, snapshot, visibility evidence, PO pricing, adjustment evidence, and audit listing endpoints should support cursor pagination if listing APIs are added.

## Versioning Strategy

- Version API payloads, pricing channels, commission component names, calculation component names, validation rules, evidence references, and calculation formulas independently from immutable historical snapshots.
- Maintain backward-compatible snapshot reads for order, procurement, invoice, return/refund, and audit consumers.
- Include API version, source input versions, rule versions, commission rule versions, event versions, visibility evidence version, Procurement evidence version, return/refund evidence version, and calculation engine version in audit reconstruction.

## Webhook Dependencies

- Pricing may consume events from Tenant Company, Product Catalog, and Device Catalog.
- Pricing may consume Procurement accepted-price evidence events/references for variance review.
- Pricing may consume Fulfillment/Returns or Invoice Management return/refund evidence references for adjustment pricing evidence.
- Pricing may publish pricing events to Order Routing, Procurement, Invoice Management, Fulfillment/Returns, Analytics, Logs & Audit, and notification-triggering consumers.
- Pricing event payloads should be redacted by consumer class and should prefer authorized lookup for sensitive detail.

## Audit / Logging Requirements

- Log calculation request metadata, input references, source input versions, component summary, rule versions, commission rule versions, exception/override references, pricing channel, visibility evidence references, Procurement evidence references, return/refund evidence references, calculation engine version, actor or service identity, transaction time, effective time, and redaction class.
- Do not log sensitive pricing details into unauthorized observability sinks, retry queues, dead-letter queues, AI prompts, notification payloads, exports, or analytics feeds.

## Example OpenAPI Snippet

```yaml
openapi: 3.0.0
info:
  title: Pricing API
  version: 0.0.0
paths:
  /pricing/calculate:
    post:
      summary: Calculate an ephemeral effective price for an authorized context
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - tenantScopeReference
                - effectiveAt
                - requestedOutputClass
                - channelReference
              properties:
                tenantScopeReference:
                  type: string
                productReference:
                  type: string
                catalogPricingInputReference:
                  type: string
                channelReference:
                  type: string
                channelSelectionEvidenceReference:
                  type: string
                buyerFacingVisibilityEvidenceReference:
                  type: string
                effectiveAt:
                  type: string
                  format: date-time
                requestedOutputClass:
                  type: string
                  enum:
                    - calculation_result
                    - quote_like_result
                    - order_bindable_snapshot
                    - procurement_bindable_snapshot
                    - export_bindable_snapshot
                    - invoice_bindable_evidence
                    - adjustment_pricing_evidence
      responses:
        '200':
          description: Proposal-level calculation result
        '409':
          description: Conflicting or unresolved pricing rules or evidence
  /pricing/po-pricing/evidence-handoffs:
    post:
      summary: Record Procurement accepted-price evidence references for Pricing variance review
      responses:
        '202':
          description: Proposal-level PO evidence handoff accepted for review
  /pricing/adjustment-pricing/evidence:
    post:
      summary: Create proposal-level adjustment pricing evidence from return/refund source evidence
      responses:
        '201':
          description: Proposal-level adjustment pricing evidence result
```

## Open Questions

- Which Pricing APIs are synchronous order-time dependencies versus asynchronous recalculation workflows?
- Which consumers may receive full price component details versus redacted summaries?
- What snapshot contract does Invoice Management require?
- Which output classes should be available through public APIs versus internal APIs only?
- Which PO pricing variance workflows require human review?
- Which visibility evidence must be rechecked before display/export?
- Which adjustment pricing evidence workflows require Invoice Management or Fulfillment/Returns disposition before output?
