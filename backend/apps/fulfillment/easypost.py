"""EasyPost Tracker client: bounded HTTPS calls, no SDK and no label purchase.

Contract taken from the EasyPost documentation (docs.easypost.com: trackers,
webhooks, events, authentication, errors) and the official Python client's
``validate_webhook``:
- Base URL https://api.easypost.com/v2, HTTP Basic with the API key as the
  username and an empty password.
- POST /trackers {"tracker": {"tracking_code", "carrier"?}}; the same code and
  carrier within three months returns the original tracker.
- Webhook header ``X-Hmac-Signature: hmac-sha256-hex=<hex>``; HMAC-SHA256 of the
  raw body keyed with the NFKD-normalized webhook secret.
"""
import base64
import hashlib
import hmac
import http.client
import json
import ssl
import unicodedata
from urllib.parse import urlencode

from django.utils.dateparse import parse_datetime

from apps.integration.catalog_transport import (
    CatalogTransportError, PinnedHTTPSConnection, public_target, retry_after_seconds,
)

API_BASE = "https://api.easypost.com/v2"
MAX_RESPONSE = 2 * 1024 * 1024
SIGNATURE_PREFIX = "hmac-sha256-hex="

# Documented Tracker.status values.
STATUSES = ("unknown", "pre_transit", "in_transit", "out_for_delivery", "delivered",
            "available_for_pickup", "return_to_sender", "failure", "cancelled", "error")
# No further carrier movement is expected after these.
TERMINAL_STATUSES = ("delivered", "return_to_sender", "failure", "cancelled", "error")


class EasyPostError(Exception):
    def __init__(self, code, *, status=None, retry_after=None, message=""):
        self.code, self.status, self.retry_after = code, status, retry_after
        self.message = str(message or "")[:200]
        super().__init__(code)

    @property
    def temporary(self):
        return self.status is None or self.status == 429 or self.status >= 500


def _request(api_key, method, path, *, body=None, params=None):
    if not api_key:
        raise EasyPostError("API_KEY_REQUIRED", status=401)
    try:
        host, base_path, addresses = public_target(API_BASE)
    except CatalogTransportError:
        raise EasyPostError("NETWORK_UNAVAILABLE") from None
    encoded = json.dumps(body, separators=(",", ":")).encode() if body is not None else None
    headers = {
        "Accept": "application/json", "Accept-Encoding": "identity", "User-Agent": "CIXCI-Carrier-Tracking/1",
        "Authorization": "Basic " + base64.b64encode((api_key + ":").encode()).decode(),
    }
    if encoded is not None:
        headers["Content-Type"] = "application/json"
    client = PinnedHTTPSConnection(host, addresses[0])
    try:
        client.request(method, base_path.rstrip("/") + path + ("?" + urlencode(params) if params else ""), body=encoded, headers=headers)
        response = client.getresponse()
        raw = response.read(MAX_RESPONSE + 1)
        if len(raw) > MAX_RESPONSE:
            raise EasyPostError("RESPONSE_TOO_LARGE", status=502)
        try:
            payload = json.loads(raw) if raw else {}
        except ValueError:
            payload = None
        if response.status not in (200, 201):
            error = payload.get("error") if isinstance(payload, dict) else None
            error = error if isinstance(error, dict) else {}
            fallback = {401: "AUTHENTICATION_FAILED", 403: "ACCESS_DENIED", 404: "NOT_FOUND", 429: "RATE_LIMITED"}.get(
                response.status, "PROVIDER_UNAVAILABLE" if response.status >= 500 else "PROVIDER_REJECTED")
            code = error.get("code") if isinstance(error.get("code"), str) and response.status not in (401, 403, 429) else fallback
            raise EasyPostError(str(code)[:100], status=response.status, message=error.get("message", ""),
                retry_after=retry_after_seconds(response.getheader("Retry-After")))
        if not isinstance(payload, dict):
            raise EasyPostError("INVALID_RESPONSE", status=502)
        return payload
    except EasyPostError:
        raise
    except (OSError, http.client.HTTPException, ssl.SSLError):
        raise EasyPostError("NETWORK_UNAVAILABLE") from None
    finally:
        client.close()


def create_tracker(api_key, tracking_code, carrier=None):
    tracker = {"tracking_code": tracking_code}
    if carrier:
        tracker["carrier"] = carrier
    return _request(api_key, "POST", "/trackers", body={"tracker": tracker})


def retrieve_tracker(api_key, tracker_id):
    return _request(api_key, "GET", "/trackers/" + tracker_id)


def verify_api_key(api_key):
    """Cheapest authenticated read; raises EasyPostError when the key is rejected."""
    return _request(api_key, "GET", "/trackers", params={"page_size": 1})


def create_webhook(api_key, url, webhook_secret):
    return _request(api_key, "POST", "/webhooks", body={"webhook": {"url": url, "webhook_secret": webhook_secret}})


def valid_signature(body, header_value, webhook_secret):
    """Constant-time check identical to the official client's validate_webhook."""
    if not header_value or not webhook_secret:
        return False
    key = unicodedata.normalize("NFKD", webhook_secret).encode("utf8")
    expected = SIGNATURE_PREFIX + hmac.new(key, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, str(header_value))


def _when(value):
    parsed = parse_datetime(value) if isinstance(value, str) else None
    if parsed is not None and parsed.tzinfo is None:
        # The provider documents UTC when a carrier supplies no zone.
        from datetime import timezone as _tz
        parsed = parsed.replace(tzinfo=_tz.utc)
    return parsed


def normalize_tracker(tracker):
    """Reduce a provider Tracker object to the facts the platform stores."""
    if not isinstance(tracker, dict) or not isinstance(tracker.get("id"), str):
        raise EasyPostError("INVALID_TRACKER", status=502)
    status = tracker.get("status") if tracker.get("status") in STATUSES else "unknown"
    events = []
    details = tracker.get("tracking_details")
    for detail in details if isinstance(details, list) else []:
        if not isinstance(detail, dict):
            continue
        occurred = _when(detail.get("datetime"))
        if occurred is None:
            continue
        place = detail.get("tracking_location") if isinstance(detail.get("tracking_location"), dict) else {}
        location = ", ".join(str(place[key]) for key in ("city", "state", "country") if place.get(key))
        events.append({
            "status": str(detail.get("status") or "")[:30], "status_detail": str(detail.get("status_detail") or "")[:50],
            "message": str(detail.get("message") or "")[:500], "location": location[:255], "occurred_at": occurred,
        })
    events.sort(key=lambda item: item["occurred_at"])
    first = lambda *names: next((item["occurred_at"] for item in events if item["status"] in names), None)
    return {
        "id": tracker["id"][:100], "mode": str(tracker.get("mode") or "")[:20],
        "tracking_code": str(tracker.get("tracking_code") or "")[:255], "carrier": str(tracker.get("carrier") or "")[:100],
        "status": status, "status_detail": str(tracker.get("status_detail") or "")[:50],
        "est_delivery_date": _when(tracker.get("est_delivery_date")),
        "public_url": str(tracker.get("public_url") or "")[:1000] if str(tracker.get("public_url") or "").startswith("https://") else "",
        "signed_by": str(tracker.get("signed_by") or "")[:255], "updated_at": _when(tracker.get("updated_at")),
        "events": events,
        "shipped_at": first("in_transit", "out_for_delivery", "available_for_pickup", "delivered"),
        "delivered_at": next((item["occurred_at"] for item in reversed(events) if item["status"] == "delivered"), None),
    }
