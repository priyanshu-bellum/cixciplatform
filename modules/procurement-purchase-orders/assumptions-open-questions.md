# Procurement / Purchase Orders Assumptions And Open Questions

This document is proposal-level architecture. It lists assumptions and decisions still needed before implementation.

## Assumptions

- Procurement / Purchase Orders is a distinct bounded context per ADR-0017.
- Procurement owns buyer bulk purchase workflows, not normal customer order routing.
- Order Routing owns normal customer order routing and routed suborders.
- Tenant Company owns roles, permissions, company/entity scope, buyer/vendor/manufacturer eligibility, activation/readiness, Product Type enablement, and licensed-property scope.
- Pricing owns quote-like results, price snapshots, pricing exceptions, commercial interpretation, and pricing calculations.
- Product Catalog owns accessory/branded product records and Product Type validation.
- Device Catalog owns canonical Device References and device source records.
- Integration Management owns connection state, credential references, delivery evidence, receipt evidence, external ID mapping, and external action references.
- Logs & Audit owns audit evidence and file tracking.
- Notification Platform Service owns delivery.
- Analytics owns reporting models and metrics.
- AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes.
- Receiving, invoice eligibility, and payment behavior remain proposal-level.
- Default PO target model is one seller target per PO unless future rules explicitly model multi-seller POs.

## Scale Controls Placeholder

Future hardening should define proposal-level assumptions and controls for:

- POs per buyer parent.
- POs per buyer child entity.
- PO lines per PO.
- PO line count caps/placeholders.
- Large PO review threshold.
- Approval steps per PO.
- Approval queue priority.
- Approval queue SLA placeholder.
- Vendor/manufacturer responses per PO.
- Response retry budgets.
- Response dedupe keys.
- Revisions per PO.
- Revision/supersession limits.
- PO document/export volume.
- Document/export throttling.
- Document retention placeholders.
- Manual submission volume.
- Integration submission volume.
- Async PO submission jobs.
- Backorder volume.
- Backorder volume controls.
- Receiving placeholder volume.
- PO events per status transition.
- Tenant/seller partitioning.
- Bulk status pagination.
- Lookup latency for PO status and line search.

## Open Questions

- Are accessory and device POs handled in the same PO object or separate PO types?
- Can one PO include both accessories and devices?
- Can one PO include multiple vendors/manufacturers, or must each PO target one seller?
- If multi-seller POs are supported later, should Procurement decompose them into seller-specific child POs or grouped submission records?
- Who can approve buyer POs?
- Are approval thresholds based on dollar amount, quantity, buyer entity, Product Type, seller target, or risk flag?
- What approval policy/version evidence is required before submission?
- What lifecycle event makes a PO invoice-eligible?
- Does PO receiving belong in Procurement or Fulfillment/Returns?
- What integration methods are supported at launch for vendor/manufacturer PO submission?
- Should vendors/manufacturers accept/reject PO lines individually?
- How are header-level and line-level responses reconciled?
- How are backorders handled?
- How are PO revisions and cancellations handled after submission?
- Can AI draft POs, and what approval is required before submission?
- What audit/file tracking is required for PO exports/imports?
- What data should Analytics expose about procurement demand?
- Which PO statuses are buyer-visible, vendor-visible, manufacturer-visible, and internal-only?
- What evidence makes a price snapshot procurement-bindable?
- Are accepted prices allowed to differ from requested prices?
- How are external PO references mapped and de-duplicated?
- Should PO documents be immutable once submitted?
- What retention applies to PO documents, exports, responses, and revisions?

## Decisions Needed Before Implementation

- PO type model and target model.
- Header-level versus line-level response model.
- Status transition rules and terminal states.
- Approval thresholds and permission matrix.
- Approval evidence contract.
- Product Type-aware validation rules.
- Pricing snapshot / quote-like evidence contract.
- Accepted price variance review behavior.
- Integration submission contract and external PO mapping behavior.
- Revision, cancellation, and supersession rules.
- Receiving ownership and downstream fulfillment/receiving handoff.
- Invoice eligibility and payment reference behavior.
- Logs & Audit evidence requirements.
- Notification trigger requirements.
- Analytics signal contract.
- AI action contract and approval requirements.
- Scale controls for high-volume lines, approvals, submissions, responses, backorders, exports, and lookups.

## Non-Goals For First Draft

- Do not define final PO implementation schema.
- Do not finalize receiving ownership.
- Do not finalize payment processing.
- Do not define Vendor Operational Interface, Payment, Launch/Event Management, or Licensing modules.
- Do not move source-module operational ownership into Procurement.