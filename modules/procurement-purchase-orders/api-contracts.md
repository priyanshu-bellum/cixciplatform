# Procurement / Purchase Orders API Contracts

This document is proposal-level architecture. It defines domain API contract concepts without finalizing endpoint design, authentication implementation, lifecycle transition rules, integration behavior, or schema.

## API Principles

- APIs must enforce Tenant Company scope, roles, permissions, activation/readiness, buyer/vendor/manufacturer eligibility, Product Type enablement, and licensed-property scope where applicable.
- Procurement APIs expose PO workflow records and references only.
- Procurement must not expose APIs that create normal customer routed suborders, recalculate pricing, process payments, execute fulfillment, mutate product/device source records, or manage integration credentials.
- Pricing snapshot / quote-like references must be preserved rather than recalculated.
- Stale, missing, expired, superseded, inconsistent, or non-procurement-bindable Pricing evidence should block submission or route to review.
- Vendor/manufacturer submission APIs should create Procurement-owned submission references while Integration Management owns delivery evidence, receipt evidence, external ID mapping, and connection state.
- Default target model is one seller target per PO unless future rules explicitly support multi-seller POs.

## PO Draft APIs

Proposal-level APIs:

- Create purchase order draft.
- Add/update/remove PO line.
- Set header seller target reference.
- Set line seller target reference.
- Validate target cardinality.
- Set shipping destination / receiving location placeholder.
- Set requested delivery date placeholder.
- Attach media reference placeholder where relevant.
- Validate PO draft.
- Submit PO for approval.

Draft validation should block submission when header and line targets conflict, target cardinality is ambiguous, or mixed vendor/manufacturer targets require decomposition.

## Approval APIs

Proposal-level APIs:

- Request approval.
- Approve PO.
- Reject PO.
- Return PO for changes placeholder.
- Escalate approval placeholder.
- Record override placeholder where allowed.
- Get approval history.
- Review/override PO where allowed.

Approval APIs consume Tenant Company roles, permissions, buyer/entity scope, and eligibility. They do not define tenant eligibility.

Approval request/response shapes should support approval policy reference/version, threshold basis, approver authority snapshot, approver role/entity scope, approval chain, escalation chain, override flag/reason, rejection reason, approval expiration placeholder, and audit reference.

## Pricing Evidence APIs

Proposal-level APIs:

- Validate Pricing snapshot / quote-like result bindability.
- Get PO pricing evidence review state.
- Request requote placeholder through Pricing-owned workflow where future contracts allow.
- Record accepted price variance placeholder.

Procurement must not recalculate or reinterpret price conflicts.

## Submission APIs

Proposal-level APIs:

- Submit approved PO to vendor/manufacturer.
- Generate PO document/export reference.
- Get submission status.
- Retry submission placeholder.
- Record manual submission placeholder.
- Link external PO reference.
- Validate external PO reference conflict placeholder.

Submission APIs may call Integration Management contracts, but Integration Management owns external connection state, credentials, delivery evidence, receipt evidence, webhook/API transmission records, external ID mapping, and external action references.

## Vendor / Manufacturer Response APIs

Proposal-level APIs:

- Record vendor/manufacturer response.
- Record PO-level response.
- Record line-level response.
- Mark PO accepted.
- Mark PO rejected.
- Mark PO partially accepted.
- Mark PO backordered.
- Request review for response conflict.
- Lookup response aggregation state.

Response contracts should support accepted quantity, rejected quantity, backordered quantity, partially accepted quantity, unknown line reference behavior, response conflict state, response dedupe key, response source reference, and response timestamp.

Vendors/manufacturers may respond to submitted POs where integration/onboarding allows. Exact response authority remains unresolved.

## Revision And Cancellation APIs

Proposal-level APIs:

- Create PO revision.
- Supersede PO.
- Cancel PO.
- Close PO.
- Get revision history.
- Get supersession chain.

Revision and cancellation behavior after submission remains proposal-level. Revisions that change seller target, Product Type mix, quantity, price evidence, or receiving location should route to review where policy is unclear.

## Receiving Placeholder APIs

Proposal-level APIs:

- Create receiving placeholder.
- Update receiving placeholder.
- Link downstream fulfillment/receiving signal placeholder.
- Link invoice eligibility placeholder.

These APIs do not finalize receiving ownership and must not execute Fulfillment/Returns behavior.

## Lookup APIs

Proposal-level APIs:

- Get PO by id.
- List POs by buyer/entity scope.
- List POs by vendor/manufacturer target reference.
- List POs by status.
- List POs by Product Type.
- List PO exceptions/review states.
- Get PO events/history.
- Bulk status lookup with pagination placeholder.

## Error And Review States

Proposal-level errors:

- Invalid buyer/entity scope.
- Missing Tenant Company eligibility/scope.
- Buyer user lacks draft permission.
- Buyer approver lacks approval permission.
- Approval evidence missing, stale, expired, or insufficient.
- Vendor/manufacturer target not eligible.
- Header/line target conflict.
- Ambiguous target cardinality.
- Product Type not enabled.
- Product Catalog product reference invalid or not PO-eligible.
- Device Catalog Device Reference invalid or not PO-eligible.
- Pricing snapshot / quote-like reference missing, stale, expired, superseded, inconsistent, or not procurement-bindable.
- Accepted price variance requires review.
- Requested quantity invalid.
- Submission integration unavailable.
- External PO reference conflict.
- Vendor/manufacturer response conflict.
- Unknown line reference in vendor/manufacturer response.
- Revision/cancellation not allowed for current status.
- Receiving ownership unresolved / review required.

## Idempotency, Scale, And Audit

Create, approve, submit, cancel, revise, and response APIs should use idempotency keys where appropriate. Response intake should use response dedupe keys where available. Large PO operations may require async submission jobs, document/export throttling, bulk status pagination, tenant/seller partitioning, and retry budgets. PO workflow actions should be auditable. Logs & Audit owns audit evidence and file tracking; Procurement owns PO workflow state.