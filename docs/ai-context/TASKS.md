# Persistent tasks

Latest completion: TASK-024 (Missing Devices resolve flow and page). TASK-025 (tenant scope, 401, test baseline) is in progress.
Open follow-up: TASK-014 (provider mappings/images and remote test diagnostics).
TASK-002–008 record earlier discoveries. IDs are permanent.

## TASK-025 — Fulfillment tenant scope, 401 responses and the failing-test baseline

- Status: in_progress
- Related features: FUL-001, TEN-001, AUTH-001, INT-002, CMP-002, MED-001; BR-TEN-001.
- Tenant scope (fixed, reproduced first): handoffs, SLA evaluations, shipping and
  return import logs and return requests were unfiltered for a non-admin user whose
  company was not a vendor or buyer (or who had no entity); SLA policies and
  overrides had no tenant filter at all; handoffs/debug-order read any purchase
  order for any user with the list capability. All now return nothing outside the
  owning vendor/buyer; debug-order is CIXCI admin only.
- 401 vs 403 (fixed): SessionAuthentication was first in DRF's authenticator list
  (af4cac6), so a missing or expired token returned 403 and the frontend's
  refresh-on-401 never ran. Order is now API key, JWT, session.
- Vendor sync (fixed): "Universal, <Type>" lost its declared type scope; an
  approved feature value such as Lightning is no longer reported as a missing
  device; two same-named catalog devices are never picked between (the name goes
  to Missing Devices); a new offer that still needs review (MSRP, brand, category)
  is created as draft instead of active, so later price/stock updates still apply.
- Tests brought in line with decisions already recorded (JPEG accepted, proxy image
  URLs, six vendor images, admin-only API keys, exported-products image list,
  Missing Devices) and stale fixtures repaired (products whose readiness a save
  recomputes, seed categories without eligible types).
- Verification: full backend suite 1,041 passed/17 failed (was 996/55); every
  remaining failure was already failing before this task. 6 new tenant-scope tests.
- Remaining 17, not changed because each needs an owner decision or a rebuilt
  scenario: 6 keyword-category tests for a function removed in faa2f8c
  (ISSUE-015); 2 tests that want a renamed image rejected while 2 newer passing
  tests want it accepted (ISSUE-016); 6 export/storefront/assortment tests whose
  fixtures predate that contract (ISSUE-017); whole-file rollback vs partial CSV
  import; conflicting compatibility evidence should create no product; one
  SQLite-only JSON lookup. An attempt to mark these as expected failures was not
  permitted and was not applied.

## TASK-024 — Missing Devices: durable vendor names and a complete resolve flow

- Status: completed
- Related features: INT-002, CMP-002, DEV-002, CAT-002, UI-001; BR-INT-003.
- Trigger: user asked that adding a missing device sets everything right and that
  the page makes clear what is missing and lets the admin fix it there.
- Schema: catalog 0047 adds catalog_vendor_device_mapping (VendorDeviceMapping):
  one row per vendor and normalized name, status missing/mapped/dismissed, device
  FK, product references. Applied to the local copy only.
- Backend: catalog/missing_devices.py. Ingest records unresolved names with the
  products that declared them. The resolver reads mapped rows as aliases and skips
  dismissed text, so a decision survives later syncs even when the catalog device
  is named differently. resolve_mapping maps every declaring product through the
  canonical command, clears MISSING_DEVICE_REVIEW on sources with nothing left
  missing, invalidates projections once, audits, and reports products it could not
  map with the reason. Earlier dashboard alerts are imported into rows on list.
- API (admin only): GET /catalog/missing-devices/?status=&search=&vendor=,
  GET {id}/products/, POST add_device/ (manufacturer_id or manufacturer_name),
  link_device/, dismiss_device/, restore_device/. The old request shapes still work.
- UI: MissingDevicesTab rewritten: counts, Missing/Resolved/Dismissed views, vendor
  and product count per name, affected products on expand, type/manufacturer
  suggestion, likely existing device to link, add/link dialogs, result summary.
- Verification: 12 tests in tests/test_missing_device_flow.py; full backend suite
  996 passed/55 failed (same 55 as baseline); makemigrations --check clean; tsc and
  eslint clean; page driven in headless Chrome with fixture APIs (add, link,
  dismiss, undo; light and dark/narrow) and opened on the real local stack as admin.
- Not verified: a real provider sync producing missing names; PostgreSQL test settings.
- Remaining: none for this task. Uncommitted.

## TASK-023 — Unknown provider device names go to Missing Devices

- Status: completed
- Related features: INT-002, CMP-002, DEV-002, CAT-002, NTF-001; BR-INT-003.
- Trigger: explicit user decision 2026-11-28 to stop auto-creating devices from
  provider text (they were always created as Phone, e.g. a laptop model).
- Change: CatalogDeviceResolver no longer creates Device/Manufacturer rows; it maps
  the known models and reports the rest in `missing`. ingest_rows adds those names
  to the missing-device alert (limit raised from 50 to 500 names per page) and marks
  the source MISSING_DEVICE_REVIEW, which is informational and does not block the
  save. Missing Devices add_device now maps matching products through
  update_explicit_selections (history, locks/exclusions, readiness) instead of a raw
  bulk insert, and only offers/accepts Active device types.
- Verification: 4 tests in tests/test_missing_device_flow.py; full backend suite
  989 passed/55 failed, the same 55 as before.
- Not changed: devices auto-created by earlier syncs (22 unconfigured in the local
  copy) remain; no data repair was run.
- Remaining: on the next provider sync, products that declare unknown models show
  Review Required until an admin adds the device. Uncommitted.

## TASK-022 — Device types become compatible when an admin activates them

- Status: completed
- Related features: DEV-001/002, CMP-001/002, CAT-002, INT-002; BR-CMP-002.
- Trigger: a Laptop type added in Device Catalog never appeared in Vendor Audit or
  category rules. Cause: a fixed list (phone, tablet, smartwatch) in
  compatibility_contract gated options, validation, matching and eligibility; the
  local Laptop type is also still Setup Required. The earlier rule ("current
  eligible types are Phone, Tablet and Smartwatch") was changed on the user's
  explicit choice on 2026-11-28.
- Change: usable_device_type (status active and is_active) replaces the fixed list
  in resolve_device_types, eligible_devices, check_compatibility, reconcile,
  explicit selections and compatibility-options. A category must still list the
  type. The fixed list survives only as CORE_DEVICE_TYPE_CODES, the scope of a
  provider's bare "Universal".
- Also fixed: a bare "Universal" declaration was looked up as a device name and
  auto-created as a device called "Universal" (ISSUE-013 behaviour), so the
  Universal branch never ran; it is now kept as a scope token.
- Unknown provider device names: decided and changed in TASK-023.
- Verification: 5 new tests in tests/test_device_type_activation.py; full backend
  suite 985 passed/55 failed, the same 55 as before. Local server: only active
  types are offered; Laptop remains Setup Required until an admin activates it.
- Remaining: admin activates Laptop and adds it to the wanted categories. Uncommitted.

## TASK-021 — EasyPost carrier tracking and vendor shipment contract

- Status: completed
- Related features: FUL-001, INT-003, ORD-001/002, NTF-001, UI-001; BR-FUL-001.
- Trigger: user request to integrate EasyPost for manual (CSV) vendors, add an admin
  screen for its API key, and verify the Balaji shipment webhook path end to end
  (vendor, platform, buyer dashboard and buyer API).
- Sources: EasyPost docs (trackers, webhooks, events, authentication, errors,
  tracking guide) and the official Python client's validate_webhook, fetched
  2026-11-28; Balaji OpenAPI saved under .local-copy/balaji-buyer-fix/openapi.yaml.
- Design: fulfillment/tracking.py is the single place where a shipment moves.
  CSV upload, Balaji webhook/poll and EasyPost all report there; it updates the
  handoff (never backwards from delivered), suborder, order and buyer signals.
  fulfillment/easypost.py is a DNS-pinned HTTPS client (no SDK, Basic auth).
  CSV upload only queues a ShipmentTracker row; a worker registers it. EasyPost
  webhooks (HMAC-verified, stored once per event ID) are the main path; the
  existing 30-minute beat task is the safety net with leases and backoff.
- Schema: migration fulfillment 0011 adds four tables only (CarrierTrackingConfig,
  ShipmentTracker, ShipmentTrackingEvent, CarrierWebhookReceipt). Not applied to
  any database by this task.
- API: admin-only /api/v1/fulfillment/carrier-tracking/ (GET, config/, test/,
  generate-webhook-secret/, register-webhook/, trackers/, trackers/{id}/retry/,
  sync/); public signed POST /api/v1/fulfillment/carrier-webhooks/easypost/{id}/.
  Additive `tracking` object on handoffs, buyer-shipments, order shipping_info and
  suborder_shipments; `tracking_events` on buyer-shipments/{id}/.
- UI: Integrations → Carrier Tracking (CIXCI admin): key, mode, enable, webhook
  registration, carrier names, tracked shipments with retry. Orders show carrier
  status, estimate and tracking link per vendor shipment.
- Balaji gaps found and fixed: `tracking` is documented as an array but was read as
  an object (number/carrier were never stored); shipment.delivered did not deliver
  when status stayed "Shipped"; shipped events did not move suborder/order or
  create the buyer shipment signal; unmatched events were recorded as processed
  with the reason dropped; buyer notifications were scoped to a user ID instead of
  the buyer company; buyer-signals list was not tenant scoped.
- Verification: 20 carrier-tracking, 6 Balaji contract and 1 CSV-queue tests pass;
  full backend result and UI check recorded in CHANGELOG. tsc clean.
- Not verified: a real EasyPost key, webhook delivery from EasyPost, carrier name
  strings other than UPS/USPS (their documentation table could not be read),
  EasyPost rate limits, dedicated PostgreSQL settings, a live Balaji event.
- Remaining: apply migration 0011, enter a test key in the admin screen, register
  the webhook from a public https host, upload one CSV with an EasyPost test
  tracking code and confirm the buyer view. Uncommitted, same branch as TASK-020.

## TASK-020 — Vendor Audit selection fix and compatibility write batching

- Status: completed
- Related features: CMP-001/002, CAT-002, INT-002, DEV-002, MED-001, UI-001; BR-CAT-004.
- Trigger: client video (Cricket Icon 6 in Chargers and Cables): a Universal product
  switched to "Use category compatibility rules" kept every former device, including
  models whose Device Catalog evidence fails the rule. User then asked for the whole
  device/dropdown/category/sync path to be reviewed and optimised.
- Root cause: vendor-audit `device_assertions` listed every compatible row without
  its source; VendorAuditCategoryDrawer and the mapping panel seeded the model picker
  from that list and saved it with `replace`, storing Universal/Feature results as
  manual_assertion. Hybrid then keeps explicit evidence regardless of field rules.
- Fix: rows carry `explicit`; both pickers start from explicit rows only
  (vendorAuditData.explicitDevices). Backend rule semantics are unchanged.
- Optimisation (same results and audit rows): reconcile and explicit-selection
  commands write mappings and audit records in batches; one controlled-value catalog
  and one device lookup per batch; Device Type saves and device bulk recalculation
  reconcile each affected product once (run_devices_remapping); vendor sync resolves
  declared device IDs with one set lookup and reads controlled values once per page;
  deferred vendor images download in parallel (8 threads, 20 products per batch,
  database writes stay on the task thread); dropdown list uses grouped product
  counts; product bulk recalculation invalidates buyer projections once.
- User-delegated decisions 2026-11-28 ("do what is best"), all conservative: Hybrid
  explicit selections stay authoritative; Balaji "Universal" expansion and
  auto-created devices are unchanged (ISSUE-013); no automatic cleanup of earlier
  rows, `audit_compatibility` now reports manual selections with a Universal origin.
- Verification: full backend suite in the backend image, SQLite test settings:
  953 passed/55 failed against 944 passed/55 failed before, identical failing set
  (pre-existing). 9 new tests in tests/test_compat_selection_and_batching.py pass.
  Browser tests 14/14 (1 new). tsc -b clean; eslint clean on changed audit files.
  Rolled-back replay on the local copy: old payload keeps 114 devices incl. Icon 6
  as 114 explicit rows; corrected payload gives 35 rule matches, Icon 6 excluded.
  One Universal product: 238 statements before, 12 after; one-device remap 1,535
  to 1,133.
- Not verified: dedicated PostgreSQL test settings, a real provider sync, the
  client's server (its category mode and existing manual rows are unknown here).
- Remaining: run `manage.py audit_compatibility` on the client server and review
  the reported SKUs; rebuild/redeploy frontend and backend. Uncommitted on branch
  perf/compat-sync-and-audit-seeding. Dev compose worker still ignores the
  vendor_catalog queue (ISSUE-011), deliberately unchanged.

## TASK-019 — App-wide UI polish and dashboard refresh

- Status: in_progress
- Related features: UI-001 (presentation only; no rule/API/schema/dependency change).
- Trigger: user asked to fix the dashboard and polish every page without logic
  changes, then reported oversized fonts and a flashing Device Catalog search.
- Implementation: theme/components.ts (pill buttons with nowrap, 10px inputs, 16px
  cards/papers/tables, 20px dialogs, pill chips); AppLayout scopes pill page tabs to
  pages inside the layout (dialogs and TelcoCellularPage keep their own tabs);
  DashboardPage shared WelcomeBanner/quick actions and StatCard restyled for all
  three role dashboards; catalog/device hero and controls scaled back to the app's
  existing type sizes; Devices query keeps previous results and debounces search
  (300 ms) so the list no longer flashes; single All Devices tab hidden for non-buyers.
- Verification: tsc -b clean; dev compose frontend rebuilt; real local admin session
  screenshots of all 16 routes in light mode and key routes in dark mode reviewed,
  no console errors reported on those routes.
- Not verified: buyer and vendor sessions (no test credentials available in the
  repo; local token minting was not permitted). Pre-existing: /telco-cellular throws
  React error 300 for a non-Telco user (early return before hooks) — not changed.
- Follow-ups (2026-11-28): ProductCard compacted (overlay pager, inline specs,
  2-column price panel) then fonts raised again on user feedback. VendorAuditTab
  re-laid out (one toolbar with vendor/filters/actions, single-row stat tiles beside
  category breakdown, sectioned action panel, diff count + match/differ icons, Live
  API Search moved below the workspace). Long device lists show a count and scroll
  inside a fixed-height box; list, comparison and action panes scroll internally
  with overscroll containment. All data-testids, labels and requests unchanged;
  13/13 vendor-audit browser tests pass after the change.
- Remaining: buyer/vendor walkthrough once credentials are supplied. Uncommitted.

## TASK-018 — Redesign Device Catalog page

- Status: completed
- Related features: UI-001, DEV-001/002 (presentation only; no rule/API/schema change).
- Trigger: user asked for a distinct UI redesign of the Device Catalog after TASK-017.
- Implementation: DevicesPage main view only — hero + pill actions/tabs, summary
  tiles counted from the devices matching current filters, toolbar (pill search,
  count, device-type chips writing the existing type filter, manufacturer/status
  selects, Cards/Table toggle), device and portfolio cards in
  frontend/src/pages/devices/DeviceCards.tsx + deviceCatalog.css. Table view, all
  handlers, queries, role gating and every dialog are unchanged. Cards additionally
  show the existing launch_date field.
- Verification: tsc -b clean; eslint DevicesPage 75 vs 72 before (3 more
  no-explicit-any in the existing idiom); mock-harness screenshots light/dark
  reviewed, harness removed; dev compose frontend rebuilt with
  --build-arg VITE_API_URL (compose file passes it only at runtime, .env is
  dockerignored — a build without the arg breaks login), frontend 200/backend 403.
- Remaining: user review with real data; device dialogs not redesigned. Uncommitted.

## TASK-017 — Redesign product catalog page, card and detail modal

- Status: completed
- Related features: UI-001, CAT-001 (presentation only; no rule/API/schema change).
- Trigger: user request with two reference images; every value shown today must
  remain visible, layout must fit beside the app sidebar.
- Implementation: new productCatalog.css card (media tile, "n of N" image pager,
  brand/series, category, SKU/UPC, color/system color, exported date, wholesale/
  vendor wholesale/MAP/sale/inventory panel, MSRP + status, buyer Add Product pill);
  ProductFilterBar toolbar (pill search, count, category chips replacing the Category
  multiselect with the same filter state, existing attribute filters, selection bar);
  CatalogPage hero + pill tabs/actions; ManageProductDialog header, pill tabs,
  gallery, pricing tiles, helpers hoisted out of render. Role gating, handlers,
  queries and filter parameters are unchanged.
- Verification: tsc -b clean; eslint on the six files 93 pre-existing-category
  errors vs 130 before; headless Chrome screenshots of a temporary mock harness
  (admin light, buyer dark, dialog admin/vendor) reviewed then harness removed;
  dev compose frontend image fb494b1aac34 rebuilt/recreated, frontend 200, backend 403
  unauthenticated. Not run: npm browser tests (VendorAuditTab only, untouched) and an
  authenticated real-data walkthrough (no browser session available).
- Remaining: user visual review on /catalog with real data. Changes uncommitted.
  cixci_celery left stopped after Docker restart; backend needed one restart
  (bind-mount I/O error right after Docker start).

## TASK-016 — Make governed manual device mapping discoverable

- Status: completed
- Related features: CAT-002, CMP-001/002, UI-001; BR-CAT-003.
- Trigger: Nimbus9 bundle in Phone Attachments has an archived vendor model
  assertion and Feature Based category; the audit panel hides the model selector
  behind a nested setup/rules path, making the supported Hybrid workflow unclear.
- Acceptance: direct mapping-section entry to the existing category rule editor;
  no automatic global rule changes. Explicit Hybrid save reveals the searchable
  canonical picker immediately; selecting a different model saves its UUID while
  preserving raw vendor observations, exclusions and locks. Cancel/failure does
  not pretend mapping is enabled. Existing Universal/category flows remain valid.
- Plan: inspect product/config and callers → direct rule-editor action + scoped
  cache refresh → browser regression including cancel and different model → local
  frontend build/restart and memory validation. No dependencies or API/schema changes.
- Verified discovery: local Phone Attachments is active/feature_based with phone
  and smartwatch eligibility; the reported Flip8 bundle has an Archived assertion,
  not an exclusion/lock. Canonical Galaxy Z Fold8 is available. Reads only so far;
  physical Fold compatibility is the admin's assertion, not inferred from its name.
- Implementation: direct category-editor action, shared-rule scope notice and cache
  refresh; no bypass or automatic business configuration changes. Two new browser
  cases exercise different-device selection and safe cancelled/rejected edits.
- Verification: 13/13 browser tests, 19/19 isolated SQLite audit API tests, targeted
  audit UI/test lint and TypeScript/Vite/Docker builds pass. Initial run exposed a
  form-loading race in the test helper; fixed readiness check, full rerun passed.
  Local frontend image 400041945104 active, frontend/backend HTTP 200, DB/Redis
  healthy. Fresh inventory/memory check 0 errors/warnings; final diff reviewed.
- Remaining: none for the UI fix. Admin must explicitly save the shared category
  configuration and assert the desired canonical model; no automatic remap was
  performed. Follow-up changes are uncommitted; no push/live operations. TASK-014
  data repair and test VM verification remain separate and open.

## TASK-015 — Vendor product audit and onboarding

- Status: completed
- Related features: INT-002, CAT-001/002, CMP-001/002, NTF-001, UI-001.
- Acceptance: three separate local phase commits with specified titles/trailers,
  no push; audited vendor activation/distributor fallback; admin audit APIs,
  notifications, responsive comparison and mapping/review UI with tests.
- Approved clarifications: new brand links are authorized_distributor; inactive
  approvals/suspended vendors remain inactive. Feature Based manual mapping requires
  explicitly configured Hybrid, not per-product override. Universal product option
  uses explicit approved types and does not change business category.
- Implementation: phase 1 commit 86cd89d; phase 2 commit 5e1d544; phase 3 adds
  VendorAuditTab/category drawer/shared picker, governed rule editor entry, explicit
  Universal controls and normal canonical mapping validation. Category fields/scope
  save in one PATCH; invalid mapping requests roll back. Locks/exclusions/history
  remain authoritative; future pending selections have a separate response.
- Verification: 26/26 manage.py test (SQLite), 26/26 dedicated PostgreSQL, 11/11
  npm test browser cases; targeted new-UI lint and production frontend builds pass.
  Real local admin audit list/stats 200 and scoped Telco/Kaseory brand API/UI pass.
  No dependencies, migrations, provider jobs or remote deployments introduced.
- Limitations: pre-existing 14 import regressions (ISSUE-013); image/source gaps
  (ISSUE-014) and remote test access remain TASK-014, not hidden completion claims.
- Remaining: none for the audit feature; optional user review and TASK-014 follow-up.

## TASK-014 — Repair Balaji buyer brand/category/device mapping

- Status: in_progress
- Related features: CAT-001/002, CMP-001/002, INT-002, DEV-002, MED-001, UI-001.
- Acceptance: source-backed provider mappings, scoped buyer results, accurate device
  compatibility/images and audited repair; no invented universal scope or relaxed gates.
- Evidence: official docs/OpenAPI plus bounded authenticated read succeeded. Early
  replay applied 1,794 saved rows; subsequent source/database changes came from later
  commits. Latest local read-only audit: 1,220 products, 1,201 primaries with zero
  missing local files, 19 no primary, 574 unlinked source rows, 657 source reviews;
  1,774 source snapshots contain image URLs. See ISSUE-013/014 before a new sync.
- Buyer verification: Telco ZIZO/Nimbus9/CLICK 77/40/4; Kaseory 122/146/181. Both
  scoped dropdown selections show results in real local browser checks. This does
  not certify every mapping against provider truth.
- Existing concerns: current resolver can create guessed devices/Universal records
  and pick ambiguous matches; baseline 88 passed/14 failed at c6031c3. Media storage
  persistence/retry gaps are source-verified. Do not silently change these policies.
- Target restriction: local plus explicitly authorized test environment only. Never
  touch live. Direct SSH failed publickey; user has GCP browser SSH, not connected
  here. Guarded read-only test diagnostic script prepared and syntax-checked only.
- Remaining: obtain test diagnostic output; resolve import/device provenance and
  media persistence/retry issues with regressions, then run a controlled local
  provider resync and verify images/buyer results. Never start restored global jobs.
- Recovery: private artifacts under .local-copy/balaji-buyer-fix; credentials must
  stay ignored. Earlier long notes are archived in history/TASK-014-prior-session.md.

## TASK-011 — Rebuild and restart the local backend/frontend

- Status: completed
- Related features: UI-001; operations only, no application behavior change.
- Modules: local-copy Docker Compose backend/frontend.
- Acceptance: Docker engine reachable; both images rebuild successfully; both
  containers restart using those images; frontend and backend HTTP checks succeed.
- Plan: inspect running stack → build backend/frontend → force-recreate only those
  services → verify container/image state and HTTP responses.
- Dependencies: existing Docker engine, local-copy DB/Redis and current source.
- Verification status: Docker 29.2.1 reachable; both images built and containers
  force-recreated successfully. Running image IDs match the rebuilt image tags.
  Frontend GET 200; backend login OPTIONS 200; protected catalog GET 403 as
  expected without authentication. PostgreSQL/Redis remained healthy.
- Remaining work: none for rebuild/restart. Existing Vite bundle-size warning is
  nonblocking. No application changes, new tests, migrations or provider jobs.
- Evidence: .local-copy/operations/rebuild-backend-frontend.log and restart-smoke.json.

## TASK-001 — Initialize repository agent memory

- Status: completed
- Related features: MEM-001; discovery covers all 30 feature records.
- Modules: all implemented apps, frontend shell, deployment and repository instructions.
- Acceptance: requested documents exist; major modules have source-backed guides;
  APIs/schema/features have navigable evidence; rules distinguish requirements from
  implementation; agent workflow is mandatory; reference checks and limitations recorded.
- Plan: inventory → inspect module groups and persist evidence → write registries and
  guides → merge instructions → validate → finalize handoff.
- Dependencies: existing source, tests, architecture ADRs; no new dependencies.
- Verification: 8/8 memory tests; fresh-inventory validation 0 errors/warnings;
  diff/scope review passed. Existing application baseline 55 passed/2 failed;
  Django check passed; migration drift recorded. See VERIFICATION.md.
- Remaining: none for memory initialization. Unverified runtime/release areas and
  existing defects are explicit pending TASK-002–008, not concealed completion claims.

## TASK-002 — Verify and repair audit spine creation/filter defects

- Status: pending
- Related features: AUD-001; ISSUE-001/002.
- Modules: audit and domain evidence consumers.
- Acceptance criteria: first creation succeeds; subsequent mutations remain blocked;
  import/export filters use approved directions; tenant isolation preserved.
- Dependencies: clarify file-direction meaning; inspect callers and bulk-write paths.
- Verification status: source findings only; no fix/regression added.
- Remaining work: focused reproduction, targeted repair and creation/filter tests.

## TASK-003 — Clarify and repair legacy PO finalization

- Status: pending
- Related features: PRO-001, ORD-001/002, FUL-001, PRC-001; ISSUE-003.
- Modules: procurement/shared API, routing, fulfillment and pricing.
- Acceptance criteria: approved delivery/evidence sequence, valid timestamps,
  real shipping data, per-line pricing and rollback/retry behavior.
- Dependencies: owner resolution UQ-003; TASK-006 fixtures to reach the flow.
- Verification status: source defects documented; baseline test fails earlier.
- Remaining work: trace approved/manual/API paths and add failure regressions.

## TASK-004 — Review tenant authorization and credential/docs exposure

- Status: pending
- Related features: TEN-001, AUTH-001, INT-001, ANA-001, LCH-001; ISSUE-004/005/008.
- Modules: tenant, shared APIs, analytics/launch, keys and schema views.
- Acceptance criteria: approved audience/inactive membership behavior; two-company
  read/mutation/docs/key matrix; approved key lifecycle preserved.
- Dependencies: owner resolution UQ-001/004 and key display/storage policy.
- Verification status: source patterns confirmed; access/exploit matrix unexecuted.
- Remaining work: reproduce reachability, clarify policy and add targeted regressions.

## TASK-005 — Resolve notification scope and precedence

- Status: pending
- Related features: NTF-001; ISSUE-006.
- Modules: notification, tenant identity and event consumers.
- Acceptance criteria: independent company/entity/recipient preferences and approved
  legal/required/source-policy/quiet-hours/digest precedence.
- Dependencies: owner decisions UQ-005; producer/recipient traces.
- Verification status: source query/identity gaps; no repair attempted.
- Remaining work: multi-company/recipient tests and approved ladder repair.

## TASK-006 — Restore baseline checks and resolve migration index drift

- Status: pending
- Related features: PRO-001, INT-001/004; ISSUE-009/010.
- Modules: PO/schema test fixtures and integration commerce model/migration names.
- Acceptance criteria: selected baseline passes against intended contracts;
  migration dry run clean or reviewed compatible migration plan.
- Dependencies: preserve business rules; analyze PostgreSQL/index compatibility.
- Verification status: 55 passed/2 failed; Django check passes; migration check fails.
- Remaining work: fixture/auth test diagnosis, real orchestration coverage and
  explicit index-name decision without unapproved live schema changes.

## TASK-007 — Reconcile partial features and performance coverage

- Status: pending
- Related features: CMP-001, DEV-002, NTF-001, ANA-001, LCH-001; ISSUE-007/012.
- Modules: event producers, analytics/launch and large shared handlers.
- Acceptance criteria: accepted spec/implementation gap list, source-to-delivery
  traces, launch coverage plan and measured performance targets before refactoring.
- Dependencies: UQ-004/006 and prioritized business scope; TASK-004 isolation review.
- Verification status: major boundaries inspected; exhaustive branches/reports unverified.
- Remaining work: prioritize approved tasks, profile and add missing module coverage.

## TASK-008 — Verify deployment/providers in an authorized environment

- Status: pending
- Related features: MED-001, INT-002/003/004, UI-001; ISSUE-011.
- Modules: operations/settings/Compose, storage, workers/beat/provider clients.
- Acceptance criteria: known safe target, applied schema reviewed, correct queue/
  eager configuration and controlled storage/email/carrier/provider flows.
- Dependencies: authorized target/credentials/provider effects; no live background
  job or production data operation is authorized by TASK-001.
- Verification status: source topology inspected; live operation untested.
- Remaining work: full backend/PostgreSQL/frontend checks and controlled end-to-end run.

## TASK-009 — Production bugfixes (Balaji onboarding blockers)

- Status: completed
- Modules: docker-compose.prod.yml, settings, catalog_import, apiClient.ts, media
- Completed items:
  - Docker env var injection (VENDOR_CATALOG_ENCRYPTION_KEYS)
  - Celery queue configuration (vendor_catalog, vendor_commerce)
  - Celery-beat service with DatabaseScheduler
  - Brand filter auto-registration during vendor API sync
  - JWT session fix: ROTATE_REFRESH_TOKENS=False + proactive frontend refresh
  - JPEG/JPG image acceptance alongside PNG
- Tests: 16 new media validation tests, all passing
- Verification: must test against prod DB clone before push

## TASK-010 — Client issue backlog (Nov 2026 video feedback)

- Status: in_progress
- Related: memory `project_client-issues-nov2026.md`
- Reference docs: `docs/CIXCI_Product_Data_Normalization_*.docx`,
  `docs/CIXCI_Category_Governance_*.docx`
- Subtasks (priority order):
  1. ~~Product data normalization service~~ — DONE
  2. ~~Category governance~~ — DONE (config + DB mapping + notifications)
  3. ~~Color mapping configuration~~ — DONE
  4. ~~Multicolor support~~ — DONE
  5. ~~Missing device notifications~~ — DONE
  6. ~~Weight unit fix~~ — NOT A CODE BUG (Balaji sends weight_oz; model default is oz; we don't override)
  7. ~~Clearance marking~~ — DONE: backend model + frontend display/edit
  8. ~~Series field~~ — DONE: ManageProductDialog + ProductFormDialog
  9. ~~Short description enforcement~~ — DONE: normalization service
  10. ~~Existing product batch revalidation~~ — DONE: backend + frontend
- Dependencies: normalization spec doc rules, category governance doc rules
- Acceptance: each subtask needs tests; tenant isolation preserved; no auto-generated
  business rules

## TASK-012 — Balaji test server: client video issue fixes

- Status: in_progress
- Related: TASK-010
- Modules: catalog_import.py, catalog_config.py, media/views.py, media/utils.py,
  compatibility_import.py, catalog/api.py, batch_activate_products.py
- Changes in repo (ready for deploy):
  1. `_NULLABLE_TEXT_FIELDS` sanitization in catalog_import.py (prevents None rejection)
  2. Broadened retry in catalog_import.py (strips non-essential failing fields)
  3. weight_unit default REMOVED (Balaji sends weight with unit as-is)
  4. Keyword category refinement (`_keyword_refine_category`) for "Other Accessories"
  5. Compatibility fallback: auto-assigns universal_device_type on parse failure
  6. "universal" compatibility resolves to all device types (phone/tablet/smartwatch)
  7. MediaProxyView serves files directly from disk (local storage)
  8. `media_short_url()` always returns proxy path `/api/img/<base62>`
  9. Buyer visibility media gate: accepts JPEG alongside PNG
  10. `batch_activate_products` sets selling_status="for_sale" alongside status="active"
- Test server fixes applied (via scripts, not git):
  - Connection config: 5 new category mappings added
  - fix_all_orphans.py: 98 products created + normalization
  - fix_remaining.py: 76 more products created (progressive retry)
  - Final: 1791 products, 4 orphans (3 wholesale>MSRP, 1 dup SKU — Balaji data)
- Client issues resolved:
  1. Wrong categories → FIXED (keyword refinement for "Other Accessories")
  2. Missing products → FIXED (178→4 orphans, all data errors)
  3. Series not showing → FIXED
  4. Weight → NOT A BUG (comes from Balaji as-is)
  5. Warranty text in descriptions → FIXED (normalization strips warranty/vendor text)
  6. Wearable Tech empty → FIXED (keyword refinement)
  7. Images not displaying → FIXED (MediaProxyView serves from disk, proxy URLs)
  8. Buyer product visibility → FIXED (JPEG accepted in media gate, compatibility fallback)
  9. Device compatibility "universal" → FIXED (resolves to all device types)
  10. Compatible products for devices → FIXED (fallback universal_device_type mapping)
- Remaining: deploy repo code, run batch_activate_products, resync Balaji catalog,
  verify buyer visibility, address 4 data-quality orphans with Balaji

## TASK-013 — Missing Devices admin panel (UI + API)

- Status: completed
- Related: TASK-012, TASK-010 subtask 5
- Modules: catalog/api.py, frontend/pages/catalog/MissingDevicesTab.tsx, CatalogPage.tsx
- Backend:
  - `MissingDeviceViewSet` registered at `/catalog/missing-devices/`
  - `list`: aggregates missing device names from NotificationRequest payloads,
    deduplicates against existing Device Catalog, auto-suggests manufacturer and
    device type, returns manufacturer/device-type lookup lists
  - `add_device`: creates Device (or reuses existing), bulk-creates
    ProductCompatibilityAssertion for all matching VCIs, writes audit log
  - `dismiss_device`: removes device name from notification payloads
- Frontend:
  - `MissingDevicesTab.tsx`: table of unresolved vendor device names with alert counts,
    suggested manufacturer/type, "Add" button opens dialog with manufacturer picker,
    device name, device type; "Dismiss" button for false positives
  - Wired into CatalogPage as admin-only "Missing Devices" tab
  - Import alerts banner "Missing Devices" chip now clickable → navigates to tab
- Tests: TypeScript compiles clean
- Remaining: test on dev server with real Balaji data; run add_missing_devices or
  use the UI to add the 105 unmatched devices
