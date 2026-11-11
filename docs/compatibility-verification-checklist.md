# Compatibility remediation verification and rollout

## Reviewed regional UI correction — 2026-11-12

The Region page now starts with the original Vendor table and coverage/fee/DC/
event tabs. Country administration and read-only Buyer diagnostics are on demand.
The mobile tab defect was reproduced first (Region Events outside 390px), then
fixed with scrollable navigation. Final browser verification: **37/37 passed**,
zero uncaught UI exceptions and zero failed local HTTP requests. Regional API
contract: **22/22 SQLite and 22/22 PostgreSQL**. Production frontend build and
local Telco's exact four products/all four PNG responses pass.

No visibility, financial, source-data or schema change accompanies this task.
The user explicitly approved pushing this verified regional UI task after review.
Subsequent Vendor/commission changes require their own tests and push instruction.
See [the regional UI report](region-ui-review-and-verification.md). Other queued
tasks remain in [the sequential plan](vendor-integration-implementation-plan.md).

## Single-product parity and dropdown follow-up — 2026-11-12

The full suite now passes **355 tests on SQLite** and **355 on PostgreSQL**,
including eight new manual/CSV category-boundary and Universal deduplication
cases. TypeScript/Vite production build passes. Browser verification passes
**33/33 checks**, with zero uncaught UI exceptions and zero failed local HTTP
requests. It covers model selection beyond 50, actual structured form payloads,
visible saved manufacturer names and direct access to Device Type compatibility
rules. Local Telco API still returns exactly CP00448–CP00451, and all four PNG
images return HTTP 200. Source counts remain 1,034 Products and 124 Devices.

Product Manage Dropdown retains its original Category/System Color management
layout; the duplicate shared values editor is removed from that dialog. Shared
compatibility values remain under Device Manage Dropdown. See
[the parity and dropdown report](single-product-compatibility-parity.md).

## Latest onboarding and Universal correction — 2026-11-12

The earlier manual per-Buyer region UI is superseded. Company onboarding country
automatically resolves the new default Entity's Operating Region; independent
entities resolve from their own countries. Region page now shows read-only
resolution and Vendor coverage setup. Country normalization uses a checked-in UN
alpha2/alpha3 reference and never maps an address state or a parent access grant.

User approved Speakers category as Universal and BAS-214-MO scope as Phone,
Tablet and Smartwatch. New migration 0032 records that declaration and retains
Bluetooth No. Local shared reconciliation produces 123 Active and one Pending
device relationship. The three other undeclared Speakers remain review-required.
No other product receives an invented scope and completed exports stay immutable.

Tenant 0014 backfills country-derived references and catalog 0032 applies the
approved declaration. A fresh private backup precedes these local migrations.
The full updated Phase 1 suite passes **347 tests on SQLite** and the **same 347
on PostgreSQL**. Updated browser parity passes **21/21 checks**, including the
single-product Universal selector, country-derived onboarding and both sticky
header themes. Telco still returns its exact four products and all four PNG
images return HTTP 200. Push review follows before Vendor integration.

Earlier run counts and setup decisions below are retained as historical evidence;
the current flow is documented in [the admin guide](region-setup-admin-guide.md)
and [the execution plan](onboarding-and-vendor-integration-plan.md).

This is a local implementation report. Phase 1 was committed and pushed as
`53b655e`. No production deployment or live data repair has been performed.

## Completed implementation

- [x] Reviewed all six compatibility/region Word documents, spreadsheet, client transcript and Claude's partial changes.
- [x] One canonical validation contract for Product/Device forms, JSON API and CSV.
- [x] Device Specific, Universal, Feature Based and Hybrid methods; reject method/scope conflicts.
- [x] Canonical Type IDs and model IDs; Phone/Smartphone alias; no expansion to newly added types.
- [x] Seven entry fields with governed values, entry modes separate from comparisons, linked numeric storage capacities and wireless policy.
- [x] Shared forward/reverse reconciliation; changed-device candidate restriction, type-scope filtering, deduplication and Vendor/SKU index.
- [x] Independent mapping-source evidence; durable exclusions, Admin locks and historical rows retained.
- [x] Atomic Product + explicit mapping saves; atomic audited key and configuration changes.
- [x] Vendor ownership derived on the server for dashboard/API/CSV; only Admin selects Supplier.
- [x] Admin-on-behalf source ownership stays with the selected Supplier, regardless of Admin entity.
- [x] Company-owned API keys, explicit authorized entity selection, no saved user relinking.
- [x] Buyer Entity portfolio shared across authorized users; other entities/companies excluded.
- [x] Current export revalidation and frozen canonical model names; completed export retry cannot overwrite history.
- [x] Device Details & History enlarged; both table scroll directions and all rows reachable.
- [x] Product Edit loads full details and its own mappings before Save; authoritative empty mappings do not fall back to stale source arrays.
- [x] Shared exclusion reason options in API, single exclusion and bulk Remove UI.
- [x] Governed Operating Region catalog, explicit Buyer Entity setup, canonical fee/coverage choices and document policy tests.
- [x] Buyer current regional-fee discovery and historical fee reads scoped through company + entity orders.
- [x] Generic audited data migrations, read-only audit and explicit apply reconciliation command.

## Local copied-data checks

| Check | Result |
| --- | --- |
| Telco company-key catalog | HTTP 200; exactly CP00448, CP00449, CP00450, CP00451 |
| Primary image URLs | Absolute `/api/img/` URLs under configured local base |
| All four image responses | HTTP 200, image/png, valid PNG signature |
| Buyer output | Canonical device names; no internal type declarations or Vendor wholesale cost |
| iPhone 16 Plus case | Direct mode, empty Universal type declaration, one effective model |
| Source catalog counts | 1,034 Products, 124 Devices, unchanged |
| First audited rebuild | 1,034 Products reconciled, 4,439 derived mapping changes |
| Repeated rebuild | 1,034 Products reconciled, zero mapping changes |
| Compatibility audit | No method conflicts, invalid direct scopes, unresolved active category types, disabled current auto types or active invalid Universal assertions |
| Regional enforcement | OFF globally; Telco data preserved, no guessed configuration or tenant-specific bypass |

Private machine-specific evidence is under `.local-copy/compatibility-analysis/`
and is excluded from Git. The PostgreSQL backup is
`before-compatibility-rollout.dump` in that private directory. Do not publish
dumps, tokens, copied credentials, browser profiles or raw customer-data logs.

## Automated verification

| Final check | Result |
| --- | --- |
| SQLite targeted combined regression suite | 336 passed, 74.10 seconds |
| PostgreSQL targeted combined regression suite | Same 336 passed, 121.14 seconds |
| Frontend TypeScript + Vite Docker build | Passed; existing large-bundle advisory remains |
| Django system check | No issues |
| Migration drift check | No changes detected |
| Git whitespace check | Passed |
| Chromium browser UI | 13/13 passed; zero uncaught exceptions or failed local requests |

The loaded setup view includes real Buyer Entity region selectors. Desktop modal
is 1,200 × 900 within a 1,440 × 1,000 viewport; at 390 × 844 the modal fits and the
900-pixel table scrolls internally. All 75 fixture rows, including the last, are
reachable without document-level horizontal overflow. Admin Product and CSV
supplier selectors render; Vendor CSV role preview has no supplier selector.

These are the targeted catalog/device/tenant/pricing/integration checks, not a
claim that every unrelated platform or external-provider flow has been certified.
The suite includes all three current types × four mapping methods × JSON/CSV ×
user/company-key authentication (48 entry combinations), plus negative inputs,
atomic rollback, audit failure, exclusions/locks, entity isolation, lifecycle,
future devices, exact SKU ownership, current exports and preserved history.

Run the complete backend regression set on the existing local Docker stack:

```powershell
.\scripts\verify-compatibility-backend.ps1 -Database both
```

SQLite uses `config.test_settings`. PostgreSQL uses
`config.compatibility_test_settings` and the dedicated `test_cixci_compatibility`
database. Neither test configuration targets the restored source database.

The no-dependency browser harness needs Node 22+, an existing Chromium executable
and runtime `CIXCI_QA_EMAIL`, `CIXCI_QA_PASSWORD`, `CIXCI_QA_CHROME` environment
variables. Run `node scripts/verify-compatibility-ui.mjs`. It uses localhost only.
Desktop/mobile scrolling uses 75 browser-only rows; source catalog is not edited.
Vendor selector rendering uses an explicitly identified read-only profile fixture
unless `CIXCI_QA_VENDOR_SESSION` supplies a valid local session. Actual Vendor
authorization/ownership is exercised by the isolated backend JWT/key matrix.
The copied database currently has no eligible non-System-Admin Vendor login;
no production-derived user was promoted, relinked or modified to manufacture one.

## Legacy failures investigated

The original Claude-focused baseline was 22 pass / 3 fail. A separate clean-HEAD
broader baseline was 89 pass / 21 fail. Repairs include the real undefined
`old_self` Product audit crash, an unbound CSV `settings` reference, Admin import
without Supplier, and CSV rollback outside an atomic transaction.

Outdated tests were corrected without weakening access: canonical configured type
IDs, valid PNG/media setup, current Buyer Entity portfolios and user IDs for
exports, Admin-only company directory access, proper reasoned Remove semantics,
and cursor-pagination result assertions. CSV never invents a wireless/Bluetooth
default merely to satisfy a legacy assertion.

## Migration and local rollout order

1. Retain a full PostgreSQL backup and private preflight audit before any real rollout.
2. Review the release artifact and all migrations together. This is not a direction to run Git commands in the non-repository production runtime directory.
3. Apply catalog 0026–0031 and tenant 0013 through the deployment's migration workflow. 0026 is now a no-op placeholder; 0027 adds canonical scopes/evidence; 0028 backfills canonical references/shared values; 0029 retires invalid Universal effectiveness and clears inconsistent direct scope with audit; 0030 indexes Vendor/SKU; 0031 initializes documented legacy rules and the explicitly approved current auto flags. Tenant 0013 adds canonical regions and nullable explicit entity assignments without address backfill.
4. Run `python manage.py audit_compatibility` and review configuration exceptions.
5. `python manage.py reconcile_compatibility --all` is a read-only plan. Applying requires `--apply --actor <authorized-System-Admin-UUID>` and writes audited, idempotent, per-product transactions. Refresh current projections once after the batch. On an interrupted batch rerun the same scope.
6. Run the test matrix, Django system/migration checks, frontend build, browser checks and real authorized Telco API/image regression before promotion.
7. Keep `REGIONAL_VISIBILITY_ENFORCE=False` until approved canonical setup and the commercial review below are complete. Admin retains full source catalog access; Vendor retains its own source catalog.

Data backfills are not blind reversible SQL operations. Use the retained backup
and a reviewed recovery plan if a rollback is necessary. Claude's original 0026
had already deleted 25 invalid assertions on this local copy before continuation;
the new migrations cannot recreate those earlier deleted rows. Fresh deployments
use the no-op 0026 and the history-preserving repair. Do not conceal that caveat.

## Remaining release gates and review

- [ ] Supply actual canonical Telco Entity Operating Region and approved SaharaCase relationship/coverage/fee configuration. Do not infer NY→US or approve a relationship from the existence of four historical exports.
- [ ] Complete the region document's open currency and shipping-charge granularity decisions before changing commercial calculations.
- [ ] Review legacy PO/routing entity/region handling and connect immutable shipping snapshots through order/invoice flows. Existing order-to-invoice regional financial compliance is not certified by this work.
- [ ] Add and certify any required external Vendor product-pull adapter using its actual provider contract; a connection metadata record is not an ingestion implementation.
- [ ] Client reviews the mapping and rollout impact before production promotion.

These gates do not justify weakening compatibility, tenant isolation or Admin
authority. The global regional release hold preserves existing Telco access while
the document-defined strict policy remains separately reviewable and tested.
