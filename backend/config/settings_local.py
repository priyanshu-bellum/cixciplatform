"""
CIXCI Backend — Local Development Settings (NO Docker required)

Use this when running locally without Docker:
  set DJANGO_SETTINGS_MODULE=config.settings_local
  python manage.py runserver

Falls back to:
  - SQLite (no PostgreSQL required)
  - Django local-memory cache (no Redis required)
  - Debug email backend (prints to console)

Switch to config.settings once PostgreSQL + Redis are running.
"""
from .settings import *

# ─── CORS: allow Vite dev server ─────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ─── SQLite fallback ──────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "cixci_local.db",
    }
}

# ─── Local-memory cache (no Redis) ────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ─── Celery: run tasks synchronously in process (no Redis broker) ──────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ─── Email: print to console ───────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ─── Media: local filesystem ───────────────────────────────────────────────────
USE_S3 = False
USE_GCS = False
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

DEBUG = True
print("\n[CIXCI] Using LOCAL settings: SQLite + in-memory cache. No Docker needed.\n")
