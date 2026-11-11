# Local copy of the livenew database

This is a one-time snapshot for local testing. It is not replication. The live
source inspected on 2026-11-11 is PostgreSQL 18.4, database `cixci-lve`, about
28 MB. Use PostgreSQL 18 tooling, not the default development Compose file's
PostgreSQL 16. The local stack has its own project, database, and volume.

## Local configuration

Use `docker-compose.local-copy.yml` as a standalone file, not as an override of
the normal or production Compose files. It reads `backend/.env` and
`.local-copy/postgres.env`. Both contain newly generated local credentials;
do not replace either with production env files. Keep their DB passwords equal.
These files and `.local-copy/` are ignored by Git.
Backend/frontend Docker build contexts exclude env files and generated local
dependencies/cache files. Backend env is supplied when the container runs;
the frontend API URL is supplied as a build argument.

The generated backend env uses `config.settings`, a local secret key, local
PostgreSQL credentials, debug mode, and blank email/cloud credentials.
`frontend/.env` points host-side frontend development at the local API too.
`config.settings_local` must not be used: it overrides PostgreSQL with SQLite.
The current settings read `DB_*`, not `DATABASE_URL`.

Inside Docker the DB address is `db:5432`. From a host-side SQL client it is
`localhost:5433`, database `cixci_livecopy`, user `cixci_local`; get the password
from your private `backend/.env`. Redis is on localhost port 6380 for host tools.

## 1. Export on the live application server

### GCP SSH-in-browser (when laptop SCP reports publickey errors)

If `scp root@34.70.87.253:...` fails with `Permission denied (publickey)`, the
server was reached but the supplied keys did not authenticate that root user.
This is not a PostgreSQL password prompt. Use your existing GCP SSH-in-browser
connection to transfer files without changing root/password SSH settings.

Open a fresh SSH-in-browser session as your normal login user. Use the upload
icon to upload `E:\cixci\scripts\export-live-db.sh`. The browser uploads into
that login user's home directory; use the full path shown in the upload
confirmation if your session is currently running as a different user.

```bash
sudo bash "$HOME/export-live-db.sh"
```

When run this way, the script makes its private dump directory and artifacts
owned by the invoking `SUDO_USER`, keeping restrictive permissions. Use the
browser's download icon to download the dump and checksum at the paths printed
by the script. Place them in `E:\cixci\.local-copy\`, verify their checksums
using step 2 below (skip the SCP lines), then continue with the local restore.
If you execute directly from a root shell, the artifacts remain root-owned;
review the download user/permissions rather than making the dump world-readable.

### Existing laptop SSH/SCP access

Transfer `scripts/export-live-db.sh` to the server using your existing SSH/SCP
login. The DB host `35.202.76.111` is not assumed to be the SSH server address.
On Windows, from the repo root (replace the SSH placeholder):

```powershell
scp .\scripts\export-live-db.sh "root@<LIVE_SSH_HOST>:/root/export-live-db.sh"
```

Run on the live application server:

```bash
bash /root/export-live-db.sh
```

The script downloads the official `postgres:18-alpine` image if absent, runs
only a temporary pg_dump client against the existing app's DB, verifies the
archive can be listed, and prints its temporary directory and checksum. It
does not restart the live backend or restore anything on live. The export
uses a consistent snapshot; it still consumes some DB CPU, I/O, and a read
connection. The lock timeout makes it fail rather than wait indefinitely
behind conflicting DDL. Stop and inspect any export error; do not transfer a
partial dump. Never use `bash -x` or print the password.

Check the live code version as well:

```bash
git -C /srv/cixci/live rev-parse HEAD
```

Compare with the local `git rev-parse HEAD`. A restored database includes its
`django_migrations` records; newer or older local code may need reconciliation.
Do not reset a working checkout with uncommitted work to force a match.

## 2. Transfer the dump to Windows

In PowerShell at `E:\cixci`, replace the SSH host and directory with those from
the successful export:

```powershell
scp "root@<LIVE_SSH_HOST>:/tmp/cixci-livecopy.<SUFFIX>/cixci-livenew.dump" .\.local-copy\
scp "root@<LIVE_SSH_HOST>:/tmp/cixci-livecopy.<SUFFIX>/cixci-livenew.dump.sha256" .\.local-copy\
$expectedHash = ((Get-Content .\.local-copy\cixci-livenew.dump.sha256 -Raw).Trim() -split '\s+')[0]
$actualHash = (Get-FileHash .\.local-copy\cixci-livenew.dump -Algorithm SHA256).Hash
if ($actualHash -ine $expectedHash) { throw 'Dump checksum mismatch; do not restore.' }
```

Use SCP, not PowerShell text redirection or Get-Content, to transfer the binary
archive. Do not commit, attach, or paste the dump: it includes customer records,
password hashes, sessions, API keys, integration configuration, and audit history.

## 3. Restore into the empty LOCAL database

Run these commands only on the local workstation. Docker may download the
PostgreSQL 18 and existing Redis images. Backend/frontend builds install only
dependencies already declared by this repository.

```powershell
docker compose -f docker-compose.local-copy.yml up -d --wait db redis
if ($LASTEXITCODE -ne 0) { throw 'Local DB/Redis startup failed.' }
$tableCount = docker compose -f docker-compose.local-copy.yml exec -T db psql -U cixci_local -d cixci_livecopy -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'"
if ($LASTEXITCODE -ne 0 -or "$tableCount".Trim() -ne '0') { throw 'Target is not an empty local DB. Stop; do not overwrite it.' }
docker compose -f docker-compose.local-copy.yml cp .\.local-copy\cixci-livenew.dump db:/tmp/cixci-livenew.dump
if ($LASTEXITCODE -ne 0) { throw 'Copy into local DB container failed.' }
docker compose -f docker-compose.local-copy.yml exec -T db pg_restore --username=cixci_local --dbname=cixci_livecopy --no-owner --no-acl --no-tablespaces --exit-on-error --single-transaction /tmp/cixci-livenew.dump
if ($LASTEXITCODE -ne 0) { throw 'Restore failed. Stop and inspect the error.' }
```

Do not run migrations or start the backend before the restore: those could
create tables in the otherwise empty target. Do not add `--clean`, `--create`,
or `down -v` to make a failed import succeed. The transaction prevents a failed
restore from leaving a partly restored schema. Missing extensions, production
roles mentioned by policies, or managed-provider-specific objects need review
if pg_restore reports them; they are not silently skipped.

## 4. Verify and run the application locally

```powershell
docker compose -f docker-compose.local-copy.yml build backend frontend
if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
docker compose -f docker-compose.local-copy.yml run --rm backend python manage.py check
if ($LASTEXITCODE -ne 0) { throw 'Django checks failed.' }
docker compose -f docker-compose.local-copy.yml run --rm backend python manage.py migrate --check
```

If `migrate --check` fails, inspect `migrate --plan` and the live/local code
versions before applying migrations to the LOCAL database. Do not use `--fake`
to conceal mismatches. When the schema is compatible:

```powershell
docker compose -f docker-compose.local-copy.yml up -d backend frontend
docker compose -f docker-compose.local-copy.yml exec -T backend python manage.py shell -c "from django.conf import settings; from apps.tenant.models import Company, User; from apps.catalog.models import Product; db=settings.DATABASES['default']; assert db['HOST']=='db' and db['NAME']=='cixci_livecopy'; print('LOCAL DB:', db['NAME'], db['HOST']); print('Companies:', Company.objects.count()); print('Users:', User.objects.count()); print('Products:', Product.objects.count()); print('Telco:', list(Company.objects.filter(id='853619cf-3f6f-5c92-802b-6d596f2e9a82').values('id', 'name')))"
```

Open http://localhost:5173 (frontend) and http://localhost:8000/api/v1/ (API).
An API root can require authentication; a 401/403 alone is not a failed restore.
Existing users/password hashes and company hierarchy come from the snapshot.
New local SECRET_KEY invalidates production JWT/signing artifacts: log in again.
Validate buyer/vendor tenant isolation, catalog visibility, Telco's four exported
products, and a local image URL using the same account/company as the live test.

## Images and outbound services

The DB dump contains asset metadata, not the files. Local image URLs point to
http://localhost:8000/api/img/...; the existing proxy can redirect ready assets
to the public S3 media base URL without S3 credentials. This needs internet and
depends on those objects remaining public; verify one image after restoring.
Existing absolute URLs inside snapshot/export JSON remain as stored and may
still point to live. There is no bulk URL rewrite in this setup.

USE_S3 and USE_GCS are false: new local uploads write to local filesystem
storage. However, the current image proxy has a single MEDIA_URL, so its URLs
for newly uploaded local files would still redirect to the public bucket and
may return 404. This configuration is for inspecting the cloned catalog.
Upload/preview testing needs a separate media copy or a reviewed storage setup;
do not treat this configuration as complete upload testing. No production
bucket write credentials are supplied. Existing assets are not an offline
media copy; private files and old export artifacts may need a separate
approved read-only download. Do not test deletion/replacement against
production storage.

There is no Celery worker or beat, and eager execution is false. Deferred
jobs will wait in the separate local Redis. Email API keys are blank, giving
the configured console backend. This is not a universal network sandbox:
restored DB integration URLs/tokens and synchronous actions still need review
before testing external integrations. Data sanitization and token disabling
are not performed automatically, because this request is for an exact copy.

Stop only this stack with `docker compose -f docker-compose.local-copy.yml stop`.
Keep the source dump until verification succeeds, then remove temporary copies
according to your retention practice. Never run a dump from the live server
through the local restore commands.

## References

- https://www.postgresql.org/docs/18/app-pgdump.html
- https://www.postgresql.org/docs/18/app-pgrestore.html
- https://hub.docker.com/_/postgres (PostgreSQL 18 data-directory layout)
