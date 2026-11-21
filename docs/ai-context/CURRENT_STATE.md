# Current state

Active task: TASK-015 — in_progress.

Updated 2026-11-21 at main/c6031c3 plus task changes. The user requested a vendor
product audit in three separately committed phases, with no push. Phase 1 adds
audited vendor activation and distributor-brand onboarding, raises configurable
limits and retains the explicitly requested vendor declaration parsing behavior.
Phase 2 audit APIs and phase 3 responsive admin UI follow. No schema additions planned.

Local-copy Docker is running. This environment is separate from test/live. The user
prohibited touching live. Direct SSH to the supplied VM failed publickey auth;
only browser SSH is available to the user, not connected to this agent.

TASK-014 has remaining image-sync/test-server follow-up. Earlier local saved-source
replay applied 1,794 rows (3 created, 1,104 updated, 756 review); later Git/database
changes occurred outside this task, so those are checkpoints, not current counts.
Telco/Kaseory buyer API results were positive after replay. Broad prior SQLite
129-test and PostgreSQL 16-test passes predate subsequent repository commits.
They must not be presented as verification of TASK-015.

Source and memory have drifted since initial inventory. Update affected reference
groups and record real checks during the new phases. Earlier pending reviews remain
in TASK-002–008, TASK-010/012 and KNOWN_ISSUES. Prior long session notes are retained
in [history](history/TASK-014-prior-session.md), not treated as current evidence.
