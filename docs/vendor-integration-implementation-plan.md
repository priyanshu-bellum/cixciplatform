# Vendor integration implementation and regional UI review

## Authority and delivery order

Latest user instruction: work on one task at a time, verify it thoroughly, and
do not push until the user explicitly requests a push after reviewing results.
The user approved pushing the verified regional UI correction, then explicitly
prioritized the complete Vendor API integration flow. Commission-guide changes
are queued after Vendor integration. Supplier export/routing/shipping requirements
remain part of the documented supplier flow and its staged rollout. Read-only
investigation is not implementation.
Use regression-first tests for each next change and keep each result reviewable.

Compatibility/dropdown work is pushed in `53b655e` and `77e5e1a`. Continue with
the supplied accessory Vendor requirements (VEN-01–DEL-02), existing platform
module ownership and the regional visibility document. Do not change financial
policy or infer supplier identity from a SKU. Source catalog data is not modified
by investigation. All schema/backfill changes require migrations and tests.

## Regional page correction

The regional document requires Vendor commercial coverage, separately configured
fees, distribution-center review, recalculation and audit. It does not prescribe
an always-expanded country-registration form or a list of every Buyer above the
Vendor table. Those were implementation choices and crowded the existing page.

Keep the existing coverage/fees/DC/events tabs and their normal actions visible.
Move country administration and read-only Buyer country diagnostics into an
Admin-only, on-demand dialog. Buyer country continues to resolve through
onboarding; this layout correction adds no per-Buyer assignment requirement.
Do not alter regional gating, approve relationships, guess fees/currency or break
Telco's current four-product projection. Verify desktop/mobile layout and both
diagnostic and coverage actions through browser checks.

## Supplier connection and catalog ingestion

Latest user-confirmed sync cadence: initial import persists Vendor products in
PostgreSQL; the catalog/UI/Buyer API reads CIXCI's database. Provide weekly
automatic full resynchronization plus an audited manual Sync Now action. Show
last/next run, job status and imported/updated/review/error counts. High-frequency
polling is not enabled by default. Provider incremental semantics are supported
only where explicitly configured; they do not replace the weekly full refresh.

1. Verify Balaji's actual read-only catalog contract using the supplied test key.
   Fetch only authorized data; redact credentials and keep private evidence out
   of Git. No real orders, emails or webhooks are sent during validation.
2. Vendor Company precedes its connection. Add reusable Brands and confirmed
   Owned/Authorized Distributor relationships; preserve vendor-owned Product IDs
   and existing display text. Never backfill ownership from brand text alone.
3. Configure each Vendor's HTTPS endpoint, supported auth, declarative mappings,
   pagination, schedule and limits. Credentials are write-only/encrypted; the user
   approved pinning the existing cryptography library on 2026-11-12. No executable
   mapping expressions or unrestricted URL traversal are allowed.
4. Run idempotent, bounded catalog sync with Vendor-scoped remote identity,
   checkpoints, per-page transactions, single-run locking, retries and redacted
   audit. Preserve unrecognized source values for review. Reuse Product and
   compatibility validation; absent category/model/feature/media declarations
   must not be invented or made Buyer-visible.
5. Balaji's public contract says cursor pages can be short or empty while still
   having `next_cursor`; stop only at null. Commit `next_updated_since` only after
   the final successful page. Incremental feeds overlap 30 minutes, omit some
   price/removal changes, and require a weekly full refresh. Its documented row
   and request limits must be respected. Missing rows during an incomplete poll
   are not proof that products should be deleted.

## Export, routing and shipping

Persist stable Buyer Entity/integration export selections and supplier identity.
Resolve accepted order lines from those selections, with actionable scoped
errors and version retention. Preserve historical supplier/pricing through
retries and returns. Legacy transition is allowed only for one authoritative,
authorized export selection; never route by first SKU/UPC match.

Record packages by line quantities, hold all Buyer shipment updates until the
parent order is complete, and release one idempotent consolidated update. Show
pending quantities to Operations. Stage schema/export transition before enabling
new routing and overlapping supplier offers (DEL-02).

## Commission review and unsettled decisions

The user supplied `docs/CIXCI_Buyer_Pricing_Mode_Developer_Guide_v1.0.docx` as
the authoritative commission guide. Read it before modifying calculation,
rounding, mode precedence or commission UI behavior, and trace findings/tests
to its sections.

Inspect the existing Buyer standard/custom/no-commission calculation, approved
Vendor agreements, profiles and immutable snapshots. Add missing management UI
around existing policy. Do not infer profile/agreement precedence or change rates
because another data model happens to expose similar fields.

The region document explicitly leaves cross-border currency and fee granularity
unsettled. Preserve those boundaries, and report any unresolved execution policy
before changing commercial behavior.

## Verification and handoff

Test cross-company/entity access, same SKU/UPC at different Vendors, invalid
credentials, pagination loops, empty intermediate pages, duplicate runs, partial
page failure, rate limits, checkpoints, supplier changes/late orders, mixed-brand
packages, partial/canceled quantities, duplicate confirmations and retries. Run
the existing compatibility/Telco checks, record actual results and exceptions,
and document migrations, configuration, API contracts and rollout gates.
