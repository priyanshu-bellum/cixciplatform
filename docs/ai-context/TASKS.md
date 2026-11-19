# Persistent tasks

Active implementation: TASK-009 (production bugfixes), TASK-010 (client issues).
TASK-002–008 record earlier discoveries. IDs are permanent.

## TASK-011 — Rebuild and restart the local backend/frontend

- Status: completed
- Related features: UI-001; operations only, no application behavior change.
- Modules: local-copy Docker Compose backend/frontend.
- Acceptance: Docker engine reachable; both images rebuild successfully; both
  containers restart using those images; frontend and backend HTTP checks succeed.
- Plan: inspect running stack → build backend/frontend → force-recreate only those
  services → verify container/image state and HTTP responses.
- Dependencies: existing Docker engine, local-copy DB/Redis and current source.
- Verification status: Docker 29.2.1 reachable; both images built and containers
  force-recreated successfully. Running image IDs match the rebuilt image tags.
  Frontend GET 200; backend login OPTIONS 200; protected catalog GET 403 as
  expected without authentication. PostgreSQL/Redis remained healthy.
- Remaining work: none for rebuild/restart. Existing Vite bundle-size warning is
  nonblocking. No application changes, new tests, migrations or provider jobs.
- Evidence: .local-copy/operations/rebuild-backend-frontend.log and restart-smoke.json.

## TASK-001 — Initialize repository agent memory

- Status: completed
- Related features: MEM-001; discovery covers all 30 feature records.
- Modules: all implemented apps, frontend shell, deployment and repository instructions.
- Acceptance: requested documents exist; major modules have source-backed guides;
  APIs/schema/features have navigable evidence; rules distinguish requirements from
  implementation; agent workflow is mandatory; reference checks and limitations recorded.
- Plan: inventory → inspect module groups and persist evidence → write registries and
  guides → merge instructions → validate → finalize handoff.
- Dependencies: existing source, tests, architecture ADRs; no new dependencies.
- Verification: 8/8 memory tests; fresh-inventory validation 0 errors/warnings;
  diff/scope review passed. Existing application baseline 55 passed/2 failed;
  Django check passed; migration drift recorded. See VERIFICATION.md.
- Remaining: none for memory initialization. Unverified runtime/release areas and
  existing defects are explicit pending TASK-002–008, not concealed completion claims.

## TASK-002 — Verify and repair audit spine creation/filter defects

- Status: pending
- Related features: AUD-001; ISSUE-001/002.
- Modules: audit and domain evidence consumers.
- Acceptance criteria: first creation succeeds; subsequent mutations remain blocked;
  import/export filters use approved directions; tenant isolation preserved.
- Dependencies: clarify file-direction meaning; inspect callers and bulk-write paths.
- Verification status: source findings only; no fix/regression added.
- Remaining work: focused reproduction, targeted repair and creation/filter tests.

## TASK-003 — Clarify and repair legacy PO finalization

- Status: pending
- Related features: PRO-001, ORD-001/002, FUL-001, PRC-001; ISSUE-003.
- Modules: procurement/shared API, routing, fulfillment and pricing.
- Acceptance criteria: approved delivery/evidence sequence, valid timestamps,
  real shipping data, per-line pricing and rollback/retry behavior.
- Dependencies: owner resolution UQ-003; TASK-006 fixtures to reach the flow.
- Verification status: source defects documented; baseline test fails earlier.
- Remaining work: trace approved/manual/API paths and add failure regressions.

## TASK-004 — Review tenant authorization and credential/docs exposure

- Status: pending
- Related features: TEN-001, AUTH-001, INT-001, ANA-001, LCH-001; ISSUE-004/005/008.
- Modules: tenant, shared APIs, analytics/launch, keys and schema views.
- Acceptance criteria: approved audience/inactive membership behavior; two-company
  read/mutation/docs/key matrix; approved key lifecycle preserved.
- Dependencies: owner resolution UQ-001/004 and key display/storage policy.
- Verification status: source patterns confirmed; access/exploit matrix unexecuted.
- Remaining work: reproduce reachability, clarify policy and add targeted regressions.

## TASK-005 — Resolve notification scope and precedence

- Status: pending
- Related features: NTF-001; ISSUE-006.
- Modules: notification, tenant identity and event consumers.
- Acceptance criteria: independent company/entity/recipient preferences and approved
  legal/required/source-policy/quiet-hours/digest precedence.
- Dependencies: owner decisions UQ-005; producer/recipient traces.
- Verification status: source query/identity gaps; no repair attempted.
- Remaining work: multi-company/recipient tests and approved ladder repair.

## TASK-006 — Restore baseline checks and resolve migration index drift

- Status: pending
- Related features: PRO-001, INT-001/004; ISSUE-009/010.
- Modules: PO/schema test fixtures and integration commerce model/migration names.
- Acceptance criteria: selected baseline passes against intended contracts;
  migration dry run clean or reviewed compatible migration plan.
- Dependencies: preserve business rules; analyze PostgreSQL/index compatibility.
- Verification status: 55 passed/2 failed; Django check passes; migration check fails.
- Remaining work: fixture/auth test diagnosis, real orchestration coverage and
  explicit index-name decision without unapproved live schema changes.

## TASK-007 — Reconcile partial features and performance coverage

- Status: pending
- Related features: CMP-001, DEV-002, NTF-001, ANA-001, LCH-001; ISSUE-007/012.
- Modules: event producers, analytics/launch and large shared handlers.
- Acceptance criteria: accepted spec/implementation gap list, source-to-delivery
  traces, launch coverage plan and measured performance targets before refactoring.
- Dependencies: UQ-004/006 and prioritized business scope; TASK-004 isolation review.
- Verification status: major boundaries inspected; exhaustive branches/reports unverified.
- Remaining work: prioritize approved tasks, profile and add missing module coverage.

## TASK-008 — Verify deployment/providers in an authorized environment

- Status: pending
- Related features: MED-001, INT-002/003/004, UI-001; ISSUE-011.
- Modules: operations/settings/Compose, storage, workers/beat/provider clients.
- Acceptance criteria: known safe target, applied schema reviewed, correct queue/
  eager configuration and controlled storage/email/carrier/provider flows.
- Dependencies: authorized target/credentials/provider effects; no live background
  job or production data operation is authorized by TASK-001.
- Verification status: source topology inspected; live operation untested.
- Remaining work: full backend/PostgreSQL/frontend checks and controlled end-to-end run.

## TASK-009 — Production bugfixes (Balaji onboarding blockers)

- Status: completed
- Modules: docker-compose.prod.yml, settings, catalog_import, apiClient.ts, media
- Completed items:
  - Docker env var injection (VENDOR_CATALOG_ENCRYPTION_KEYS)
  - Celery queue configuration (vendor_catalog, vendor_commerce)
  - Celery-beat service with DatabaseScheduler
  - Brand filter auto-registration during vendor API sync
  - JWT session fix: ROTATE_REFRESH_TOKENS=False + proactive frontend refresh
  - JPEG/JPG image acceptance alongside PNG
- Tests: 16 new media validation tests, all passing
- Verification: must test against prod DB clone before push

## TASK-010 — Client issue backlog (Nov 2026 video feedback)

- Status: pending
- Related: memory `project_client-issues-nov2026.md`
- Reference docs: `docs/CIXCI_Product_Data_Normalization_*.docx`,
  `docs/CIXCI_Category_Governance_*.docx`
- Subtasks (priority order):
  1. Product data normalization service (22-section deterministic rules)
  2. Category governance (vendor→CIXCI canonical mapping + dashboard notifications)
  3. Color mapping configuration (vendor color→system color)
  4. Multicolor support for products
  5. Missing device notifications (dashboard alert for unknown devices)
  6. ~~Weight unit fix (pounds→ounces)~~ — DONE: backend model + frontend display/edit
  7. ~~Clearance marking (end-date or inventory-based)~~ — DONE: backend model + frontend display/edit
  8. ~~Series field on product detail/edit page~~ — DONE: ManageProductDialog + ProductFormDialog
  9. ~~Short description enforcement (never auto-generate)~~ — DONE: normalization service
  10. Existing product batch revalidation — PENDING
- Dependencies: normalization spec doc rules, category governance doc rules
- Acceptance: each subtask needs tests; tenant isolation preserved; no auto-generated
  business rules
