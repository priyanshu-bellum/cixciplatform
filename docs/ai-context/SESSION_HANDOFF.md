# Session handoff

Active task: TASK-015 — in_progress.

Objective: implement the user's three-phase Vendor Product Audit spec, commit each
phase locally with the supplied message/trailer, never push. Read actual models;
reuse canonical commands and preserve tenant isolation/audit/exclusion history.

Checkpoint: phase 1 implementation and seven Django TestCase tests added. Models
call pending state pending_setup; brand canonical keys use normalized whitespace,
not new underscore identities. User explicitly confirmed new relationship type
authorized_distributor. Inactive brands/relationships and suspended vendors remain
inactive. A pre-existing importer one-line None parser change is part of this spec.

Next: finish phase 1 checks and local commit, then implement admin audit list/stats/
single+bulk mapping/review endpoints and review notifications. Filter before
pagination; validate all UUIDs/limits and record review clears with old errors.
Then build Vendor Audit tab, tests and third commit. No frontend test runner currently
exists (package has build/lint/dev/preview); no dependency installation authorized.

Commands: local-copy compose up --no-build; manage.py test
tests.test_vendor_import_phase1 with config.test_settings: 7 passed. Broad run
94 passed/15 failed; read-only isolated starting commit 88 passed/14 failed.
The one new failure was a historical migration fixture now fixed; focused recheck
passed 8/8. The same 14 baseline failures are tracked ISSUE-013, not a green release.
Memory validator passes without fresh inventory. Phase 1 ready for local commit;
then implement phase 2. No push or server deployment.

Previous work: TASK-014 saved-source replay succeeded; new images resync and remote
test diagnosis remain. SSH app-dev@VM failed publickey; user uses GCP browser SSH.
No remote changes made, no live access. Private QA credentials only in ignored
.local-copy artifacts; never print or commit them. Fresh local sync has not yet
been run by this resumed session. Latest Git was c6031c3; inspect status before
staging to preserve other changes. Historical notes: [archive](history/TASK-014-prior-session.md).
