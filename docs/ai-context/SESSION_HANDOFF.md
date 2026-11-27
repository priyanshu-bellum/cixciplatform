# Session handoff

Active task: TASK-019 — in_progress.

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
