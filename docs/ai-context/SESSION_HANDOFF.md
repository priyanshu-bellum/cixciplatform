# Session handoff

Active task: TASK-015 — in_progress.

Objective: implement the user's three-phase Vendor Product Audit spec, commit each
phase locally with the supplied message/trailer, never push. Read actual models;
reuse canonical commands and preserve tenant isolation/audit/exclusion history.

Checkpoint: phase 1 committed locally as 86cd89d; phase 2 code and tests implemented.
Twenty Django TestCase tests pass (13 audit API + seven onboarding). Models
call pending state pending_setup; brand canonical keys use normalized whitespace,
not new underscore identities. User explicitly confirmed new relationship type
authorized_distributor. Inactive brands/relationships and suspended vendors remain
inactive. A pre-existing importer one-line None parser change is part of this spec.

Next: phase 2 reviewed and ready for local commit. Dedicated PostgreSQL tests 20/20
pass after final Source → Product lock order correction; fresh inventory valid,
catalog/integration/notifications reference groups refreshed (0 errors/warnings).
Then build Vendor Audit tab, tests and third commit. No frontend test runner currently
exists (package has build/lint/dev/preview); no dependency installation authorized.

Commands: local-copy compose up --no-build; manage.py test
tests.test_vendor_import_phase1 with config.test_settings: 7 passed. Broad run
94 passed/15 failed; read-only isolated starting commit 88 passed/14 failed.
The one new failure was a historical migration fixture now fixed; focused recheck
passed 8/8. The same 14 baseline failures are tracked ISSUE-013, not a green release.
Memory validator passed without fresh inventory for phase 1; phase 2 fresh inventory
passes. Prior notification metadata drift reconciled against actual source.
No push or server deployment.

Previous work: TASK-014 saved-source replay succeeded; new images resync and remote
test diagnosis remain. SSH app-dev@VM failed publickey; user uses GCP browser SSH.
No remote changes made, no live access. Private QA credentials only in ignored
.local-copy artifacts; never print or commit them. Fresh local sync has not yet
been run by this resumed session. Latest Git was c6031c3; inspect status before
staging to preserve other changes. Historical notes: [archive](history/TASK-014-prior-session.md).
