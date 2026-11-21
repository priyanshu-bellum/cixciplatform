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
