# Product Catalog visibility for API imports

## Diagnosis - 12 November 2026

The current local Balaji-backed connection has 1,791 durable source rows, zero
linked canonical Products and a completed run with zero Products created. This
supersedes the earlier bounded 97-row proof count; the historical proof is still
valid evidence of that earlier run.

Every current row reports missing category mapping, MSRP, approved Vendor/Brand
relationship, canonical media review and Launch Date. The actual response keys
contain wholesale prices and update timestamps, but no verified MSRP or Launch
Date. Product.clean requires Launch Date for every Product. The importer records
that failure instead of substituting an import date or supplier update date.
Admin Product queries return canonical Products, including permitted Drafts;
they cannot return a Product that has never been created.

The supplying account for this local proof remains Local QA Vendor. Its source
connection cannot transfer ownership by changing a request field. This is not a
production Balaji account onboarding or approval of Brand relationships.

## Plan and implementation

1. Verify source counts, linkage, review codes and canonical catalog filtering.
2. Add an Admin-only Product Catalog > API Import Review tab using the existing
   authorized source API and cursor pagination. Show saved names, SKUs, Brands,
   source wholesale/stock, Product linkage and explicit blockers.
3. Link Vendor review to the same catalog tab and link back to the exact Vendor
   connection. Linked Products use the existing Edit Product workflow. Unlinked
   rows remain clearly marked Product not created; they are not synthetic
   Product records or publishable Buyer offers.
4. Verify actual source rows, pagination, narrow-screen scrolling, setup links
   and the difference between staged imports and visible valid Draft Products.

No new business defaults, Product validation relaxation, schema change, inferred
Brand approval, supplier transfer or Buyer visibility exception is introduced.
Missing MSRP and Launch Date require an authoritative source or an explicitly
documented business-rule change. That dependent data setup remains unresolved.

## Review flow

Open Product Catalog > API Import Review, select the supplier feed and inspect
the blockers. The list reads saved CIXCI data, not the provider. Needs review only
filters the existing server query. Open API setup retains Vendor/connection
scope. Fix verified mapping/Brand/category/setup and recheck saved review rows.
Existing canonical Products can be edited from the table; missing Products still
need the verified required inputs before creation can succeed.

Buyers do not receive this Admin tab or raw source data. Server authorization
continues to deny Buyer access to supplier source endpoints. Source facts and
historical transactions are unchanged by opening or paging this view.

## Verification

The focused Vendor suite passed 71 tests on each of isolated SQLite and
PostgreSQL, including staged-row visibility and canonical Draft visibility. The
built browser flow passed 18 checks: real saved-row names/blockers, cursor pages,
return-to-setup links, narrow-screen table scrolling, Guide and Buyer/Vendor
access boundaries. Existing client regression and CSV checks were also rerun.
Private reports are under .local-copy/compatibility-analysis/catalog-import-*.

The user's clarified complete catalog-to-order-to-shipment requirement is tracked
in [the verified end-to-end plan](balaji-end-to-end-integration-plan.md). The new
review view is not a replacement for the unfinished order/fulfillment adapter.
