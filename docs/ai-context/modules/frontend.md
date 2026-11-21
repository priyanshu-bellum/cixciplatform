# Frontend application shell and consumers

Purpose: React SPA navigation, identity/server state, feedback/theme and domain UI.
Feature UI-001; domain features are mapped in FEATURE_REGISTRY.md.

TASK-015 / CAT-002: [VendorAuditTab](../../../frontend/src/pages/catalog/VendorAuditTab.tsx)
is visible only when is_cixci_admin is true, between API Import Review and Missing
Devices. `/catalog?tab=vendor-audit&vendor=<uuid>` works on initial load and when
following a notification while CatalogPage is already mounted. Vendor selection
lives in URL state; changing vendor resets the keyed workspace.

Audit queries include user/vendor/filter/page scope. Connector-derived vendor_values
avoid provider JSON coupling. Device drafts contain canonical UUIDs; exact-name
suggestions require a unique Device Catalog match and never create devices.
Single/bulk saves invalidate audit stats/lists and affected catalog caches. Partial
bulk failures stay selected for retry; errors/protected mappings are reported.
Category saves set the existing admin override so a later supplier sync respects it;
colors use approved active dropdowns. Breakpoints stack columns on small screens.

`npm test` now runs eleven real Chromium tests from
[VendorAuditTab.test.tsx](../../../frontend/src/pages/catalog/__tests__/VendorAuditTab.test.tsx).
Set CIXCI_QA_CHROME to an installed browser executable. The dependency-free
[runner](../../../scripts/run-vendor-audit-tests.mjs) uses installed TypeScript and
Node's test runner; [CDP helper](../../../scripts/vendor-audit-browser.mjs) intercepts
every API request with fixtures. Dedicated Vite config/entry avoids crawling the
entire SPA and is not a production route. No packages/browser downloads added.
Initial phase 3 checks passed 8/8; expanded 11/11 passed after category/Universal
steering. Final checks are recorded in VERIFICATION.md. Real local Telco/Kaseory
buyer brand UI also passed. Remote test/live remains unverified.

[VendorAuditCategoryDrawer](../../../frontend/src/pages/catalog/VendorAuditCategoryDrawer.tsx)
fetches full product fields, prompts required/conditional answers and explicit
Universal scope, then uses one validated PATCH. Universal-only edits do not create
an unrelated category override. Saving blocks backdrop dismissal; cancel restores
the displayed category. Existing DropdownManagerDialog accepts initialCategoryValue
to open the audited rule editor directly. User confirmation requires Hybrid for
Feature Based manual mapping; no per-product override or automatic global change.
Shared [device picker](../../../frontend/src/pages/catalog/VendorAuditDevicePicker.tsx)
filters by eligible type when provided. Catalog tabs scroll on narrow screens.

## Entry points, workflow and files

[main](../../../frontend/src/main.tsx) → [App](../../../frontend/src/App.tsx) →
[AppLayout](../../../frontend/src/components/AppLayout.tsx)/Sidebar → pages.
[apiClient](../../../frontend/src/lib/apiClient.ts) attaches JWT, coalesces refresh
requests and retries once. [authStore](../../../frontend/src/stores/authStore.ts)
logs in, fetches users/me, clears rejected tokens and handles logout.
App owns QueryClient cache/error handlers and visibility-triggered identity refresh.

Pages cover devices/catalog/pricing/orders/procurement/fulfillment/invoices/media/
images/notifications/analytics/integrations/launch/regions/company users/settings.
VendorCatalogPage is lazy and admin-gated. SettingsPage in StubPages is real company
management; filenames alone are unreliable. `/telco-cellular` is outside App's
RequireAuth route wrapper; inspect its own guards and API access before changing it.

## API, data, dependencies and rules

HTTP consumers use build-time VITE_API_URL, default local `/api/v1` base; no Vite
proxy is configured. [API registry](../API_REGISTRY.md) maps consumers and contracts.
No frontend database; Zustand stores identity, TanStack Query caches server data,
JWT access/refresh tokens live in localStorage. MUI/Emotion theme, Axios, Recharts,
XLSX/JSZip support feature pages. Backend remains permission/source authority.

BR-AUTH-001, BR-TEN-001, domain rules from each feature. Sidebar and RequireRole are
UX guards; server checks are required. Preserve user/entity scope in query keys,
cache invalidation after mutations, role-dependent fields and exact payload names.

## Tests, issues and precautions

Package scripts: dev/build/lint/preview; build runs tsc -b then Vite.
[CSV tests](../../../scripts/csv-preview.test.mjs), browser scripts including
[compatibility](../../../scripts/verify-compatibility-ui.mjs) and
[release runner](../../../scripts/verify-client-release.ps1) need supplied QA values.
No dedicated frontend unit test package script exists. ISSUE-008 localStorage/key
exposure review; large pages/shared handlers have ISSUE-012 coupling debt.
Do not install dependencies or run credentialed browser workflows for a docs-only
change. Frontend build/lint/browser checks were not run for TASK-001.
