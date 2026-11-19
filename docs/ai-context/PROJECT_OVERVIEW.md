# Project overview

Source baseline: `main`, `0c5e2a5`, inspected 2026-11-19. This is an implementation
index. [Architecture decisions](../../architecture/decisions/) and existing
[module specifications](../../modules/) remain authoritative design records.

CIXCI is a multi-tenant B2B accessory commerce platform. Buyers (including MVNOs,
carriers and retailers) select devices and discover compatible supplier products,
export selections to storefronts, submit orders, and track fulfillment, returns
and invoices. Vendors supply products and fulfillment data. Device manufacturers
maintain reference information; system admins coordinate cross-company setup.
Company types also include partner, device distributor and CIXCI internal.

## Stack and boundaries

| Layer | Verified manifest/configuration |
|---|---|
| Backend | Python 3.12 Docker image, Django 5.0.6, DRF 3.15.2, SimpleJWT 5.3.1 |
| Frontend | React 19.2, TypeScript 6.0, MUI 9, Vite 8; Axios, Zustand, TanStack Query 5, Recharts, XLSX, JSZip |
| Persistence | PostgreSQL (Compose dev 16; local-copy 18); SQLite local/test alternatives |
| Processing | Redis 7, Celery 5.4, django-celery-beat/results; ORM-backed durable integration jobs |
| Storage/delivery | Local media, configurable GCS/S3; Resend/SendGrid email code; EasyPost carrier code |
| Operations | Docker Compose, Gunicorn, frontend Nginx; deployment-specific external database/proxy |

See [manifests](../../backend/requirements.txt), [frontend package](../../frontend/package.json),
[architecture](ARCHITECTURE.md) and [operations guide](modules/operations.md).
Declared dependencies are not proof of live provider configuration.

Fourteen Django apps: tenant, audit, notification, media, devices, catalog, pricing,
routing, fulfillment, invoicing, integration, analytics, procurement and launch.
The frontend is one SPA. Shared handlers for five apps reside in
`backend/apps/shared_api.py`; imports connect bounded contexts in one process and
one database. Some broad specifications exceed current implementation (especially
launch coordination, complete notifications/events and analytics isolation).

## Setup and commands

Use existing environments first; dependency installation needs approval under
AGENTS.md. Use [local-copy instructions](../local-live-database-copy.md) for restored
data. Do not apply migrations or seed sample data to an unidentified database.
Environment values and credentials must be supplied privately; never copy values
from helper scripts into memory.

| Command (working directory) | Purpose / boundary |
|---|---|
| `python manage.py runserver --settings=config.settings_local` (`backend/`) | SQLite/local cache/eager tasks; development only |
| `python manage.py migrate --settings=config.settings_local` (`backend/`) | Local schema initialization; confirm target first |
| `python -m pytest tests --ds=config.test_settings` (`backend/`) | Isolated in-memory SQLite backend suite |
| `python manage.py check --settings=config.test_settings` (`backend/`) | Django configuration checks |
| `python manage.py makemigrations --check --dry-run --settings=config.test_settings` (`backend/`) | Check model/migration drift; writes no migrations |
| `npm run dev` / `npm run build` / `npm run lint` (`frontend/`) | Vite development / TypeScript+bundle / ESLint |
| `node --experimental-strip-types --test scripts/csv-preview.test.mjs` (root) | Existing CSV utility regression suite |
| `node --test scripts/ai-context.test.mjs` (root) | Memory tooling regression suite |
| `node scripts/validate-ai-context.mjs` (root) | Memory links, IDs and workflow consistency |
| `./scripts/verify-compatibility-backend.ps1 -Database both` (root, PowerShell) | Existing isolated SQLite/PostgreSQL compatibility verification |
| `./scripts/verify-vendor-catalog-backend.ps1 -Database both` (root) | Existing vendor integration regression selection |

Frontend API base is the build-time `VITE_API_URL`, defaulting to local
`/api/v1` on port 8000. Vite config has no API reverse proxy. SPA authentication
uses JWT in browser localStorage; B2B clients can use company API keys and
entity selection. Navigation visibility is not a server authorization guarantee.

## Navigation

Start with [current state](CURRENT_STATE.md), [handoff](SESSION_HANDOFF.md),
[tasks](TASKS.md), then [feature registry](FEATURE_REGISTRY.md) and
[codebase map](CODEBASE_MAP.md). Read only affected module guides and relevant
rules/decisions, then inspect source. Exhaustive schema/API references are on
demand; do not load them for every small task.
