# Vendor requirement traceability — working draft

Authority: [Accessory Vendor Configuration and Supplier Routing Requirements
v1.2](CIXCI_Accessory_Vendor_Configuration_and_Supplier_Routing_Requirements.docx).
Every requirement below is part of the requested feature; successful catalog
fetching alone does not complete this document. No Vendor draft is released.
The earlier independent client fixes were pushed as `e59133b`.

Current workspace: the user requested consolidation, so Vendor code now lives in
`E:\cixci` with the verified `a049749` hotfix. The temporary worktree was backed
up, hash-verified and removed. Vendor functionality remains under verification
and has not been pushed. Separate scoped Vendor/Buyer local QA accounts exist.

| Requirement | Current implementation/evidence | Remaining release condition |
| --- | --- | --- |
| VEN-01 | One existing Vendor Company owns connections/source rows/Product offers; CSV/manual Brand parity and cross-Vendor validation tested; existing DC/return address retained | Complete downstream order/fulfillment ownership tests |
| VEN-02 | Reusable Brand and one Vendor/Brand relationship constraint; full Admin page; reuse, retirement and tenant authorization tested | Final downstream history acceptance |
| VEN-03 | Separate Vendor-scoped Product upserts; shared SKU/UPC produces distinct offers; Brand reuse supported | Verify fulfillment/returns use accepted supplier, not a later catalog lookup |
| VEN-04 | Product ID and supplier retained; Brand FK added; source brand display preserved; update cannot transfer owner | Complete all import-path checks and data migration audit |
| EXP-01 | Existing export history inspected; it lacks a directly queryable supplier mapping | Add stable Buyer Entity/integration-scoped mapping with Product/supplier validation |
| EXP-02 | No new mapping reference is exposed yet | Document and return mapping/listing references for each supported integration |
| EXP-03 | No supplier mapping version model yet | Single active listing selection, explicit version changes and late-order tests |
| ORD-01 | Existing order creation still uses first SKU/UPC match and first Buyer Entity | Replace with authorized mapping resolution; reuse authenticated entity authority |
| ORD-02 | Existing validation does not cover missing/ambiguous mapping | Stable per-line error codes; block handoff before any partial order write |
| ORD-03 | Existing suborders and pricing snapshots inspected | Persist mapping/supplier/Product/pricing on acceptance and keep retries/returns bound |
| SHP-01 | Existing vendor shipping API/CSV paths require full trace | Record packages and covered line quantities at accepted supplier scope |
| SHP-02 | No completeness claim made | Parent-order expected quantities, split/partial shipments and authorized cancellations |
| SHP-03 | Existing primary-suborder shipping display can expose partial information | Hold every Buyer-facing outbound path until parent completeness |
| SHP-04 | No new consolidated release implemented | One logical parent-order update, transactional deduplication and safe retries |
| SHP-05 | No new Operations pending-quantity UI implemented | Show pending vendor/line/quantity details without releasing incomplete updates |
| MIG-01 | Brand FK/schema and unambiguous approved-label backfill drafted/tested; no inferred Owned/Distributor relation | Review unresolved labels and prove existing IDs/display/history preserved |
| MIG-02 | Historical snapshots contain Product ID and vendor name, not stable Vendor ID | Backfill only when history and original Product agree; unresolved cases stay review-required |
| MIG-03 | Current Company key/entity behavior retained; no storefront inferred from labels | Implement explicit Buyer Entity/integration-storefront export scope; prepare actual listing references before routing cutover |
| DEL-01 | Catalog sync contract, current code paths, tests and WIP state documented | Publish final mapping fields, uniqueness, identifiers, error codes and migration exceptions |
| DEL-02 | Vendor work consolidated into main workspace; local schema migrated; no Vendor push/deployment | Schema/export transition first, then prepared integration mappings, then routing; overlapping offers only when incoming orders identify the selected offer |

## Explicit boundaries

- The user confirmed company-wise API keys, with authorized Entity selected per
  request and combined authorized My Devices within that Entity. Never choose
  the first user/entity or infer a storefront from an API-key label.
- Recommended export scope is Company > Buyer Entity > integration/storefront >
  export mapping. This does not change company-wise keys. Actual integration
  identifiers and listing references must be prepared explicitly before routing
  cutover; first user/Entity and key-label guesses remain prohibited.
- Existing completed exports/order/pricing history are immutable. Do not backfill
  history by editing a completed JSON snapshot or routing from current first SKU.
- Provider omissions stay explicit review items: do not fabricate category,
  MSRP, launch date, Universal Device Types, features or approved media.
- An invalid new source update holds only the affected future offer. Keep the
  last canonical Product and all accepted transaction snapshots intact.
- Commission follows the separate Buyer Pricing Mode developer guide; this
  importer supplies Vendor price inputs and does not invent commission policy.

## Current verified milestones

The combined backend suite now passes 518 tests on each of SQLite and PostgreSQL.
Existing built client regressions pass 62 checks plus two CSV checks. The new full
page passes 14 generic-editor/Guide checks and 11 saved real-provider/worker checks. A
real bounded provider read stored 97 source rows, all in review and zero canonical
Products. A dedicated local worker completed saved-row revalidation through the
real queue without another provider read. No general copied-production scheduler
is running. See [current implementation status](vendor-api-wip-status.md) and
[Admin setup guide](vendor-api-management-guide.md). These catalog results do not
constitute acceptance of the unfinished EXP/ORD/SHP/commission milestones.
