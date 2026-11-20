"""
Media URL utilities — base62 UUID encoding for short image URLs.

UUID (36 chars) → base62 (22 chars)
Example: 550e8400-e29b-41d4-a716-446655440000 → 2aUyqjCzEIiEcYMKj7TZtw

Behaviour is controlled by the ``MEDIA_USE_SHORT_URLS`` Django setting:
  True  → /api/img/<base62>  (production — requires MediaProxyView route)
  False → {MEDIA_URL}{storage_key}  (test / local — default)
"""
import uuid

_B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def uuid_to_b62(u) -> str:
    """Encode a UUID to a ~22-char base62 string."""
    if isinstance(u, str):
        u = uuid.UUID(u)
    n = u.int
    if n == 0:
        return _B62[0]
    parts = []
    while n:
        parts.append(_B62[n % 62])
        n //= 62
    return "".join(reversed(parts))


def b62_to_uuid(s: str) -> uuid.UUID:
    """Decode a base62 string back to a UUID."""
    n = 0
    for c in s:
        n = n * 62 + _B62.index(c)
    return uuid.UUID(int=n)


def media_short_url(asset_id) -> str:
    """
    Return the public URL for a media asset.

    Always uses the proxy path /api/img/<base62> which MediaProxyView serves
    directly from local storage or redirects to cloud storage. This avoids
    dependence on Django's static file serving or external web server config.

    MEDIA_BASE_URL (optional) prepends an absolute origin for external consumers.
    """
    from django.conf import settings

    base = getattr(settings, "MEDIA_BASE_URL", "").rstrip("/")
    return f"{base}/api/img/{uuid_to_b62(asset_id)}"
