# Platform configuration, deployment and verification

Purpose: process entry/configuration, storage/cache/queue topology and safe local
verification. Related features UI-001, INT-002/003/004, MED-001, MEM-001.

## Entry points and files

[manage.py](../../../backend/manage.py), [WSGI](../../../backend/config/wsgi.py),
[settings](../../../backend/config/settings.py), [Celery app](../../../backend/config/celery.py),
[cache service](../../../backend/config/cache_service.py), [backend image](../../../backend/Dockerfile),
[frontend image](../../../frontend/Dockerfile), [Nginx SPA](../../../frontend/nginx.conf).
[dev Compose](../../../docker-compose.yml), [prod Compose](../../../docker-compose.prod.yml),
[local-copy Compose](../../../docker-compose.local-copy.yml). Existing setup/export
scripts can affect real databases/providers; inspect target and private environment first.

## Workflow, API and dependencies

Gunicorn serves Django; frontend Nginx serves SPA assets. Database, Redis and
configured cloud/email/provider endpoints are infrastructure dependencies.
No repo-proven complete production TLS/reverse-proxy topology. API entry points
and schema routes are in [platform reference](../reference/api/platform.md).
App tables plus framework/Celery tables share the configured database; see
[schema](../DATABASE_SCHEMA.md). No source-controlled secret values are needed here.

Celery beat schedule: catalog dispatch 60s; SLA/manual export 900s; buyer signals/
shipment dispatch 300s; lifecycle/finance 3600s; tracking 1800s; outbound retry 120s.
Dedicated vendor_catalog/vendor_commerce queues use durable job rows and after-commit
publication; ordinary .delay tasks may execute eagerly by default. Redis TTLs:
company/category mapping 300s, dropdown/capability 600s; signals cover some writes.

## Rules, security, tests and precautions

BR-TEN-001, BR-AUD-001, BR-INT-001 and AGENTS.md operational rules. Test settings use
in-memory SQLite/cache, eager tasks and disabled import URL fetch. Dedicated explicit
send_task bypasses eager behavior. compatibility_test_settings points to a dedicated
local PostgreSQL test DB; never substitute production. Default dev Compose PostgreSQL
16 differs from local-copy 18. Preserve this distinction in migration testing.

Checks/commands: [project overview](../PROJECT_OVERVIEW.md),
[verification record](../VERIFICATION.md), backend pytest and module-specific PS
scripts. Memory tooling uses existing Python/Django and Node built-ins; no new package.
ISSUE-010 migration index drift; ISSUE-011 worker/eager/storage defaults. Deployed
schema/beat/queues/provider configuration and full release tests remain unverified.
Never start restored periodic jobs, migrate a live DB or export records as a
documentation verification step.

## Latest local operation — 2026-11-19, TASK-011

Docker 29.2.1 verified running. Local-copy backend/frontend images rebuilt and only
those containers force-recreated; image IDs matched rebuilt tags. Frontend GET 200,
backend login OPTIONS 200 and protected catalog GET 403 without authentication
passed. DB/Redis stayed healthy. No migration/provider-job/application change.
Evidence is in ignored .local-copy/operations/ logs and restart-smoke.json.
