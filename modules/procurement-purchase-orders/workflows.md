# Procurement / Purchase Orders Workflows

This document is proposal-level architecture. It defines initial procurement workflows without finalizing approval thresholds, lifecycle transitions, integration behavior, receiving ownership, invoice eligibility, or payment behavior.

## PO Draft Workflow

1. Buyer user with permission creates a PO draft.
2. Procurement consumes buyer parent/entity scope from Tenant Company.
3. Buyer user adds accessory, device, or future branded merchandise PO lines.
4. Procurement validates Product Type and target type using consumed scope signals.
5. Procurement preserves Product Catalog product references or Device Catalog Device References.
6. Procurement preserves Pricing quote-like result / price snapshot references and requested quantity.
7. Procurement validates target cardinality.
8. Procurement stores draft state and audit references.

Procurement must not recalculate price or create routed suborders.

## Target Validation Workflow

Proposal-level rules:

1. Default model is one seller target per PO.
2. Header seller target may be an accessory vendor or device manufacturer.
3. Line-level seller targets must match the PO header target unless the PO is explicitly marked as a future multi-target PO.
4. Mixed vendor/manufacturer targets route to review or require decomposition.
5. Ambiguous target cardinality blocks submission.
6. If multi-seller POs are later supported, lines must be grouped by seller target, submission reference, external PO reference, response lifecycle, and receiving placeholder.

Multi-seller PO behavior remains future/open unless explicitly modeled.

## PO Approval Workflow

1. Buyer user submits PO for approval.
2. Procurement validates approver permissions from Tenant Company.
3. Procurement records approval request, approval evidence, and status.
4. Buyer approver approves, rejects, escalates, or returns for review placeholder.
5. Procurement emits approval events.

Approval thresholds and chains remain unresolved. Approval evidence should include approval policy reference/version, threshold basis, approver authority snapshot, approver role/entity scope, approval chain, escalation chain, override flag/reason, rejection reason, expiration placeholder, and audit reference.

## Pricing Evidence Workflow

1. Procurement consumes Pricing snapshot or quote-like result references.
2. Procurement checks proposal-level bindability status, version/hash, expiration timestamp, supersession status, and stale snapshot behavior.
3. Missing, stale, expired, superseded, inconsistent, or non-procurement-bindable pricing evidence blocks submission or routes to review.
4. Vendor/manufacturer accepted price differences are stored as accepted price source, variance, and variance reason placeholders.
5. Pricing owns price interpretation, calculations, exceptions, and requote behavior.

Procurement must not recalculate or reinterpret price conflicts.

## PO Submission Workflow

1. Approved PO is submitted to a vendor or manufacturer target.
2. Procurement creates submission reference and PO document/export reference where applicable.
3. Integration Management handles API, webhook, CSV export, manual download/upload, SFTP placeholder, or future connector delivery.
4. Procurement records submission status and external PO reference where available.
5. Logs & Audit tracks audit/file evidence.

Procurement owns PO lifecycle. Integration Management owns connection state, external ID mapping, delivery evidence, and receipt evidence.

## Vendor / Manufacturer Response Workflow

1. Vendor/manufacturer response is received through an integration or manual process.
2. Procurement records response reference, response source reference, response timestamp, response dedupe key, and response status.
3. Response may apply at PO header or line level, proposal-level.
4. Line-level responses should capture accepted quantity, rejected quantity, backordered quantity, partially accepted quantity, unknown line references, and conflict state.
5. Header/line response precedence remains proposal-level but must be explicit when applied.
6. Conflicting header and line responses route to review.
7. PO status should be derived from structured PO/line response state.
8. Procurement transitions PO to Accepted, Rejected, Partially Accepted, Backordered, Review Required, or another proposal-level state.
9. Procurement emits response events.

Line-level accept/reject/backorder behavior remains unresolved, but response aggregation must be represented explicitly.

## Revision / Supersession Workflow

1. Buyer user or system admin requests a revision where policy allows.
2. Procurement creates revision record with original PO reference.
3. Revised PO may supersede prior PO.
4. Procurement preserves supersession reference and audit reference.
5. If already submitted, vendor/manufacturer cancellation or revision response behavior remains unresolved.

Revision changes to seller target, Product Type mix, price evidence, quantity, or receiving location should route to review where policy is unclear.

## Cancellation Workflow

1. Authorized actor requests cancellation.
2. Procurement checks current PO status and cancellation eligibility placeholder.
3. Procurement records cancellation or review-required state.
4. If submitted externally, Integration Management may be used for cancellation communication where supported.
5. Procurement emits cancellation event.

## Receiving Placeholder Workflow

1. PO reaches an accepted or partially accepted state.
2. Procurement may create receiving placeholder with expected receiving location/date/quantity placeholders.
3. Future receiving may remain in Procurement or be assigned to Fulfillment/Returns.
4. Procurement must not execute fulfillment, shipment, return, replacement, or operational receiving unless future ADR/module assigns it.

## Invoice / Payment Reference Workflow

1. PO accepted/received/completed reference may become invoice-eligible in the future.
2. Invoice Management may consume PO references where applicable.
3. Procurement may store invoice/payment reference placeholders.
4. Procurement does not own invoice lifecycle or process payments.

## AI Recommendation Workflow

1. AI Agent Services may recommend bulk purchase opportunities or draft PO suggestions.
2. Procurement may reference AI recommendation ids.
3. Buyer user/approver must take approved actions according to permissions.
4. AI must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Notification Workflow

Procurement emits events that may trigger notifications such as approval required, submitted, response received, rejected, accepted, backordered, or review required. Notification Platform Service owns delivery.

## Exception / Review Workflow

Review states may be created for:

- Missing or invalid Tenant Company scope.
- Missing buyer permission or approver permission.
- Missing or stale approval evidence.
- Vendor/manufacturer target ineligible.
- Header/line target conflict.
- Ambiguous target cardinality.
- Product Type not enabled.
- Invalid Product Catalog or Device Catalog reference.
- Missing/stale/expired/superseded price snapshot.
- Accepted price variance requiring Pricing review.
- Submission integration unavailable.
- External PO reference conflict.
- Vendor/manufacturer response conflict.
- Unknown line reference in response.
- Revision/cancellation conflict.
- Receiving ownership unresolved.

Procurement owns PO exception/review state. Source modules own their source records and decisions.