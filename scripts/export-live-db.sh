#!/usr/bin/env bash
# Run on the LIVE application server, never on the local workstation.
set +x
set -euo pipefail
umask 077

backend=cixci_backend_live
image=postgres:18-alpine
backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/cixci-livecopy.XXXXXX")"
trap 'unset PGPASSWORD' EXIT

# Keep the password out of shell history, output, and Docker CLI arguments.
# Fail if the running app no longer points to the database inspected for this copy.
PGPASSWORD="$(docker exec -i "$backend" python manage.py shell <<'PY'
from django.conf import settings
db = settings.DATABASES['default']
assert db['ENGINE'] == 'django.db.backends.postgresql', 'Unexpected DB engine'
assert db['HOST'] == '35.202.76.111', 'Unexpected live DB host'
assert str(db['PORT']) == '5432', 'Unexpected live DB port'
assert db['NAME'] == 'cixci-lve', 'Unexpected live DB name'
assert db['USER'] == 'cixciadmin', 'Unexpected live DB user'
assert db['PASSWORD'], 'Missing live DB password'
print(db['PASSWORD'])
PY
)"
export PGPASSWORD

# This uses a temporary PostgreSQL 18 client; no packages are installed in the app.
# A custom-format dump contains the whole DB, including tenant IDs and migrations.
docker run --rm \
  --network "container:$backend" \
  --env PGPASSWORD \
  --mount "type=bind,source=$backup_dir,target=/backup" \
  --entrypoint pg_dump "$image" \
  --host=35.202.76.111 --port=5432 --username=cixciadmin \
  --dbname=cixci-lve --no-password \
  --format=custom --no-owner --no-acl --no-tablespaces \
  --lock-wait-timeout=10s \
  --file=/backup/cixci-livenew.dump
unset PGPASSWORD

# Inspect the archive without restoring or changing the live database.
docker run --rm \
  --mount "type=bind,source=$backup_dir,target=/backup,readonly" \
  --entrypoint pg_restore "$image" \
  --list /backup/cixci-livenew.dump > "$backup_dir/archive-list.txt"

cd "$backup_dir"
sha256sum cixci-livenew.dump > cixci-livenew.dump.sha256
chmod 600 cixci-livenew.dump

# When launched with sudo from SSH-in-browser, let the authenticated invoking
# user download the private artifacts. Keep the directory/file modes private.
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != root ]; then
  backup_owner="$SUDO_USER:$(id -gn "$SUDO_USER")"
  chown "$backup_owner" "$backup_dir" \
    "$backup_dir/cixci-livenew.dump" \
    "$backup_dir/cixci-livenew.dump.sha256" \
    "$backup_dir/archive-list.txt"
fi

printf '\nDump completed: %s/cixci-livenew.dump\n' "$backup_dir"
cat cixci-livenew.dump.sha256
printf 'Transfer the dump and checksum over SSH. Treat both the dump and copied credentials as private.\n'
