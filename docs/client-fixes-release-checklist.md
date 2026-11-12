# Client fixes release — 12 November 2026

The user authorized pushing the completed client fixes before resuming Vendor
API integration. This patch contains no Vendor connector schema/API/worker or
credential configuration. That unfinished work remains in the isolated worktree.

## Verified behavior

- [x] Explicit Product Universal compatibility works under any active approved
  business category. Chargers and Cables is only an example. No automatic
  reclassification, new Universal Accessories category or product-specific bypass.
- [x] Single-product form, JSON/API and CSV share canonical scope validation.
  All Phone/Tablet/Smartwatch and Device Specific/Feature Based/Hybrid combinations
  are covered, including scope changes and reverse mapping of new devices.
- [x] Category/device eligibility, exclusions, tenant/entity portfolios, launch
  readiness and completed export history retain their independent guards.
- [x] Vendors can select approved CIXCI Product Category; optional Vendor Category
  and existing Admin overrides retain their documented precedence.
- [x] CSV/Excel sends the reviewed preview, including inline edits, with correct
  quoting for Universal comma lists, quotes, newlines, Unicode and empty cells.
- [x] Bulk success refreshes the catalog and keeps the image ZIP step mounted.
  All-failed HTTP 207 responses show row errors and no false import success.
- [x] ZIP uploads respect the authenticated/selected supplier; assets inherit the
  matched Product supplier and ambiguous SKUs never choose the first offer.
- [x] Wireless matrix is field-specific, supports custom combinations, preserves
  saved arbitrary subsets and disables unchanged repeated saves. Existing shared
  allowed/prohibited policy remains authoritative and is explained in the UI.
- [x] Company partial updates preserve omitted pricing modes. Successful changes
  audit field names and actor/scope; failed updates remain atomic.
- [x] A reproduced Company slug-uniqueness race now returns an actionable 400.
  Profile UI blocks duplicate submissions, shows progress and supports correction
  and retry after field validation errors.
- [x] Existing large device/history modals, both-axis scrolling, opaque sticky
  table headers, dropdown management and regional UI pass browser regressions.

## Final verification

| Check | Result |
| --- | --- |
| Full backend, isolated SQLite | 432/432 passed |
| Same full suite, isolated PostgreSQL | 432/432 passed |
| Full built UI | 40/40 passed |
| Vendor category/bulk built UI | 10/10 passed |
| Wireless matrix built UI | 7/7 passed |
| Company Profile built UI | 4/4 passed |
| CSV encoder | 2/2 passed |
| TypeScript/Vite production build | Passed; local frontend rebuilt/restarted |
| Telco local API | 200; exactly CP00448, CP00449, CP00450, CP00451 |
| Telco image URLs | All four PNG responses 200 |

Browser writes are intercepted fixtures; actual persistence, authority and
rollback are checked in isolated databases. Source Company probes use rolled-back
transactions and disabled cache writes. The two actual new local rows were
inspected read-only: CB-127-C100 remains Screen Protection/Direct Device with one
effective device; PC-301 remains Chargers and Cables/Universal, with its three
declared types and 122 current effective devices. Their statuses were not changed
by verification. The local source now has 1,036 Products and 124 Devices.

Reproduction: `scripts/verify-compatibility-backend.ps1 -Database both` and
`scripts/verify-client-release.ps1` with runtime QA variables. Private logs and
screenshots are under `.local-copy/compatibility-analysis/client-final-*` and
`client-release/`; no credentials, dumps or screenshots are committed.

## Boundaries and rollout

No schema/data migration or new dependency is required for this patch. Push does
not deploy the live containers; the live frontend must be rebuilt when deploying.
Keep backend and frontend from the same release. Existing regional rollout flags
and approved commercial configuration remain unchanged.

The exact originally reported live Profile 500 traceback was not supplied and
cannot be identified from the copied data. Five saved local Vendor profiles
return existing 400 activation-readiness messages for missing required websites.
The confirmed uniqueness-race 500 is fixed and invalid profile cases are tested;
unrelated server/infrastructure failures are not swallowed or claimed impossible.

Resume Vendor onboarding/sync from its preserved worktree after this push,
incorporating these client fixes. Follow the supplied supplier requirements and
Buyer Pricing Mode guide for later supplier-routing/commission milestones.

Full file inventory and root-cause/test details:
[Client regression plan](vendor-client-regressions-plan.md).
