# Onboarding, Universal mapping and supplier integration plan

## Required execution order

The user requested: finish and test existing work, push that reviewed result,
then begin Vendor API integration. Phase 2 implementation must not be mixed into
the Phase 1 commit. Production deployment is not implied by a Git push.

## Phase 1: complete compatibility and onboarding

1. Keep the verified opaque sticky-header fix and the documented UI regressions.
2. Replace manual per-Buyer region assignment with resolution from the country
   captured during Company/HQ onboarding and each Entity's own country. Country
   codes normalize to a controlled identity; state/DC/customer addresses do not
   grant visibility. Independent entities retain independent countries.
3. Register/resolve canonical country region identities automatically. This does
   not approve Vendor coverage, a shipping fee or a Buyer/Vendor relationship.
   Unknown/blank countries require source onboarding correction rather than a
   guessed country or a manual per-Buyer region assignment.
4. Audited migration backfills existing country-derived references without
   changing parent/child country values, source products or historical exports.
5. Universal document in `bugs/` is authoritative. BAS-214-MO currently has
   Feature Based Speakers category, Bluetooth No, and no Universal declaration;
   its 81 historical assertions are retained. User explicitly confirmed Speakers
   should use Universal, and BAS should declare Phone + Tablet + Smartwatch.
   Apply that approved configuration/declaration through an audited migration;
   do not change Bluetooth No into Yes or add a special case to the engine.
6. Other Speakers without a declared Universal scope require Admin review.
   They must not acquire an invented scope. Exclusions, locks, eligibility and
   completed exports remain authoritative.
7. Check single-product modal, CSV and API use the same controlled type scope.
   Test all three types, reverse mapping/new models, retirement, exclusions,
   future devices, and actual BAS global mappings. Buyer portfolio and normal
   catalog/export eligibility still apply.
8. Rerun targeted regressions, frontend build/browser checks, local Telco API and
   images. Document results, inspect the staged diff for secrets/private dumps,
   commit and push Phase 1 only. Preserve user-provided documents separately.

## Phase 2: supplier onboarding and multi-Vendor API console

Source: `docs/CIXCI_Accessory_Vendor_Configuration_and_Supplier_Routing_Requirements.docx`
(VEN-01 through DEL-02). The requirement covers supplier ownership/routing and
shipping completeness, not merely an API-key form.

1. Inspect the actual Balaji API contract and run authorized read-only test
   requests with the supplied test credential. Never write it into source,
   fixtures, documentation, logs, audit payloads or Git history.
2. Onboard the Accessory Vendor company first. Its API connections, products,
   inventory, prices, returns and warehouse configuration remain company-owned.
   Multiple reusable Brands link through Owned/Authorized Distributor
   relationships; a Brand association does not create another Vendor account.
3. Build Admin management for each Vendor's connection, endpoint/auth settings,
   declarative field/category mappings, pagination and synchronization schedule.
   Supported mapping operations are controlled; no arbitrary code execution.
   Different Vendors can have different endpoints, auth and field layouts.
4. Reuse shared Product/compatibility validation and Vendor-scoped offer identity.
   Same SKU/UPC from different suppliers must not overwrite or block another
   supplier's offer. Unsupported/missing compatibility declarations go to review,
   never guessed from a product title.
5. Implement bounded polling, checkpoints, cursor/page validation, retries and
   rate limits, timeouts, deduplication, concurrency locks, resumable runs and
   redacted audit summaries. A partial import cannot advance its checkpoint past
   failed pages. Missing products must not be deleted solely because a poll was
   incomplete. Provider contract and platform docs determine supported changes.
6. Persist stable Buyer export selection references with entity/integration,
   Product and supplier. Order lines resolve those references; raw SKU/UPC is
   not a supplier-routing decision. Reject ambiguous/unauthorized references
   with stable error codes; preserve the selected supplier through retries,
   fulfillment, tracking and returns. Honor the documented legacy transition.
7. Record shipments by order line/quantity. Hold Buyer-facing updates until the
   entire parent order has complete shipping information, except quantities
   canceled through the existing cancellation workflow. Release one consolidated
   logical update idempotently; show pending quantities to Operations.
8. Audit existing commission profiles, Buyer pricing modes and Vendor agreements.
   Identify actual precedence, effective dates, snapshot use and UI gaps before
   changing calculations. Do not infer a new commission or shipping policy.
9. Use migrations and tests for new models and backfills. Test cross-Vendor
   collisions, cross-entity references, revoked credentials, malformed payloads,
   changed pagination, duplicate/concurrent polls, 429/5xx, partial shipments,
   late supplier changes and immutable transaction history.

## Review boundaries

The region document still leaves cross-border currency and charge granularity
open. The existing global region enforcement release hold remains until actual
coverage/relationship/fee configuration and commercial-flow readiness are
reviewed. No test credential authorizes placing a real Vendor order or sending
messages to external parties. Provider-specific capabilities beyond the supported
declarative contract must be reported explicitly rather than claiming arbitrary
future APIs require no adapter work.
