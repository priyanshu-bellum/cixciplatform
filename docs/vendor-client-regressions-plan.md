# Client Vendor-flow regressions: sequential plan

## Authority and order

New client transcripts clarify the manual Vendor form: select an approved CIXCI
Product Category; Vendor Category stays available but is optional. Bulk import
must refresh the Vendor's own product list and allow the follow-up image ZIP
step. The client also reports wireless-matrix usability and Company Profile Save
500 errors. Preserve tenant isolation, canonical compatibility rules and history.

Work one task at a time, reproduce with regression tests, make the smallest
shared fix, then verify. The user has now explicitly authorized pushing the
completed non-Vendor client fixes after final checks, before resuming Vendor API
work. The
unfinished Vendor API work is preserved, hash-verified, in
`.local-copy/vendor-api-worktree` on `work/vendor-api-integration`; it is not part
of this regression patch and its unapplied migrations are not mixed into the
running local schema. Resume it after the existing Vendor flow is stable.

1. **Verified — manual category and bulk follow-up.** Add canonical category
   selection to the Vendor form and JSON validation, keep Vendor Category
   optional, preserve saved Admin overrides and controlled category eligibility.
   Test exact and Universal declarations across all current types. Separate
   bulk success notification from dialog dismissal, invalidate the relevant
   product queries, use actual server counts/errors and preserve the image step.
   Verify image ownership scope and that failed imports never claim success.
2. **Verified — wireless matrix.** Render its controls only for Wireless Charging. Support
   explicitly selected custom combinations, retain the full saved matrix,
   disable redundant saves and explain existing unlisted-combination behavior.
   Do not change acceptance policy by guessing; use existing backend rules and
   the authoritative category/value documents.
3. **Verified local Profile Save paths.** Reproduce from the changed Vendor fields/response or
   local transactional probe. Convert validation failures into actionable API
   errors and fix the actual failing path, with no partial profile update or
   silent commercial changes. Vendor name/changed fields were requested.
4. Resume Company Profile → Integration Mode = API onboarding and its full
   initial/weekly/manual catalog synchronization flow. Keep commission work
   separate and follow the supplied Buyer Pricing Mode guide when that task starts.

## Findings already confirmed in code

- **Latest business clarification:** Universal is the Product's compatibility,
  never an automatic business-category reclassification. This supersedes the
  earlier proposed separate Universal Accessories category and the restriction
  rejecting explicit Universal declarations under non-Universal categories.
  Preserve category/device eligibility, approved type IDs, exclusions, portfolio
  isolation and historical exports. Bare Universal and mixed model/type scopes
  remain invalid. No category migration or supplier-specific bypass is needed.
  This applies across all active approved business categories; Chargers and
  Cables is only an example, never a category-name condition or special case.
- The preview edited Screen Protection but uploaded the original Bundles cell.
  Send the reviewed table as properly quoted UTF-8 CSV, including Excel input,
  and include preview contents in the upload callback dependencies.

- Vendor manual form replaces the CIXCI category selector with a required Vendor
  Category text field; serializer rejects Vendor-selected canonical categories.
- `BulkUploadDialog` calls `onUploaded()` before moving to images, while its
  parent callback closes the dialog. It also does not invalidate the products
  queries. This explains the image-step and stale-list symptoms.
- Bulk UI derives an imported count from preview row count when the server sends
  `rows_passed/rows_staged/rows_failed`, so a 207 failure can look successful.
- Wireless matrix is rendered for every managed field and generates pairs plus
  the complete set; arbitrary intermediate combinations are not configurable.
- The exact live Profile Save failure is not yet established. Do not claim a
  root cause until it is reproduced or the relevant server error is available.

## Universal declaration and upload verification — 12 November 2026

This patch completes the current category/manual/bulk task. It does not claim
the separate wireless-matrix, live Profile Save or Vendor connector tasks are
complete. They remain in the sequence above.

The Universal document sections 4–7 and 15 define the product declaration;
sections 8–14 retain exclusions, lifecycle, portfolio and export behavior. For
example, PC-301 may keep Product Category `Chargers and Cables` and declare
`Universal, Phone, Tablet, Smartwatch` in Device Compatibility. The same is
available in the single-product modal through Product Compatibility. Category
eligibility still controls effective results: declaring three types does not
change a category currently eligible only for Phone and Tablet. Unknown/inactive
categories, bare Universal, mixed type/model declarations and Direct Device
products carrying Universal scopes still fail validation.

No schema/data migration is needed for this code correction. No source Product,
category configuration, completed export, regional relationship or fee was
rewritten during verification; no Universal Accessories category was created.

Regression evidence:

- Before the fix, all 19 initial Universal tests failed at the category guard
  (after correcting fixture setup); the browser preview test independently
  demonstrated that original Bundles was sent instead of the edited category.
- 22 focused Universal backend cases pass: JSON/CSV across three current types
  and Device Specific/Feature Based/Hybrid categories, category eligibility,
  scope replacement and new-device reverse mapping with retired scope history.
  A final regression also reproduced and removed false category-mismatch
  warnings in the read-only audit command; all 22 cases were rerun successfully
  on both SQLite and PostgreSQL after that diagnostic correction.
- Complete suite: **417/417 SQLite and 417/417 PostgreSQL**. This includes the
  existing compatibility, tenant/entity, pricing, regional, export/history and
  media regressions, plus 15 manual-import and three ZIP ownership regressions.
- CSV encoder: **2/2 Node tests** pass for Excel conversion, edited values,
  commas/quotes/newlines, empty cells and Unicode.
- Focused built-UI suite: **10/10 checks** pass, including independent Universal
  selection, the actual edited upload file, ZIP navigation, refreshed products
  before images and HTTP 207 all-failed handling. Writes use intercepted fixtures;
  real Vendor authorization and persistence are tested on isolated databases.
- Full built-UI suite: **40/40 checks** pass, including captured Product Universal
  payloads under all three ordinary category methods, the existing dropdown
  controls, large device/history tables, opaque sticky headers and Region UI.
- TypeScript and Vite production build pass; the local frontend was rebuilt and
  restarted. These changes are **not pushed or deployed to the live server**.
- Read-only local Telco API: HTTP 200, exactly CP00448/CP00449/CP00450/CP00451,
  canonical device names, all four image URLs return PNG/200. The direct case
  retains empty Universal types and exactly one effective device. Copied source
  counts remain 1,034 Products and 124 Devices.

Reproduce using `scripts/verify-compatibility-backend.ps1 -Database both`,
`node --experimental-strip-types --test scripts/csv-preview.test.mjs`, and
`scripts/verify-compatibility-ui.mjs` with the existing runtime QA variables.
Set `CIXCI_QA_SUITE=vendor-client` for focused manual/bulk browser checks. Logs
and screenshots stay in ignored `.local-copy/compatibility-analysis/`.

## Files changed in the current patch

- Backend: `backend/apps/catalog/api.py`,
  `backend/apps/catalog/compatibility_contract.py`,
  `backend/apps/catalog/compatibility_import.py`,
  `backend/apps/catalog/compatibility_engine.py`,
  `backend/apps/catalog/management/commands/audit_compatibility.py`,
  `backend/apps/shared_api.py`.
- Backend tests: `backend/tests/test_product_universal_declaration.py`,
  `backend/tests/test_vendor_manual_import_regressions.py`,
  `backend/tests/test_bulk_image_scope_regressions.py`,
  `backend/tests/test_compatibility_contract.py`,
  `backend/tests/test_compatibility_engine_fixes.py` (fixture comment only).
- Frontend: `frontend/src/pages/catalog/CatalogPage.tsx`,
  `frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx`,
  `frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx`,
  `frontend/src/lib/csvPreview.ts`.
- Verification: `scripts/verify-compatibility-backend.ps1`,
  `scripts/verify-compatibility-ui.mjs`, `scripts/verify-product-entry-ui.mjs`,
  `scripts/verify-vendor-client-ui.mjs`, `scripts/csv-preview.test.mjs`.
- Documentation: this plan, `docs/single-product-compatibility-parity.md`,
  `docs/compatibility-api-and-region-flow.md`,
  `docs/compatibility-remediation-analysis-plan.md`,
  `docs/vendor-integration-implementation-plan.md` (worktree/order status).

The two supplied Word documents are untracked source requirements, not authored
implementation. The separate Vendor API worktree is not part of this patch.

## Wireless matrix result

The Value Management requirement sections 2–5 and the client transcript require
an editable combination matrix shared by Device, Product, CSV and API entry.
The editor now renders only for Wireless Charging, retains every saved
combination and permits arbitrary subsets of approved positive values. It uses
maps keyed by canonical sorted combinations instead of generating a powerset.
Removing an explicit rule is explicit; saving never drops an unrendered triple.
Saved feedback and dirty comparison prevent redundant configured-policy saves.

Acceptance semantics remain unchanged: a prohibited subset blocks a selection;
when the allowed list is nonempty, unlisted multi-value combinations fail; with
no allowed list they follow the prohibited list. Not Compatible stays exclusive
and Tablets cannot supply wireless evidence. The saved Admin policy overrides
legacy defaults as previously approved. Existing governed API permissions,
auditing and recalculation remain authoritative; no new policy was invented.

Browser red checks reproduced all three defects. After the fix, **7/7 built-UI
checks** and **93/93 focused backend checks** pass. Five new backend cases cover
arbitrary triples, prohibited subsets, both unlisted behaviors and negative
exclusivity. TypeScript/Vite build passes; no source configuration was changed
by verification and no new dependency or migration is needed.

Additional files: `frontend/src/components/CompatibilityValuesManager.tsx`,
`backend/tests/test_wireless_matrix_client_contract.py`, and
`scripts/verify-wireless-matrix-ui.mjs`; existing verification scripts are updated.
Run `CIXCI_QA_SUITE=wireless-matrix` for the intercepted-write browser fixture.

## Company Profile findings and correction

The exact reported live traceback was not supplied. A rolled-back local probe of
all five saved Vendor profiles returns 400 activation-readiness errors because
required websites are missing; it does not reproduce a live 500. No website,
country, commercial approval or source Company data was invented to bypass this.

Isolated regressions reproduced two concrete defects: unrelated PATCH requests
silently reset Custom/No Commission mode to Standard, and a concurrent unique
slug failure escaped as HTTP 500. Preserve omitted PATCH fields, and convert
only the known Company slug constraint failure to a field-level 400 inside an
atomic save. Unrelated infrastructure errors are not swallowed. Existing model
validation already handles invalid hierarchy/duplicate generated slugs as 400.

Successful profile changes now audit changed field names, actor and Company
scope without writing contact details or credential values into the audit.
Profile Save disables repeated submissions while pending, shows progress,
retains entered values on validation failure and enables a corrected retry.

Ten backend cases cover hierarchy, generated-slug collision, failed creation,
both pricing modes, a simulated uniqueness race, invalid country/UUID/amount and
oversized metadata. Together with Tenant/Region regressions, **62/62 pass** on
SQLite. The final complete cross-database and browser results are recorded after
the release checks below; the original live traceback remains unverified.

Additional files: `backend/apps/tenant/serializers.py`,
`backend/apps/tenant/views.py`,
`backend/tests/test_company_profile_client_regressions.py`,
`frontend/src/pages/StubPages.tsx`, and `scripts/verify-company-profile-ui.mjs`.

## Final client release gate

The complete final suite passes **432/432 on SQLite and 432/432 on PostgreSQL**.
Built browser checks pass **40 full + 10 Vendor/bulk + 7 matrix + 4 Profile = 61**;
CSV encoding passes **2/2**. The Profile fixture intentionally returns one 400 to
exercise correction/retry; it raises no uncaught UI exception. Build passes.
No Vendor connector changes are included in this authorized push.

Release checklist and residual live-trace limitation:
[client-fixes-release-checklist.md](client-fixes-release-checklist.md).
The final runner is `scripts/verify-client-release.ps1`; it consumes credentials
only from runtime environment variables, writes artifacts to the ignored local
analysis directory and does not alter real Companies or Product catalog rows.
