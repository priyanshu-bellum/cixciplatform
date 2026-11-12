# Production compatibility follow-up — 12 November 2026

## Requirements and plan

Authority: the Universal Device-Type requirement §§5–10, 15, 17–18 and the
Category Compatibility Configuration requirement §§3–7 in `bugs/`. Preserve
approved tenant/entity, lifecycle, exclusion, portfolio and history controls.

1. Reproduce the supplied cellhelmet PATCH and wireless Save path.
2. Correct shared behavior and add regression coverage before deployment.
3. Migrate only explicitly approved source declarations; rebuild derived results
   for every declared Universal Product through the existing engine.
4. Verify both databases, built UI, local role accounts and Telco's existing API.
5. Release this patch before continuing the separate Vendor API feature.

## Confirmed causes and changes

**Company Profile 500:** the active-company validator accessed the nonexistent
`Company.user_memberships` reverse relation. The actual model relation is
`memberships`. The exact supplied PATCH reproduced the AttributeError locally;
the corrected path returned HTTP 200 inside a rolled-back transaction. Active
membership, suspended membership and inactive-user cases are regression tested.

**Wireless Save:** updating a policy reconciled Products while refreshing all
Buyer projections separately for each Product. The first policy creation also
skipped reconciliation. Both creation and update now reconcile with notifications
deferred, then invalidate derived Buyer projection caches once. Authorized Buyer
reads use the existing lazy refresh. Configuration and mappings remain atomic;
the UI shows saving/recalculation progress and explicit approved-value success.

**Universal deployment:** source scope and derived mappings are different layers.
Migration `0033_approved_speaker_scopes_and_deployment_rebuild` records the user's
explicit approval of BAR-SM-BT-SPKR, BAS-214 and BAS-226 for the three existing
canonical Phone, Tablet and Smartwatch types. Supplier, Product ID and expected
SKU must all agree; newer declarations are preserved. No other undeclared offer
receives inferred scope. The existing BAS-214-MO declaration is retained.

The migration also queues an audited rebuild for **all** already declared
Universal Products, regardless of category or SKU. The catalog `post_migrate`
handler runs the shared engine after all apps' schema changes. Requests and
completion evidence use existing AuditRecord storage; repeated processing is
idempotent. A processing failure rolls back the rebuild batch so retrying
`python manage.py migrate` retries pending requests. Completed exports are not
rewritten. This repairs stale Tablet/Smartwatch projections as well as Phones.

## Category fallback and precedence

The Product Catalog's saved category configuration governs method, eligible
types, assigned fields and comparisons for manual, CSV and API entry:

| Product input | Effective behavior |
| --- | --- |
| No explicit models, Feature Based category | Compare configured feature evidence; no evidence means no match |
| No explicit models, Hybrid category | Configured feature matches can qualify; explicit and feature results combine with OR |
| No explicit models, Device Specific category | No inferred model matches; compatibility remains incomplete |
| Universal category without Product type scope | Validation error: at least one declared canonical type is required |
| Explicit Product Universal scope under any approved category | Use that scope intersected with category/device eligibility and exclusions |

Category eligibility is permission to match a type, not a Product declaration.
Adding Tablet to a category cannot broaden a Phone-only Product. The user's
later clarification keeps Universal independent of the business category name.
Negative capability answers do not become positive feature evidence.

## Deployment and verification

Deploy backend/frontend from this release, run `python manage.py migrate`, then
restart the backend and serve the rebuilt frontend. The migration changes source
facts only for the three explicitly authorized existing Product identities.
The runtime engine contains no speaker/SKU-specific matching behavior.

Run `scripts/verify-compatibility-backend.ps1 -Database both` and
`scripts/verify-client-release.ps1` with runtime QA credentials. New tests cover
all four category methods, three device types, stale projections, exclusions,
Admin locks, renamed types, completed snapshots, migration idempotency, missing
canonical setup, first/update policy save and Company membership validation.

Local Vendor/Buyer QA identities are separate `.test` accounts with ordinary
scoped capabilities and audited creation. Their randomly generated passwords
are saved only in the ignored local analysis folder. They do not grant access
to Telco or other Companies. Production deployment remains an external step;
passing local tests does not establish that live containers have been updated.

## Verified results

- Full backend: **447/447 SQLite and 447/447 PostgreSQL**.
- Built UI: **62/62** (Profile 4, Vendor/bulk 10, wireless 8, full 40).
- CSV preview encoder: **2/2**; TypeScript/Vite production build passed.
- Local migration applied; each of the four speakers now has **95 current
  Phones, 27 Tablets and 1 Smartwatch**. A future Phone stays outside current
  visibility. Repeating pending-request processing performed zero rebuilds.
- Telco API remains HTTP 200 with exactly CP00448–CP00451; all four PNGs return
  HTTP 200. No internal compatibility declarations appear in Buyer responses.
- CF-105-LP remains Direct Device, empty Universal scope, one effective mapping.
- New local Vendor and Buyer accounts both log in and read their own empty
  catalog with HTTP 200; another supplier's profile returns HTTP 403.

Evidence is in ignored `production-hotfix-*` logs and browser reports under
`.local-copy/compatibility-analysis/`. Random QA credentials are in the ignored
`local-qa-credentials.json`; no credentials belong in Git.
