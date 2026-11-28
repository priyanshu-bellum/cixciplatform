# Memory changelog

Historical implementation changes belong in Git history and existing release guides;
they are not reconstructed as newly verified facts here. Add meaningful entries
chronologically with task, reason, files/features/contracts, verification and risk.

## 2026-11-21 — TASK-015 — Phase 1 vendor onboarding

- Reason: explicit Vendor Product Audit specification; new distributor fallback
  type separately confirmed by user. Draft/pending_setup vendors activate on admin
  connection create, draft vendors during authorized sync. Inactive decisions persist.
- Files: integration/catalog_onboarding.py (shared audit policy), catalog_api.py,
  catalog_sync.py, catalog_import.py, catalog_config.py; test_vendor_import_phase1.py;
  historical brand migration test now builds a legacy product rather than ingesting
  through the deliberately changed onboarding path. Source parser receives None.
- Features: INT-002, CAT-001, CMP-002; BR-INT-002. Template 200 rows/page, 100,000/day;
  configurable ceiling 500 rows/page. No schema/new dependency/public route change.
- Verification: requested manage.py test: 7/7 passed, Django check clean. Broader
  run: 94 passed/15 failed; isolated starting commit: 88 passed/14 failed. The one
  new failure was a historical fixture relying on no auto-link, updated as above.
  Recheck result recorded in TASKS. The other 14 are pre-existing ISSUE-013.
  Memory validator: no errors, fresh-inventory warning; git diff --check passed.
- Startup snapshots compacted; old claims retained as clearly historical notes.
  No test/live server changes or push. TASK-014 image/server follow-up remains.

## 2026-11-21 — TASK-015 — Phase 2 vendor product audit APIs

- Reason: admins need source/system comparison and deliberate mapping/review tools.
- Files: catalog/api.py, new catalog/vendor_audit.py, new integration/
  catalog_notifications.py and catalog_sync.py; test_vendor_audit_api.py; affected
  catalog API/schema and notification API references and curated memory/ADR-0019.
- Features: CAT-002, CMP-001/002, INT-002, NTF-001. Six product audit routes added;
  no schema/dependency change. Source comparisons use connector field paths; read
  payloads are redacted. Status filters run before bounded numbered pagination.
- Single/bulk device changes use existing canonical command; UUID/limit validation,
  explicit partial failure details, exclusion/lock preservation and audit evidence.
  Explicit review clears retain old errors in audit and invalidate projections.
  Active admins receive in-app review links; WebSocket push follows commit.
- Verification: manage.py test tests.test_vendor_audit_api
  tests.test_vendor_import_phase1 --noinput: 20/20 passed, system check clean.
  Fixture setup explicitly approves type/category and uses real dates. Dedicated
  PostgreSQL 20/20 passed after final lock ordering correction; fresh inventory
  validates with 0 errors/warnings. Prior catalog schema metadata drift refreshed,
  including already-existing VendorColorMapping/Product fields. ISSUE-013 persists.

## 2026-11-21/22 — TASK-015 — Phase 3 vendor audit UI and editing fixes

- Trigger: admin category quick edits failed required compatibility validation;
  Feature Based manual model writes could save ineffective evidence. The user
  explicitly chose governed Hybrid configuration and requested Universal controls.
- Result: admin-only Vendor Audit tab/deep links, vendor/brand/search/status filters,
  comparison/stats, single/bulk mapping/review and category/color actions. Category
  selection opens a side panel collecting required/conditional answers and explicit
  scope before one validated PATCH. The existing rule editor opens the target
  category. No automatic global rule change or per-product manual override.
- Product Universal is available independently of category, requires deliberate
  approved type selection and does not create an unrelated category override.
  Audit mappings use ordinary canonical validation; invalid type/lifecycle choices
  roll back. Pending future and protected mapping results are distinguished.
- Files: VendorAuditTab/CategoryDrawer/DevicePicker/vendorAuditData, CatalogPage/index,
  DropdownManagerDialog, frontend package test script/fixture harness, Node/CDP test
  tools; small audit DTO/service/test extensions. Memory/ADR-0019/BR-CAT-003 updated.
  Test-only read-only VM diagnostic script and LF attribute added; not run remotely.
- Verification: final backend Django runner 26/26, dedicated PostgreSQL 26/26,
  browser UI 11/11, targeted new-UI lint, TypeScript/Vite/Docker build and memory
  checks. Local admin GET audit/stats 200; real Telco/Kaseory scoped brand API/UI
  passed. Exact results/limits in VERIFICATION.md. No dependencies or migrations.
- Remaining: ISSUE-013/014 and TASK-014 import/image/server follow-up. No push or
  test/live deployment; no claim that the full pre-existing suite is green.

## 2026-11-22 — TASK-016 — Direct manual model mapping setup

- Trigger/root cause: Phone Attachments is Feature Based; imported explicit model
  evidence is Archived under that rule. The audit picker was gated correctly but
  its category/rules editing path was too indirect for the reported Nimbus9 bundle.
- Change: mapping section opens the existing category editor directly. Explicit
  Device Specific/Hybrid save refreshes config/audit/compatibility consumers and
  reveals the canonical picker; shared rule scope is disclosed in both places.
  No automatic category-mode change, per-product bypass or guessed device match.
- Files: VendorAuditTab.tsx, DropdownManagerDialog.tsx, VendorAuditTab.test.tsx,
  vendor-audit-browser.mjs; affected feature/module/map/state/handoff/verification
  records. Mechanical catalog consumer reference refreshed for the new test caller.
- APIs/database: unchanged contracts/schema; no actual source/product/category
  mutations during diagnosis or tests. Manual choices retain raw source payload.
- Verification: 13/13 browser tests including different Fold8 model, cancellation
  and rejected rule save; 19/19 audit API tests in SQLite. Targeted UI/test lint,
  TypeScript/Vite/Docker builds, fresh inventory memory validation and diff check
  pass. Initial UI run was 12/13 due to test-input readiness, corrected and rerun.
- Local frontend image 400041945104 active; frontend/backend HTTP 200, DB/Redis
  healthy. No new dependency, commit, push or remote deployment in this follow-up.
- Risks/remaining: global rule edits affect all products in that category; admin
  must deliberately save Hybrid and confirm physical model compatibility. TASK-014
  import/media issues and remote verification remain open.

## 2026-11-19 — TASK-001 — Repository memory initialization

- Reason: agents need persistent source-backed context across independent/reset sessions.
- Changes: merge mandatory workflow into AGENTS.md; add CLAUDE.md; create requested
  docs/ai-context startup, architecture/map/feature/schema/API/rule/decision/issue/task
  records and 16 module/concern guides; add 30 mechanical schema/API references.
- Tool files: scripts/ai-context-inventory.py, render-ai-context-reference.mjs,
  validate-ai-context.mjs, ai-context.test.mjs. No dependencies added.
- Features: MEM-001; discovery maps 30 feature records across all 14 Django apps and SPA.
- Database/API: no application change, migration or public contract change. Export
  describes definitions/routes only. Existing catalog_import.py user change preserved.
- Verification: read-only inventory succeeded; selected baseline 55 passed/2 failed;
  Django check passed; migration dry run found two index-name differences. Final
  memory-specific validation results are recorded in VERIFICATION.md.
- Memory verification: eight tooling tests pass; fresh inventory validation passes
  with no errors/warnings (1,143 links, 30 features, 131 models, 502 method/path pairs).
  Full scope/diff review and whitespace check passed; TASK-001 completed.
- Remaining risks: known issues are tracked, not repaired; deployed state/provider
  operation and full release verification remain unverified. Memory maintenance
  depends on agents following AGENTS.md and running checks; no background daemon,
  automatic commit or push was installed.

## 2026-11-19 — TASK-011 — Local backend/frontend rebuild and restart

- Reason: explicit user request to check Docker and rebuild/restart both services.
- Action: verified Docker 29.2.1 and local-copy topology; built backend/frontend;
  force-recreated only those services with --no-deps. No application files changed.
- Affected features: UI-001 and local operational environment; no API/schema change.
- Files updated: TASKS.md, CURRENT_STATE.md, SESSION_HANDOFF.md, this changelog and
  modules/operations.md. Existing user source changes preserved.
- Verification: frontend TypeScript/Vite build passed; running container image IDs
  matched rebuilt tags; frontend GET 200, backend login OPTIONS 200, unauthenticated
  catalog GET 403; DB/Redis remained healthy. Memory validator passed without a
  fresh structural inventory; no new tests added for this operational task.
- Remaining risk/limitations: nonblocking Vite large-chunk warning; authenticated
  business flows and historical source changes were not re-audited during restart.

## 2026-11-27 — TASK-017 — Product catalog UI redesign

- Reason: explicit user request with reference images; keep all displayed data.
- Files: frontend/src/pages/catalog/productCatalog.css (new), ProductCard.tsx,
  ProductFilterBar.tsx, CatalogPage.tsx, AllProductsTab.tsx, CompatibilityTab.tsx,
  dialogs/ManageProductDialog.tsx. Features UI-001/CAT-001 presentation only.
- Contracts: no API, schema, business-rule or dependency change. Category filter
  is now chips writing the same filterCategories state/URL parameter.
- Verification: tsc -b clean; no new lint categories; mock-harness screenshots in
  light/dark for admin, buyer and vendor; dev compose frontend rebuilt and serving.
- Risk: not exercised against real catalog data in an authenticated browser;
  legacy admin-* card CSS classes were removed (no other consumers found).
## 2026-11-27 — TASK-018 — Device Catalog UI redesign

- Reason: explicit user request following TASK-017.
- Files: frontend/src/pages/DevicesPage.tsx, frontend/src/pages/devices/DeviceCards.tsx,
  frontend/src/pages/devices/deviceCatalog.css (new). Presentation only.
- Contracts: no API, schema, rule or dependency change; filters use existing state.
- Verification: tsc -b clean; mock-harness screenshots; dev frontend rebuilt/serving.
- Risk: not exercised with real device data in an authenticated browser.
## 2026-11-28 — TASK-019 — App-wide UI polish

- Reason: explicit user request; no logic changes allowed.
- Files: theme/components.ts, components/AppLayout.tsx, data-display/StatCard.tsx,
  pages/DashboardPage.tsx, pages/NotificationsPage.tsx, DevicesPage.tsx and the
  TASK-017/018 style files. Devices list query now debounces search and keeps
  previous data while refetching (display behaviour only; same endpoint/params).
- Verification: tsc -b clean; admin screenshots of all routes on the local stack.
- Risk: buyer/vendor sessions not yet reviewed; theme radii apply app-wide.
- 2026-11-28 follow-up (TASK-019): compact ProductCard and Vendor Audit workspace
  redesign in catalog/ProductCard.tsx, productCatalog.css, VendorAuditTab.tsx and
  VendorAuditDevicePicker.tsx. Presentation only; 13/13 browser tests pass.

## 2026-11-28 — TASK-020 — Vendor Audit selections and compatibility batching

- Reason: client report that category rules did not change a former Universal
  product's devices; user request to optimise device/category/vendor-sync paths.
- Files: see SESSION_HANDOFF. Contract: vendor-audit `device_assertions[]` gains
  boolean `explicit` (additive); buyer-facing device_compatibility is unchanged.
  New helpers run_devices_remapping, flush_mapping_changes, known_devices,
  explicit_selections, prefetch_vendor_images; optional `records`, `catalog`,
  `prefetched`, `cache`, `fetched` arguments on existing functions.
- Features: CMP-001/002, CAT-002, INT-002, DEV-002, MED-001, UI-001; BR-CAT-004.
  No schema, dependency, route or matching-rule change.
- Verification: recorded in TASK-020.
- Risk: product bulk recalculation now marks buyer projections for lazy refresh
  instead of recalculating each one per product; a shared controlled-value catalog
  is reused inside one batch transaction; image downloads use worker threads.

## 2026-11-28 — TASK-021 — EasyPost carrier tracking and vendor shipment contract

- Reason: explicit user request (EasyPost for CSV vendors, admin key screen, Balaji
  shipment webhook review, buyer visibility).
- Files, schema and API: see TASK-021 and SESSION_HANDOFF. Migration fulfillment
  0011 creates four tables and changes no existing column. No new dependency.
- Features: FUL-001, INT-003, ORD-001/002, NTF-001, UI-001; BR-FUL-001.
- Verification: full backend suite in the backend image (SQLite test settings)
  980 passed/55 failed; the 55 are the same set that failed before TASK-020.
  Django check clean; makemigrations --check clean for fulfillment. tsc -b clean;
  eslint clean on the new panel, unchanged counts on IntegrationPage/OrdersPage.
  Admin panel driven in headless Chrome against fixture APIs (save, test, secret,
  retry; light and dark/narrow, no console errors); temporary harness removed.
  Fresh SQL-blocked inventory: memory validator 0 errors, 0 warnings.
- Risk: buyer-signals list is now tenant scoped (previously unscoped); vendor
  shipment handling was consolidated into apply_vendor_shipment for webhook and
  poll; nothing here has run against EasyPost or Balaji.

## 2026-11-28 — TASK-022 — Device type eligibility is data-driven

- Reason: user chose to let newly added types (Laptop) take part in compatibility.
- Files and rule: see TASK-022; BR-CMP-002 supersedes the fixed three-type list.
  No schema, route or dependency change.
- Verification: 985 passed/55 failed (same 55 as baseline); 5 new tests.
- Risk: a type activated by mistake becomes selectable in category rules at once;
  matching still needs a category to list it. Provider auto-created devices are
  still typed Phone.
- Also 2026-11-28: fulfillment 0011 applied to the local copy database only, at the
  user's request; local backend/frontend restarted and checked with an admin login.

## 2026-11-28 — TASK-023 — No device auto-creation from provider names

- Reason: explicit user decision. Rule BR-INT-003; details in TASK-023.
- Verification: 989 passed/55 failed (same 55 as baseline); 4 new tests.
- Risk: until an admin adds a missing device, products that declare only unknown
  models have no device mapping and are not buyer-visible for that device.

## 2026-11-28 — TASK-024 — Missing Devices resolve flow

- Reason: explicit user request. Schema: catalog 0047 (one new table). Details and
  verification in TASK-024; rule BR-INT-003 unchanged.
- Risk: add_device may create a manufacturer the admin types; the list imports
  names from earlier alerts on first load.
