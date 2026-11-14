# Vendor API management

Local Admin page: http://localhost:5173/settings/vendor-integrations

Use the question-mark **Guide** button in the page header for an in-app side
panel. It includes a sample provider response, row-relative field paths, mapping
examples, cents conversion, pagination and the saved-config Test/Sync workflow.
Opening or closing the guide does not change the connection configuration.

## Onboard a supplier

1. Create or select the actual Vendor Company in Settings. Save its Company
   Profile with Integration Mode = API. The saved Company owns its connections
   and offers; connecting another provider does not create another Brand owner.
2. Open **Manage API Catalog**, or **Integration > Vendor Catalog APIs**, and
   select the Vendor. This is a full page, not a configuration modal.
3. Click **Add API Connection**, or select **New connection** from **Saved API
   connection**. Use **Generic REST / JSON setup** in **API setup preset** for a new supplier.
   The optional **Balaji Wireless prefilled setup** only pre-populates known paths.
   **Use Preset** fills starting settings; it does not save another connection.
4. Enter a descriptive connection label, public HTTPS catalog endpoint and the
   provider's authentication method. Credentials are encrypted, write-only and
   independent per connection. A blank replacement keeps the saved credential.
5. Configure the response items path and pagination using the provider contract.
   Supported pagination: cursor, page number, offset or single response. Page/
   offset require an explicit has-more response field; short pages alone do not
   establish completion.
6. Map provider fields to CIXCI fields in the visual editor. Use verified source
   paths or approved constants and select cents conversion only for cent values.
   Map provider categories to active CIXCI categories. Advanced JSON edits the
   same configuration; it does not run executable mapping code.
7. Use **Vendor Brands** to register/reuse Brands and explicitly approve the
   Vendor as Owner or Authorized Distributor. A shared Brand can have multiple
   authorized suppliers without merging their catalog offers.
8. Save, then **Test API Connection**. The bounded preview tests credentials,
   transport and response shape. It imports zero products.
9. **Sync Now** queues ingestion. Follow **Run History** and **Imported Rows &
   Review**. Valid rows use the common catalog validation; missing facts remain
   visible review items. After correcting source/mapping/canonical setup, use
   **Recheck Review Rows** to revalidate saved rows without another provider read.
10. Enable **Weekly full resync** when ready. Save the setting; the configured
    scheduler and dedicated worker must be running. **Cancel Sync** cancels an
    active run; retiring a connection retains saved history.

Retired connections are hidden from the normal selector. **Show retired** makes
them available for inspection/reactivation. The currently edited retired record
remains selectable until you leave it. Automated page-editor tests retire their
temporary connections after verification; they are not supplier feeds.

The page automatically refreshes committed progress and source rows, including
when a quick run finishes between polls. Counters distinguish created, updated,
unchanged, review and error rows. Review cards show the mapped source name, SKU,
Brand, wholesale amount/currency and stock without opening raw JSON. These are
source values under the current mapping, not an approval or Buyer price.
**Refresh Data** reloads saved CIXCI data without calling the supplier. A failed
run shows its error; a retrying run shows its next retry time. Existing saved
facts are retained across failures.

## What future suppliers can configure

| Configuration | Supported |
| --- | --- |
| Separate Vendor and multiple connections | Yes; ownership remains fixed |
| Authentication | Bearer, API-key header, Basic, explicitly public API |
| Response layout | Configured JSON field paths |
| Product fields | Supported canonical fields, identity/cents transforms |
| Pagination | Cursor, page, offset, single response |
| Category values | Explicit approved mappings/default |
| Request limits and budget timezone | Configurable within platform ceilings |
| Manual/weekly synchronization | Same background flow for every connection |
| Arbitrary scripts, OAuth token negotiation, XML, custom transformations | Adapter/review required |

Selecting Generic does not promise every provider protocol works without code.
The configuration covers the supported HTTPS JSON contract. New business rules
and unverified data are not inferred from provider names or product titles.

## Imported rows versus Product Catalog

Source rows are saved in CIXCI first. Missing required Product inputs, such as
launch date, can prevent creation; other incomplete setup can leave a Draft or a
review hold. Buyer availability still requires the shared pricing, category,
Brand, compatibility and media rules. Source images are not automatically
approved CIXCI assets. A bare Universal declaration does not supply its required
Device Type scope.

For the local real-provider proof, 97 source rows are saved and visible in review;
zero new canonical Products were created because required data is missing. The
HTTP 200 connection test is transport evidence, not catalog approval.

That was the initial bounded proof. A subsequent local sync now contains 1,791
source rows, still with zero linked Products because required data/setup is
missing. Admins can open **Product Catalog > API Import Review** or **View imports
in Product Catalog** from connection review to inspect the saved source facts and
creation blockers. This view does not publish incomplete data as Products. See
[the visibility diagnosis](vendor-catalog-import-visibility.md).

The Admin can inspect source review details. Buyer APIs read saved eligible CIXCI
offers and never expose connection secrets or raw source payloads. An invalid
update holds the affected future offer while preserving last saved facts and
historical orders/exports. No source catalog is edited at the remote provider.

## Local verification and release boundary

The generic editor and saved real-provider page were verified in the built UI,
including narrow screens and invalid mapping recovery. Existing client flows
and both backend database suites also pass; see [current status](vendor-api-wip-status.md).
Vendor changes have not been pushed or deployed. Full supplier-aware order,
shipment and commission milestones are explicitly tracked separately; connecting
a feed alone does not complete those downstream contracts.
