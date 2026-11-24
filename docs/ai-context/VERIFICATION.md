# Memory verification and maintenance

## TASK-016 — Direct manual mapping setup — 2026-11-22

- Local read-only diagnosis confirmed Phone Attachments/Feature Based with an
  Archived, unlocked/nonexcluded imported assertion on the reported Nimbus9 bundle;
  Galaxy Z Fold8 exists/available in the canonical Device Catalog. No physical fit
  inferred, no real category setting or product mapping was changed by the agent.
- `npm test` with existing CIXCI_QA_CHROME: 13/13 pass, 55.30s. Two new cases cover
  direct category editing → explicit Hybrid → a different canonical Fold8 model,
  source payload preservation, cancel and rejected configuration save. Initial
  12/13 run exposed test helper input-loading race; added selector readiness and
  reran the full UI suite. Logs task016-ui.log and task016-ui-final.log are ignored.
- `DJANGO_SETTINGS_MODULE=config.test_settings python manage.py test tests.test_vendor_audit_api --noinput --verbosity 1`:
  19/19 pass, 6.49s. Existing API consumer regressions, no backend source changes.
- Targeted eslint on VendorAuditTab.tsx and its TSX test: exit 0. `npm run build`
  and local-copy frontend Docker build pass. Existing bundle/performance warnings
  are nonblocking; no full-repository lint or full release-suite claim.
- Only local frontend recreated; active image 400041945104, frontend GET/backend
  login OPTIONS 200, DB/Redis healthy. Served bundle includes direct mapping CTA.
- Fresh SQL-blocked inventory collected in inventory-task016.json. Initial memory
  gate detected catalog consumer metadata drift from the new test endpoint text;
  refreshed only catalog reference, reviewed diff, then 0 errors/warnings. No route,
  model or schema changed. Diff check passes. Scratch/logs/screenshots stay ignored.
- Scope: UI behavior tested with fixture-backed browser API; real data diagnosis
  read-only. Admin must explicitly save category rules before model selection.
  Source/tests/docs remain uncommitted follow-up changes; no push/live/test VM work.
  TASK-014 and ISSUE-013/014 are still open; do not claim all catalog data repaired.

## TASK-015 final audit feature verification — 2026-11-22

Phase 1 local commit 86cd89d; phase 2 5e1d544. Phase 3 follows with the requested
title and co-author trailer. No push, schema migration, dependency installation or
test/live VM operation. New category/Universal behavior is BR-CAT-003 / ADR-0019.

Executed in the existing local backend container, using isolated test databases:

```text
DJANGO_SETTINGS_MODULE=config.test_settings python manage.py test tests.test_vendor_audit_api tests.test_vendor_import_phase1 --noinput --verbosity 1
python -m pytest tests/test_vendor_audit_api.py tests/test_vendor_import_phase1.py --ds=config.compatibility_test_settings -o addopts= -q
```

Results: **26/26 Django tests**, **26/26 dedicated PostgreSQL tests**. Covers all
six admin audit actions, nonadmins with ordinary capabilities, vendor filtering,
pre-pagination status filtering, UUID/batch bounds, audit history, exclusions/locks,
explicit Hybrid requirement, category required answers/Universal scope, rollback
for invalid selections and pending future devices. Postgres target is the separate
test_cixci_compatibility database, not restored catalog data.

Frontend executed from frontend with existing Node/Chromium, no added packages:

```text
npm test
npm run build
node node_modules/eslint/bin/eslint.js src/pages/catalog/VendorAuditTab.tsx src/pages/catalog/VendorAuditCategoryDrawer.tsx src/pages/catalog/VendorAuditDevicePicker.tsx src/pages/catalog/vendorAuditData.ts src/pages/catalog/__tests__/VendorAuditTab.test.tsx
docker compose -f docker-compose.local-copy.yml build frontend
```

**11/11 browser tests** pass. The runner requires CIXCI_QA_CHROME, builds the TSX
test with installed TypeScript, drives real Chromium through CDP and fulfills API
requests with fixtures. Covers selection/comparison, add/remove/bulk mapping,
review/error handling, category/color save, required Speakers values, independent
Universal, explicit Hybrid rule editing, buyer guard and narrow dark layout.
Initial cold Vite startup and control-loading races were addressed by a dedicated
test entry/cache and selector readiness checks; failed attempts are retained in
ignored logs, not counted as passing. Targeted new-UI lint and frontend builds pass.
Pre-existing large-bundle warning remains nonblocking. Repository-wide lint/full
frontend/backend suites were not claimed as passing.

Final local frontend image 2a0c8685d5d2 is running after force-recreate; frontend
GET and backend login OPTIONS return 200. Local DB/Redis are healthy; backend uses
the current source bind. No worker/periodic provider jobs were started.

Read-only restored-local checks: admin audit list/stats HTTP 200 and all extended
DTO fields present; real buyer API/UI brand selections pass for Telco and Kaseory.
ZIZO/Nimbus9/CLICK counts respectively 77/40/4 and 122/146/181. Buyer admin tabs stay
hidden. These checks do not certify every mapping against supplier truth.

Local source/image diagnostics: 1,220 canonical products, 1,201 primary assets,
zero missing local primary files, 19 no primary, 574 unlinked source snapshots,
657 reviews; 1,774 source rows have image URLs. No fresh provider sync was run in
TASK-015. ISSUE-014 remains open. Test-only diagnostic script passes bash -n and
refuses an unexpected test bind/database; remote execution remains unverified.

Baseline comparison: read-only snapshot c6031c3 with networking disabled produced
88 passed/14 failed across older import/sync/mapping suites (ISSUE-013). Phase 1
broader run had 94 passed/15 failed; its one new failure was the historical brand
backfill fixture relying on the old no-auto-link ingestion path. Updated that
fixture to construct a legacy row directly; focused recheck 8/8 passed. The other
14 pre-existing failures are not hidden by new passing tests.

Memory: fresh SQL-blocked inventory refreshed affected catalog/devices/tenant/
notification references; validator and git diff --check pass. Eight memory-tool
tests passed. Ignored evidence: .local-copy/balaji-buyer-fix/phase3-*.log,
inventory-final.json and .local-copy/vendor-audit-ui/ screenshots/fixtures. Secrets
remain only in private ignored QA artifacts, never in this document.

The original initialization verification below is historical, not current counts.

This is the reproducible verification record for TASK-001 (2026-11-19), not a claim
of release readiness. Source baseline `main` / `0c5e2a5`; local catalog adapter WIP
was present before the task. No behavior, dependency, schema or deployment changed.

## Refresh and validate

Use the existing backend environment (Python/Django already installed). From
`backend/`, the inventory prints only source/model/route metadata:

```text
python ../scripts/ai-context-inventory.py > ../.local-copy/ai-context/inventory.json
```

Create the ignored output directory first. The script forces `config.test_settings`,
never invokes handlers/serializers/default callables or queries records, and installs
a SQL-blocking guard before metadata collection. It does not read settings values
into output. Inventory files are local scratch; do not commit raw operational data.

If using the already-running local backend container with `/app` bound to backend,
from PowerShell at repository root (write JSON as UTF-8, not default UTF-16):

```powershell
$inventoryText = Get-Content -Raw scripts/ai-context-inventory.py | docker exec -i cixci-local-copy-backend-1 python -
if ($LASTEXITCODE -ne 0) { throw 'Inventory failed' }
[IO.Directory]::CreateDirectory((Join-Path (Get-Location) '.local-copy/ai-context')) | Out-Null
[IO.File]::WriteAllText((Join-Path (Get-Location) '.local-copy/ai-context/inventory.json'), ($inventoryText -join "`n"), (New-Object Text.UTF8Encoding($false)))
```

After meaningful structural changes, render only the affected app/route group and
review its diff; human-authored documents are never overwritten by the renderer:

```text
node scripts/render-ai-context-reference.mjs .local-copy/ai-context/inventory.json integration
node scripts/validate-ai-context.mjs .local-copy/ai-context/inventory.json
node --test scripts/ai-context.test.mjs
```

Omit the final group argument only for an intentional full mechanical reference
refresh. `notification` selects its schema; `notifications` selects its route group.
`auth` and `platform` select route groups. Files removed/renamed by application
changes require a reviewed reference removal too; renderer does not delete files.

Without an inventory argument, validator checks local paths/links, feature/rule/
issue/dependency IDs, feature APIs/entities/tests against references, owned module
coverage and task/state/handoff consistency. A fresh inventory additionally checks
source fingerprints, all route methods, model counts, fields/relationships/constraints/migrations and
handler/policy/consumer metadata against freshly rendered text. It does not prove
business correctness, deployed schema, nested dynamic DTO completeness or live access.

## Executed application baseline

Working directory inside existing local backend container: `/app`. All commands
below used test settings/in-memory SQLite; no restored/live application DB targeted.

```text
python -m pytest tests/test_tenant.py tests/test_models_immutable.py tests/test_po_orchestration.py tests/test_celery_tasks.py tests/test_api_schema.py --ds=config.test_settings -o addopts= -q
```

Result: **55 passed, 2 failed in 31.22s**, exit 1. Failures:

- `test_end_to_end_orchestration_on_manual_approval`: fixture Product is compatibility
  incomplete under current PO line validation; fails before orchestration.
- `test_openapi_schema_endpoint`: plain Django schema view sees no authenticated
  session from DRF force_authenticate and returns 403.

Diagnostic log (ignored): `.local-copy/ai-context/backend-baseline.log`. ISSUE-009
tracks these failures; no fixture/application fix attempted for this docs task.

```text
python manage.py check
python manage.py makemigrations --check --dry-run
```

With `DJANGO_SETTINGS_MODULE=config.test_settings`, system check passed (0 issues).
Migration check exited 1: integration VendorFinanceRecord and VendorReturnRecord
generated index names differ from migration 0010. ISSUE-010; no migrations written.

Inventory collection succeeded: 124 owned models + 7 automatic M2M joins, 1,608
fields, 112 migration files, 310 API route patterns, 363 Python source files parsed.
Runtime metadata was collected without SQL, using checked-out source, not a DB dump.

## Memory-specific checks

- `node --test scripts/ai-context.test.mjs`: **8 passed, 0 failed**. Covers Django
  route normalization, registry parsing, schema relation/constraint preservation,
  targeted reference refresh without overwriting curated state, repository integrity
  and negative broken-link/dependency/endpoint/duplicate-ID/task-status cases.
- `node scripts/validate-ai-context.mjs .local-copy/ai-context/inventory.json`:
  **0 errors, 0 warnings**. Checked 63 Markdown documents (including root
  instructions), 1,143 relative links, 30 features, 131 models, 502 endpoint-method
  pairs, eight task records and all 14 owned app guides. Source fingerprint,
  schema/relationship/constraint/migration and active API handler metadata checks passed.
- `git diff --check`: passed. Original AGENTS.md text preserved; appended workflow
  reviewed. Curated documents/tools and representative generated API/schema sections
  reviewed; mechanical references checked completely against the fresh inventory.
- Scoped credential-pattern scan of new memory/tool files found no token/key values.
  This is a limited check, not a repository-wide secret audit.
- Git application diff remains only the pre-existing catalog_import.py change
  (13 insertions/2 deletions). No migration generated, dependency installed,
  application behavior changed, commit made or push performed by TASK-001.

During validation, corrected a guessed dropdown route and a nonexistent media
tasks-file link. Generated API references label dynamic querysets as undeclared;
they do not imply an absence of database use. Consumer matches are resource-path
text matches, not proof of all dynamic callers.

## Unverified areas and limits

- Full backend suite, PostgreSQL regressions, frontend type/lint/build/browser suites.
- Live API behavior for every route/action, dynamic serializers, complete role/
  tenant matrix and production permissions; generated declarations are partial.
- Applied/deployed migrations, real data integrity, queue/beat operation, provider
  catalog/dispatch/webhook/carrier/email/storage integration and production proxy/TLS.
- Complete approval provenance for financial/MAP/PO/notification rules.
- All binary reports and every historical module specification claim.
- Performance/security audit and every branch of large API handlers.

This initialization covers major source boundaries and end-to-end paths plus full
owned structural inventories. It is not a line-by-line behavioral audit of every
source file. Re-open relevant code and tests for every future task.
