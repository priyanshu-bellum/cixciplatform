"""Bounded HTTPS JSON reads with DNS pinning; credentials never follow redirects."""
import base64
import email.utils
import http.client
import ipaddress
import json
import re
import socket
import ssl
import time
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlencode
from .catalog_secrets import decrypt_credentials


class CatalogTransportError(Exception):
    def __init__(self, code, *, status=None, retry_after=None, provider_code=None):
        self.code, self.status, self.retry_after = code, status, retry_after
        self.provider_code = provider_code
        super().__init__(code)


def public_target(url, *, resolve=True):
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        if parsed.scheme != "https" or parsed.port not in (None, 443) or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError()
        if not host or "." not in host or host.casefold().endswith((".local", ".localhost", ".internal")) or "\\" in url or any(ord(char) <= 32 for char in url):
            raise ValueError()
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise ValueError()
        host = host.encode("idna").decode()
        addresses = []
        if resolve:
            for entry in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM):
                address = entry[4][0]
                if not ipaddress.ip_address(address).is_global:
                    raise ValueError()
                if address not in addresses:
                    addresses.append(address)
            if not addresses:
                raise ValueError()
        return host, parsed.path or "/", addresses
    except (ValueError, UnicodeError, OSError):
        raise CatalogTransportError("UNSAFE_ENDPOINT")


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host, address):
        super().__init__(host, port=443, timeout=15, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        sock = socket.create_connection((self.address, 443), timeout=self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def retry_after_seconds(value):
    if not value:
        return None
    try:
        delay = int(value) if str(value).isdigit() else int((email.utils.parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds())
        return max(1, min(delay, 86400))
    except (ValueError, TypeError, OverflowError):
        return None


def fetch_json(connection, params):
    return request_json(connection, params)[1]


def request_json(connection, params=None, *, method='GET', body=None, accepted_statuses=(200,), extra_headers=None):
    if method not in ('GET','POST','PUT','PATCH','DELETE'):
        raise CatalogTransportError('UNSUPPORTED_REQUEST_METHOD')
    encoded = None
    if body is not None:
        try:
            encoded = json.dumps(body,ensure_ascii=False,allow_nan=False,separators=(',',':')).encode('utf-8')
        except (ValueError,TypeError,RecursionError):
            raise CatalogTransportError('INVALID_REQUEST_JSON') from None
        if method=='GET' or len(encoded)>1024*1024:
            raise CatalogTransportError('INVALID_REQUEST_BODY')
    host, path, addresses = public_target(connection.endpoint_url)
    credential = decrypt_credentials(connection)
    headers = {"Accept": "application/json", "Accept-Encoding": "identity", "User-Agent": "CIXCI-Vendor-Catalog/1"}
    if encoded is not None:
        headers['Content-Type']='application/json'
    for name,value in (extra_headers or {}).items():
        if (not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]{1,63}',name) or name.casefold() in {'authorization','host','cookie','connection','content-type','content-length','transfer-encoding'}
                or not isinstance(value,str) or len(value)>500 or '\r' in value or '\n' in value):
            raise CatalogTransportError('INVALID_REQUEST_HEADER')
        headers[name]=value
    if connection.auth_type == "bearer":
        headers["Authorization"] = "Bearer " + credential["token"]
    elif connection.auth_type == "api_key":
        header = connection.auth_header
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]{1,63}", header) or header.casefold() in {"host", "cookie", "connection", "content-length", "transfer-encoding", "proxy-authorization"}:
            raise CatalogTransportError("INVALID_AUTH_HEADER")
        headers[header] = credential["token"]
    elif connection.auth_type == "basic":
        encoded = base64.b64encode((credential["username"] + ":" + credential["password"]).encode()).decode()
        headers["Authorization"] = "Basic " + encoded
    client = PinnedHTTPSConnection(host, addresses[0])
    try:
        client.request(method, path + ("?" + urlencode(params) if params else ""), body=encoded, headers=headers)
        response = client.getresponse()
        if response.status not in accepted_statuses:
            code = {401: "AUTHENTICATION_FAILED", 403: "ACCESS_DENIED", 429: "RATE_LIMITED"}.get(response.status, "PROVIDER_UNAVAILABLE" if response.status >= 500 else "PROVIDER_REJECTED")
            provider_code=None
            try:
                error_body=response.read(65537)
                error=json.loads(error_body) if len(error_body)<=65536 else {}
                candidate=error.get('error',{}).get('code') if isinstance(error,dict) and isinstance(error.get('error'),dict) else None
                if isinstance(candidate,str) and re.fullmatch(r'[A-Z][A-Z0-9_]{0,99}',candidate) and not any(str(secret) in candidate for secret in credential.values() if secret):
                    provider_code=candidate
            except (ValueError,TypeError,RecursionError):
                pass
            raise CatalogTransportError(code, status=response.status, retry_after=retry_after_seconds(response.getheader("Retry-After")),provider_code=provider_code)
        if response.status==204:
            return 204, {'success':True,'data':{}}
        content_type = response.getheader("Content-Type", "").split(";")[0].strip().casefold()
        if not (content_type == "application/json" or content_type.endswith("+json")) or response.getheader("Content-Encoding", "identity") not in ("", "identity"):
            raise CatalogTransportError("INVALID_RESPONSE_TYPE")
        limit, deadline, parts, size = 8 * 1024 * 1024, time.monotonic() + 45, [], 0
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise CatalogTransportError("RESPONSE_TIMEOUT", status=503)
            if client.sock:
                client.sock.settimeout(min(15, remaining))
            part = response.read(min(65536, limit + 1 - size))
            if not part:
                break
            parts.append(part); size += len(part)
            if size > limit:
                raise CatalogTransportError("RESPONSE_TOO_LARGE")
        def invalid_constant(value):
            raise ValueError()
        return response.status, json.loads(b"".join(parts), parse_constant=invalid_constant)
    except CatalogTransportError:
        raise
    except (OSError, http.client.HTTPException, ssl.SSLError):
        raise CatalogTransportError("NETWORK_UNAVAILABLE", status=503)
    except (ValueError, UnicodeError, RecursionError):
        raise CatalogTransportError("INVALID_JSON")
    finally:
        client.close()
