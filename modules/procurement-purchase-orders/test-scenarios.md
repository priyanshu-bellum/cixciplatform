# Procurement / Purchase Orders Test Scenarios

These are proposal-level architecture test scenarios. They do not define implementation test automation yet.

## Draft And Validation

1. Buyer user with PO draft permission creates a draft PO.
2. Buyer user without PO draft permission is denied.
3. Accessory PO line references Product Catalog product and Product Type.
4. Device PO line references Device Catalog Device Reference.
5. Branded merchandise PO placeholder requires Product Type enablement.
6. Invalid Product Catalog reference routes PO to review.
7. Invalid Device Reference routes PO to review.
8. Missing or stale price snapshot routes PO to review.

## Targeting

1. Single vendor PO with matching header and line target validates.
2. Single manufacturer PO with matching header and line target validates.
3. Line target that conflicts with header target blocks submission.
4. Mixed vendor/manufacturer PO routes to review or decomposition placeholder.
5. Multi-seller PO without explicit future multi-target marker blocks submission.
6. Future multi-seller PO requires grouping by seller target, submission reference, external PO reference, response lifecycle, and receiving placeholder.

## Approval

1. Buyer submits PO for approval.
2. Buyer approver approves PO with approval policy/version evidence.
3. User without approval permission cannot approve PO.
4. Missing approver authority snapshot routes PO to review.
5. System admin review/override placeholder is auditable and requires override reason.
6. Approval request preserves buyer/entity scope.
7. Expired approval evidence blocks submission or routes to review.

## Pricing Evidence

1. Bindable Pricing snapshot allows approval/submission flow to continue.
2. Missing Pricing snapshot ID blocks submission.
3. Missing Pricing snapshot version/hash routes to review.
4. Expired, stale, superseded, inconsistent, or non-procurement-bindable Pricing evidence blocks submission or routes to review.
5. Accepted price variance creates pricing review-required state without recalculation.

## Submission

1. Approved PO submits to vendor through Integration Management reference.
2. Approved PO submits to manufacturer through Integration Management reference.
3. Manual export creates PO document/export reference.
4. Integration unavailable creates review-required state.
5. Duplicate submission attempt uses idempotency or review placeholder.
6. External PO reference conflict routes to review.
7. External PO reference does not replace internal PO ID.

## Vendor / Manufacturer Responses

1. Vendor accepts accessory PO.
2. Manufacturer accepts device PO.
3. Vendor partially accepts PO lines with accepted/rejected/backordered quantity placeholders.
4. Manufacturer backorders device line.
5. Vendor rejects PO.
6. Response for superseded PO routes to review.
7. Header-level response conflicting with line-level response routes to review.
8. Response with unknown line reference routes to review.
9. Duplicate response with same dedupe key is suppressed or routed according to proposal-level rule.
10. PO status is derived from structured PO/line response state.

## Revision And Cancellation

1. Draft PO is revised before approval.
2. Approved PO is revised before submission.
3. Submitted PO revision creates supersession/reference placeholder.
4. Cancellation before submission is recorded.
5. Cancellation after acceptance routes to review.
6. Revision that changes seller target routes to review.
7. Revision that changes pricing evidence after approval routes to review.

## Receiving And Invoice Boundaries

1. Accepted PO creates receiving placeholder.
2. Receiving placeholder does not execute Fulfillment/Returns behavior.
3. Invoice reference placeholder is preserved without generating invoice.
4. Payment reference placeholder does not process payment.

## Scale Controls

1. PO line count over cap placeholder routes to review.
2. Large PO review threshold creates review-required state.
3. Async PO submission job records status.
4. Document/export throttling prevents uncontrolled bulk exports.
5. Bulk status lookup uses pagination placeholder.
6. Response retry budget exhaustion routes to review.
7. Revision/supersession limit placeholder routes excessive revisions to review.

## Boundary Tests

1. Procurement cannot create normal customer routed suborders.
2. Procurement cannot recalculate price.
3. Procurement cannot reinterpret price conflicts.
4. Procurement cannot mutate Product Catalog product records.
5. Procurement cannot mutate Device Catalog canonical records.
6. Procurement cannot grant tenant permissions or eligibility.
7. Procurement cannot execute fulfillment or returns.
8. Procurement cannot generate/finalize invoices.
9. Procurement cannot process payments.
10. Procurement cannot own integration credentials, external ID mapping authority, delivery evidence, or receipt evidence.
11. Procurement cannot own Logs & Audit evidence records.
12. Procurement cannot own Analytics metrics or AI recommendations.

## Notification / Analytics / AI

1. PO approval requested emits notification hook event.
2. PO accepted emits analytics-consumable signal.
3. AI recommendation reference can be attached to a draft PO.
4. AI cannot submit or approve PO without approved action contract and human/role approval.