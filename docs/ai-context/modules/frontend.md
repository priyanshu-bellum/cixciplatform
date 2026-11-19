# Frontend application shell and consumers

Purpose: React SPA navigation, identity/server state, feedback/theme and domain UI.
Feature UI-001; domain features are mapped in FEATURE_REGISTRY.md.

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
