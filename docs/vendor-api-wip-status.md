# Vendor API implementation status

Updated: 12 November 2026. Local implementation only; Vendor changes are not
committed, pushed or deployed. The independently released compatibility,
Company Profile and wireless fixes remain at a049749.

## Workspace and entry point

All active code is in E:\cixci. The temporary Vendor worktree was consolidated
after a private backup and SHA-256 comparison, then removed at the user's request.
Older isolated proof containers and reports are historical evidence, not the
active application. Local application URLs are backend 8000 and frontend 5173.

API management is now a dedicated Admin page:
/settings/vendor-integrations or /settings/vendor-integrations/<vendor-id>.
Open it from Integration > Vendor Catalog APIs, or a Vendor's saved Company
Profile > Manage API Catalog. See [the setup guide](vendor-api-management-guide.md).

Generic REST/JSON is the default for new connections. Balaji is an optional
template. Visual field/category mapping, authentication, pagination and request
budgets configure supported future suppliers without a new supplier-specific
screen. Unsupported protocols or transformations still need an adapter/review.

## Verified local behavior

- Company-owned encrypted connections, reusable Brands and explicit Vendor/Brand
  approvals; Vendor/Buyer isolation and supplier-scoped offer identities.
- Initial/manual/weekly task flow, cancellation, stale-configuration protection,
  bounded requests, retries, cursor handling and durable source review.
- Invalid source updates preserve the last canonical Product and hold only the
  affected future Buyer offer. Completed transactions/exports remain unchanged.
- Config changes revalidate unchanged payloads. Conflicting remote identities,
  supplier SKUs, approved category mappings and compatibility inputs require
  review. Source observation audits retain minimized before/after evidence.
- A real read-only provider test returned HTTP 200. One bounded real page stored
  97 source rows, all requiring review; zero canonical Products were created.
  Missing required launch date/MSRP/category/scope/media facts are not inferred.
- Dedicated local vendor_catalog worker processed a queued saved-row recheck
  successfully. General workers/Beat remain disabled against the copied data.

Local migrations applied: catalog 0034/0035, integration 0003/0004. Migration 0004
records the applied connection version; existing unknown versions remain null
and are revalidated rather than receiving a fabricated backfill.

Verification for the current source:

| Check | Result |
| --- | --- |
| Combined backend suite, SQLite | 518 passed |
| Combined backend suite, PostgreSQL | 518 passed |
| Existing built client regression | 62 checks passed |
| CSV preview checks | 2 passed |
| Dedicated generic page editor, Guide and retirement | 14 checks passed |
| Built page with Guide, real provider and worker progress | 11 checks passed |
| Telco existing Buyer catalog and PNG images | 4 products; all images HTTP 200 |

The eight added provider-contract cases cover cursor/page/offset/single-response
syncs, visible saved source facts/history, and matching probe pagination. The
dedicated worker also completed a real 97-row background recheck while the built
page refreshed its open source view automatically, without a reload.

Private reports are under .local-copy/compatibility-analysis/. They contain
local QA evidence and must not be committed. Browser checks cover page entry,
generic defaults, visual/JSON mapping synchronization, malformed configuration
recovery, real API persistence, narrow viewport fit and uncaught UI exceptions.
The question-mark Guide explains sample JSON, row-relative paths, conversions,
pagination and review. Saved connections and new-connection presets have
different labels. Empty old page-editor QA records were explicitly retired;
future editor checks retire their own records. Retired connections are hidden
by default, with an explicit Show retired control preserving access to history.

## Deployment prerequisites

The image includes the explicitly approved cryptography pin and compatible Redis
client. Each deployment needs its own persistent private encryption key ring,
schema migration, vendor_catalog worker and deliberate scheduler setup. Losing
the key ring makes saved credentials unreadable. Credentials are write-only and
must never be placed in Company metadata, tracked environment files or reports.
QA weekly schedules are disabled; no production polling has been enabled.

## Remaining platform milestones

Successful ingestion does not complete the whole Supplier Routing requirements:

1. EXP-01/02/03: stable Buyer Entity + integration/storefront export selections,
   supplier/Product identifiers and versioned listing mappings.
2. ORD-01/02/03: replace legacy first-match SKU/UPC and first-Entity order
   resolution; atomically accept authorized mapping references and retain the
   accepted supplier, Product and pricing through retries/returns.
3. SHP-01/02/03/04/05: package line quantities, parent completeness and one
   consolidated outbound Buyer update, with Operations pending-detail UI.
4. Historical mapping migration: backfill only authoritative, unambiguous
   evidence; do not edit completed export snapshots or guess supplier ownership.
5. Buyer Pricing Mode guide: effective approved rules, immutable pricing evidence
   and commission management remain a separate implementation/review milestone.

Company-wise API keys remain company-wise; authorized Buyer Entity selection is
still required. The recommended storefront boundary is Company > Buyer Entity >
integration/storefront > export mapping. No storefront is inferred from a key
label or a first user/Entity. Overlapping supplier offers must not be released to
Buyer integrations before the incoming-order mapping contract is ready.

## Latest catalog/fulfillment review

A subsequent sync now has 1,791 source rows and zero linked Products; the 97-row
figure above describes the earlier bounded proof. An Admin-only Product Catalog
API Import Review tab now exposes saved facts and creation blockers, with cursor
paging and links to the exact supplier setup. Verification: 71 focused tests per
database, 18 built import-flow browser checks, 62 existing UI checks and two CSV
checks. Product publication requirements and tenant boundaries are preserved.

Balaji's public docs were refreshed successfully. Orders, shipments and ship-to
reads returned HTTP 200/empty using the authorized test key; no remote write was
made. Provider order submission, signed event reconciliation, supplier-aware
exports/routing and consolidated fulfillment are still unfinished. Delivery ETA
and per-package line quantities need an authoritative contract. Continue from
[the end-to-end plan](balaji-end-to-end-integration-plan.md) and
[catalog diagnosis](vendor-catalog-import-visibility.md); do not mistake the
catalog-only console for completed Buyer-to-supplier fulfillment.
