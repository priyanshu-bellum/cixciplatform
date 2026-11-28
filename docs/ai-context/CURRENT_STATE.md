# Current state

Active task: TASK-019 — in_progress.

TASK-024 (2026-11-28, completed, uncommitted): Missing Devices is backed by
VendorDeviceMapping (catalog 0047, applied to the local copy only); adding or
linking a device maps the declaring products, clears their review flag and is
reused by later syncs. Page rewritten.

TASK-023 (2026-11-28, completed, uncommitted): provider device names that are not
in the Device Catalog are no longer auto-created; they go to Missing Devices
(BR-INT-003). Earlier auto-created devices were not touched.

TASK-022 (2026-11-28, completed, uncommitted): any Device Type an admin sets Active
can be listed by a category and matched (BR-CMP-002); the fixed phone/tablet/
smartwatch list now only scopes a provider's bare "Universal". Local stack is up
(backend 8000, frontend 5173, db, redis; celery deliberately stopped) with
fulfillment 0011 applied to the local copy.

TASK-021 (2026-11-28, completed, uncommitted): EasyPost carrier tracking for
CSV-uploaded shipments with an admin screen (Integrations → Carrier Tracking), a
signed webhook receiver and a polling safety net; Balaji shipment events now follow
the documented contract and reach the buyer. Migration fulfillment 0011 is NOT
applied anywhere. No EasyPost or Balaji call was made; see TASK-021 for what a
real key must still prove.

TASK-020 (2026-11-28, completed, uncommitted on branch perf/compat-sync-and-audit-seeding):
Vendor Audit no longer resubmits Universal/Feature matches as manual selections
(BR-CAT-004); compatibility mapping and audit writes are batched, device batches
reconcile each product once, vendor images download in parallel. Same 55
pre-existing backend failures before and after; 9 new backend and 1 new browser
test pass. Client server data not inspected; see TASK-020 for the review command.

TASK-019 (2026-11-28): app-wide presentation polish through the MUI theme, pill page
tabs scoped in AppLayout and a refreshed dashboard; admin routes verified on the
local stack, buyer/vendor sessions still to be checked. Uncommitted.

Earlier: TASK-018 — completed.

Latest change (2026-11-27): Device Catalog main view redesigned (TASK-018), same
presentation-only scope as TASK-017. Local dev frontend must be built with
--build-arg VITE_API_URL=http://localhost:8000/api/v1 or login requests miss the backend.

Earlier: TASK-017 — completed.

Latest change (2026-11-27): presentation-only redesign of the Product Catalog page,
ProductCard, ProductFilterBar and ManageProductDialog (see TASK-017). No API, schema,
rule or dependency change. tsc clean; dev compose frontend image fb494b1aac34 running
(frontend 200, backend 403 unauthenticated); celery container left stopped. Source
and docs are uncommitted; real-data visual review by the user is pending.

Earlier: TASK-016 — completed.

Latest fix (2026-11-22): Vendor Audit's mapping panel now has a direct Configure
manual mapping action into the shared category editor. The reported Nimbus9 bundle
is Phone Attachments/Feature Based with archived imported evidence. Explicit Hybrid
save reveals the canonical picker immediately; source payloads remain separate.
Preserves BR-CAT-003; no automatic global rule change or actual local product remap.
Checks: 13/13 browser tests, 19/19 audit API tests, targeted UI/test lint and frontend
TypeScript/Vite/Docker builds pass. Fresh inventory memory check: 0 errors/warnings.
Local frontend image 400041945104 is running; frontend/backend HTTP 200, DB/Redis
healthy. Follow-up source/tests/docs are uncommitted; no push or remote operation.

Updated 2026-11-22. Vendor Product Audit phases 1/2 are local commits 86cd89d and
5e1d544; phase 3 implements the admin tab, category/rule side panel, manual Hybrid
mapping and explicit per-product Universal controls. No push or VM deployment.
Use /catalog?tab=vendor-audit on local admin login; buyer roles remain excluded.

Earlier TASK-015 verification: 26 Django/SQLite + 26 isolated PostgreSQL + 11 browser tests
pass; targeted new-UI lint and frontend builds pass. Real local admin audit APIs
and Telco/Kaseory buyer API/UI pass. Fresh inventory/memory final gate is recorded
in VERIFICATION.md. No schema/dependency additions. Full suite is not green:
14 import regressions predate TASK-015 and remain ISSUE-013.

User-confirmed policy: new feed brand relationships are authorized_distributor.
Manual models require Device Specific/Hybrid; Feature Based rule changes are
explicit through the shared editor. Category changes collect required answers and
scope atomically. Universal is per product with deliberate approved types, never
an inferred all-types fallback. Global rules are not automatically changed.

TASK-014 remains open: latest local counts are 1,220 products, 19 without primary,
574 unlinked sources and 657 source reviews. Existing 1,201 local primaries have
files. Missing images cannot all be described as download failures. Telco/Kaseory
Balaji brand results are positive; every product mapping is not yet certified.
ISSUE-014 tracks media persistence/retry gaps. No fresh provider sync in TASK-015.

Live is explicitly out of scope. Test VM uses user browser SSH; direct laptop SSH
failed publickey. Uploadable test-only read-only diagnostic is ready, not executed
on VM. Earlier pending reviews remain in TASK-002–008, TASK-010/012. Source-backed
history is retained in [archive](history/TASK-014-prior-session.md).
