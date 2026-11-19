# Memory initialization discovery checklist

Task: TASK-001. Started 2026-11-19; baseline `main` at `0c5e2a5`.
Evidence is source inspection unless a verification result explicitly says otherwise.

- [x] Read root instructions; inspect Git status/history and existing architecture authority.
- [x] Inventory stack and major directories: 14 Django apps, React frontend, Compose, tests, specifications.
- [x] Foundation: tenant/auth/region permissions, audit, notifications, media.
- [x] Catalog: devices, product source/projections/compatibility, export and pricing.
- [x] Commerce: routing, procurement, fulfillment/returns, invoicing.
- [x] Integrations: catalog ingestion, commerce dispatch/polling/webhooks/storefront.
- [x] Supporting modules: analytics, launch, shared API, frontend consumers.
- [x] Schema: every owned model/field/relationship/constraint plus migration inventory.
- [x] API: active URL resolver inventory, handlers, actions, permissions and consumers.
- [x] Operations: settings, storage/cache/queues/schedules, deployment, verification commands.
- [x] Reconcile existing specifications/ADRs with source; identify gaps without inventing rules.
- [x] Write all requested memory documents and actual module guides.
- [x] Merge mandatory workflow into AGENTS.md; add CLAUDE.md entry point.
- [x] Validate paths, symbols, routes, schema, feature mappings, links and handoff consistency.
- [x] Review full diff; record actual verification, limitations and follow-up tasks.

Excluded from broad discovery: `.git`, `.local-copy` artifacts, dependency trees,
compiled/static bundles, media/binary uploads, caches, dumps, credential/environment
values and generated OpenAPI content. Existing prose is orientation, not proof.

Preserve the pre-existing modification in `backend/apps/integration/catalog_import.py`
(13 insertions / 2 deletions at start). Do not commit, push, migrate a database,
install dependencies or change application behavior for TASK-001.

Progress checkpoints go here and in SESSION_HANDOFF.md after each module group.

## Checkpoint 2 — Source tracing complete, registries next

- Foundation inspected: tenant models/services/mixins/middleware/serializers/routes,
  regional files; audit models/views; notification preference/delivery code; media
  models/readiness/validation/services and shared API entry points.
- Catalog inspected: devices models/services/views/tasks; catalog models, source
  visibility, compatibility contract/engine/configuration/services, offer selections,
  export tasks; pricing calculation, MAP/snapshot and shipping services.
- Commerce inspected: routing API/services/tasks/model declarations; PO create/approve
  and orchestration; fulfillment imports/tracking/SLA/returns APIs/tasks;
  invoicing generation/transition tables/models; analytics aggregation; launch CRUD.
- Integrations inspected: active URLs, catalog adapter/config/sync/transport/secrets,
  commerce dispatch/polling, webhook receiver/handlers/outbound and finance sync.
- Frontend inspected: App/main/auth/API client and page/consumer inventory.
- Read-only Django export succeeded: 131 owned models including automatic M2M
  tables; initial 340 route patterns included router roots/suffix aliases (now being
  filtered). Export explicitly blocks SQL; deployed database not inspected.
- Existing local backend container has the repository backend mounted at `/app`.
  Python launcher on host is unavailable; use existing container, no installation.
- Findings to record: audit UUID save guards reject new evidence/file rows; import
  audit filters use nonexistent enum members; PO orchestration fabricates delivery
  confirmation and supplies a UUID to a timestamp field; notification preference
  queries omit scope in some stages; analytics/launch APIs need tenant-scope review;
  admin Swagger view embeds internal schema before client-side auth check.
- Existing specs remain requirements/design evidence, not implementation proof.
- No application edits, migrations, dependency installations or commits performed.

## Checkpoint 3 — Documentation and validation implemented

- Requested documents and 16 module/concern guides created; existing instructions
  preserved. AGENTS.md defines future maintenance, scoped reading and reset recovery.
- Thirty stable feature records link source/tests/entities/APIs/rules/dependencies;
  18 rule IDs, 12 issue IDs and 8 task records distinguish requirement/observation.
- Thirty structural references cover 131 model/table definitions, 1,608 fields,
  112 migrations and 310 route patterns / 502 endpoint-method pairs. Seven models
  are automatic M2M joins. SQL blocked, source fingerprints retained locally.
- Eight memory tooling tests passed; full validator passed with 0 errors/warnings
  against the fresh inventory. Incorrect dropdown endpoint and nonexistent media
  task-file reference were corrected during validation.
- Selected application baseline: 55 passed/2 failed; Django system check passed;
  migration dry run detected two integration index-name differences. See VERIFICATION.
- Final scope/diff review and closing records completed. Broad discovery does not
  establish all runtime branches, live deployment or provider behavior; those limits
  and pending business-rule reviews remain explicit.
