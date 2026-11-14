"""Write-only Vendor credentials encrypted with a separately managed key ring."""
import json
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ValidationError


def key_ring():
    keys = getattr(settings, "VENDOR_CATALOG_ENCRYPTION_KEYS", [])
    if isinstance(keys, str):
        keys = [value.strip() for value in keys.split(",") if value.strip()]
    if not keys:
        raise ValidationError("Vendor credential encryption requires an administrator-configured key ring.")
    try:
        return MultiFernet([Fernet(value.encode() if isinstance(value, str) else value) for value in keys])
    except (ValueError, TypeError):
        raise ValidationError("The Vendor credential encryption key ring is invalid.")


def encrypt_credentials(auth_type, value):
    if not isinstance(value, dict):
        raise ValidationError("Supply a credential object.")
    fields = {"bearer": {"token"}, "api_key": {"token"}, "basic": {"username", "password"}, "none": set()}.get(auth_type)
    if fields is None or set(value) != fields:
        raise ValidationError("Supply the credential fields required by the selected authentication method.")
    if any(not isinstance(text, str) or not text or len(text) > 8192 or "\r" in text or "\n" in text for text in value.values()):
        raise ValidationError("Credential values must be non-empty single-line strings.")
    if auth_type == "none":
        return ""
    return key_ring().encrypt(json.dumps(value, separators=(",", ":")).encode()).decode()


def decrypt_credentials(connection):
    if connection.auth_type == "none":
        return {}
    try:
        value = json.loads(key_ring().decrypt(connection.encrypted_credentials.encode()))
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (InvalidToken, ValueError, UnicodeError):
        raise ValidationError("Vendor credentials cannot be opened with the configured key ring.")


def redact(value, secrets=()):
    protected = {"authorization", "apikey", "token", "accesstoken", "refreshtoken", "password", "secret", "clientsecret", "privatekey", "credential", "credentials"}
    if isinstance(value, dict):
        return {str(key): "[REDACTED]" if str(key).casefold().replace("_", "").replace("-", "") in protected else redact(item, secrets) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item, secrets) for item in value]
    if isinstance(value, str):
        for secret in secrets:
            if secret:
                value = value.replace(secret, "[REDACTED]")
    return value
