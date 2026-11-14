# Vendor catalog synchronization contract

## Entry, ownership and authorization

Start from Settings → Company Profile → saved Integration Mode = API. The Vendor
Company must exist first. Its fixed company ID owns connection, credentials,
source records and Product offers; a payload cannot transfer that ownership.
System Admins configure connections and brand relationships through existing
capability checks. Vendors may read only their own permitted status. Buyers do
not receive Vendor secrets, source payloads or internal synchronization records.
Switching the saved mode to Manual blocks subsequent catalog polling; it does
not remove historical catalog or transaction evidence.

## Storage and sync cadence

Initial and manual syncs fetch Vendor data into PostgreSQL. Existing catalog/UI/
Buyer APIs continue to use CIXCI data and eligibility. Weekly full sync is opt-in
per configured connection, with last/next run and audit. Sync Now creates a queued
job; it does not run a large remote import inside the HTTP request. One active
run per connection, bounded pages, retry state and expired-worker recovery are
required. Unknown rows remain durable review evidence rather than guessed active
products. A completed full run may mark a source offer absent without destroying
its Product/history; an incomplete run cannot imply removal.

Approved edge-case policy: if a new feed row for an already approved offer is
invalid, preserve the last saved canonical Product data and historical
transactions, but hold that offer from future Buyer catalog/export until an
authorized Admin review resolves it. The hold is offer-scoped, never Vendor-wide
and never applied by deleting prior snapshots.

## Declarative connector surface

Support HTTPS JSON catalog APIs using Bearer token, API-key header, Basic auth
or explicitly unauthenticated reads. Paths and approved scalar conversions map
source values to existing Product inputs; arbitrary code and mapping expressions
are forbidden. Cursor/page/offset pagination must use configured provider end
signals, not assumptions about a short page. Response bytes, rows, pages and
requests are bounded. Unsupported provider protocols require an adapter/review;
this console does not claim every future API protocol works without code.

TLS hostname validation, public-address validation, pinned destination addresses,
no redirects, fixed-host paths and bounded response/time limits protect credential
transport. Credentials are encrypted with the separately configured Fernet key
ring and never returned through reads, audit summaries, logs or source payloads.
The user approved pinning the existing cryptography dependency. No secret is
derived from a public field or stored in the Company's metadata JSON.

## Catalog and review

Use canonical Product validation/compatibility commands. Vendor + remote identity
and supplier-scoped SKU prevent cross-Vendor collisions. Retain feed brand text;
canonical Brand/Owned/Authorized Distributor associations are Admin-governed.
Do not assign a brand to its distributor's company name. Preserve Product IDs,
source provenance, exclusions and completed exports. Do not calculate Buyer
commission in this importer; it supplies Vendor price inputs to Pricing.

Balaji GET `/api/v1/catalog` was verified read-only with the supplied test key:
HTTP 200, two rows in a limit=3 response with a non-null next cursor. The source
has `unit_price_cents`, currency, stock, image URLs and `device`; it does not supply
the required canonical category or MSRP. A bare `Universal` declaration supplies
no type scope and must remain review-required. Do not infer category, MSRP,
Bluetooth or scope from a title/SKU. Source images remain review evidence until
the existing media workflow approves canonical assets.

Public provider contract:
[Balaji Customer API](https://www.balajiwireless.com/integrations/api).
It documents 120 requests/minute, key request limits, 50,000 catalog rows/day per
account (Pacific time), empty/short cursor pages, 30-minute incremental overlap,
and a weekly full refresh for price/removal changes. Honor Retry-After and retain
the current cursor on failure; publish a new watermark only after the final
successful page. The configured Vendor/origin budget coordinates its connections.

## Verification and release

The real queue check found Celery 5.4.0/Kombu 5.7.0 with redis-py 5.0.8 in the
existing image. Kombu refuses that client and requires redis-py >=6.1.0. Update
the already-declared Redis dependency to 6.4.0 and verify cache/queue behavior;
this is not a new package. Its upstream release is
[redis-py 6.4.0](https://github.com/redis/redis-py/releases/tag/v6.4.0).
The corrected main local image now publishes successfully. A dedicated worker
consuming only vendor_catalog completed a real queued 97-row saved-data recheck.
The general worker and Beat stay disabled against the restored production copy.
Production still needs explicit key-ring, worker and scheduler configuration.

Regression tests precede implementation for ownership, encrypted/redacted
credentials, mode changes, short/empty pages, loops, retries, partial failures,
daily budgets, idempotent upserts, missing declarations and source removals.
Then add the Company Profile UI and test the complete manual/weekly flow with
private authorized API evidence. No real Vendor orders, external messages or
production deployment are part of read-only catalog verification. The user will
review this feature's results before separately authorizing its push.
