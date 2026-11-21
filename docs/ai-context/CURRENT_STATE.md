# Current state

Active task: TASK-015 — completed.

Updated 2026-11-22. Vendor Product Audit phases 1/2 are local commits 86cd89d and
5e1d544; phase 3 implements the admin tab, category/rule side panel, manual Hybrid
mapping and explicit per-product Universal controls. No push or VM deployment.
Use /catalog?tab=vendor-audit on local admin login; buyer roles remain excluded.

Current verification: 26 Django/SQLite + 26 isolated PostgreSQL + 11 browser tests
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
