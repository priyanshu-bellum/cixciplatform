# Session handoff

Active task: TASK-019 — in_progress.

Commit state (2026-11-28): TASK-020 to TASK-024 are on origin/main (3c1f8eb,
eee846d, 3b3bd52, a1cf653, f4fb534, 0df3689), pushed at the user's request. Notes
below that say "uncommitted" for these tasks predate those commits. TASK-025 is on
local branch fix/tenant-scope-and-test-baseline, not pushed: backend suite 1,055
passed, 0 failed (was 55 failed). It also fixes order acceptance for vendor JPEG
products and adds bulk compatibility values in Vendor Audit. TASK-026 is on the
same branch, not pushed: PostgreSQL-only cancellation fix, shipment packages,
shared CSV order progress, vendor image storage/retry, lazy buyer projections and
buyer webhooks (migrations fulfillment 0012, integration 0011).

TASK-024 (completed, uncommitted): catalog/missing_devices.py (new), catalog/
models.py + migration 0047, catalog/api.py (MissingDeviceViewSet), integration/
catalog_{compatibility,import}.py, frontend pages/catalog/MissingDevicesTab.tsx,
tests/test_missing_device_flow.py. Test and live servers need catalog 0047 and
fulfillment 0011 before this code runs there.

TASK-023 (completed, uncommitted): integration/catalog_compatibility.py,
integration/catalog_import.py, catalog/api.py (MissingDeviceViewSet),
tests/test_missing_device_flow.py. ISSUE-013's auto-create part is addressed in
code; its other failing tests are unchanged.

TASK-022 (completed, uncommitted): catalog/compatibility_{contract,engine,commands,
configuration}.py, integration/catalog_compatibility.py, management/commands/
audit_compatibility.py, tests/test_device_type_activation.py. Open owner question:
provider device names that do not exist are auto-created as Phone (ISSUE-013).

TASK-021 (completed, uncommitted): new backend fulfillment/{tracking.py,
easypost.py,tracking_api.py}, migration 0011; changed fulfillment/{models,api,
tasks,carrier_tracking}.py, integration/{webhook_handlers,webhook_receiver,
shipment_poll}.py, routing/api.py; tests test_carrier_tracking.py,
test_balaji_shipment_contract.py, test_shipping_import.py; frontend
pages/integration/CarrierTrackingPanel.tsx, IntegrationPage.tsx, OrdersPage.tsx.
Next: user applies migration on the intended database, sets VENDOR_CATALOG_
ENCRYPTION_KEYS (already required for vendor credentials), saves an EasyPost
test key, registers the webhook and runs one end-to-end shipment.

TASK-020 (completed, uncommitted): backend catalog/{api,vendor_audit,
compatibility_engine,compatibility_commands,compatibility_configuration,
compatibility_import}.py, management/commands/audit_compatibility.py,
devices/views.py, integration/{catalog_import,catalog_media,catalog_sync}.py,
tests/test_compat_selection_and_batching.py; frontend catalog/{vendorAuditData.ts,
VendorAuditCategoryDrawer.tsx,VendorAuditTab.tsx} and the browser test/fixture.
Tests run in the backend image: docker run --rm -v <repo>/backend:/app -w /app
-e DJANGO_SETTINGS_MODULE=config.test_settings cixci-backend:latest python -m pytest.
Next: user review, commit when asked, rebuild local images, then run
audit_compatibility on the client server. Local containers other than cixci_db
were left stopped.

TASK-019 files: frontend/src/theme/components.ts, components/AppLayout.tsx,
components/data-display/StatCard.tsx, pages/DashboardPage.tsx, NotificationsPage.tsx
plus size/flash fixes in the TASK-017/018 files. Next: get buyer and vendor test
logins from the user and review their pages; do not change logic.

Previous (TASK-018):

TASK-018 changed frontend/src/pages/DevicesPage.tsx (main view only) and added
frontend/src/pages/devices/{DeviceCards.tsx,deviceCatalog.css}. Uncommitted. Dev
stack: docker compose -f docker-compose.dev.yml, frontend build needs
--build-arg VITE_API_URL=http://localhost:8000/api/v1; celery left stopped.

Previous (TASK-017):

Changed: frontend/src/pages/catalog/{productCatalog.css (new), ProductCard,
ProductFilterBar, CatalogPage, AllProductsTab, CompatibilityTab}.tsx and
dialogs/ManageProductDialog.tsx. Presentation only. Next: user reviews /catalog on
the dev compose stack (docker-compose.dev.yml, port 5173); adjust styling on
feedback; commit only when asked. Reference images (*.webp in repo root) are the
user's untracked files. Then resume TASK-014.

Previous task notes (TASK-016, completed):

Current objective: direct "Configure manual mapping" action in Vendor Audit's
mapping panel, using the existing category editor. Phone Attachments is Feature
Based; reported bundle's imported model is Archived, not protected. Canonical
Galaxy Z Fold8 exists/available. Only local read-only diagnosis so far; do not infer
physical fit or silently change the shared category. Previous user policy requires
explicit Hybrid before manual models (BR-CAT-003).

Next: targeted frontend action + category/cache refresh; regression opens direct
editor, verifies cancel/no writes, explicitly selects Hybrid then different device
and saves canonical UUID. Build/recreate only local frontend; preserve no-push/live
constraints. See TASK-016; private diagnostic inspect-manual-mapping.py is ignored.

Prior completed work and verification (TASK-015):

Objective: three local audit feature commits with supplied titles and
Co-Authored-By trailer, never push. Phase 1 86cd89d; phase 2 5e1d544; identify phase
3 by git log title "feat: add Vendor Audit tab to catalog page" after final commit.
Inspect current status/HEAD before resuming; preserve any later user changes.

Implemented: audited activation/distributor fallback, six admin audit actions,
source-configured comparison DTO and notifications; Vendor Audit tab/deep link,
scoped filters, single/bulk mapping/review, shared picker, category side panel,
required fields and explicit Universal types. Existing rules editor can open a
target category directly. User explicitly chose Hybrid for Feature Based manual
mapping; audit command now uses normal validation. Invalid choices roll back;
pending future mappings and protected controls are reported separately.

Tests: manage.py test tests.test_vendor_audit_api tests.test_vendor_import_phase1
with DJANGO_SETTINGS_MODULE=config.test_settings: 26 pass. Same pytest selection on dedicated
config.compatibility_test_settings: 26 pass. npm test with existing CIXCI_QA_CHROME:
11 pass, APIs fulfilled by fixtures. Targeted new-UI lint/build pass. Existing
8 memory-tool tests passed. Raw logs remain ignored under
.local-copy/balaji-buyer-fix/phase3-*; VERIFICATION.md records final gates.

Local admin audit HTTP 200; real Telco buyer brand counts 77/40/4 and Kaseory
122/146/181 (ZIZO/Nimbus9/CLICK), dropdown selection not empty; admin tabs hidden.
Local frontend image 2a0c8685d5d2 includes final save/cancel and responsive tabs;
frontend GET/backend OPTIONS 200; DB/Redis healthy. Backend uses source bind.
No migrations, new packages, remote operations or push. Private credentials/tokens
only in ignored artifacts; never print them.

Inspected/changed source: catalog api.py/vendor_audit.py and tests; CatalogPage,
VendorAuditTab/CategoryDrawer/DevicePicker/vendorAuditData and DropdownManagerDialog.
Related module/feature/API/rule/ADR records contain the full file mapping. Commands:
test runners above; frontend build/lint, local compose build/up frontend, fresh
SQL-blocked inventory and node scripts/validate-ai-context.mjs. Requested phase
changes belong in the three local commits; recheck git status for later user work.

Next: optional user review at /catalog?tab=vendor-audit, then resume TASK-014.
TASK-014: 14 baseline import failures and 19 missing primaries/574 unlinked sources
remain. Inspect ISSUE-013/014; do not blindly replay into guessed device/Universal
records or auto-clear invalid rows. Test SSH auth failed; user browser SSH must run
scripts/diagnose-test-vendor-catalog.sh after upload. Script verifies test bind and
test DB then forces read-only SQL; no live work. Test output is needed before
claiming remote repair. Earlier history: [archive](history/TASK-014-prior-session.md).
