# Memory verification and maintenance

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
