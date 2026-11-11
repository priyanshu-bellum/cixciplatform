"""Country identity resolution for onboarding; never grants Vendor coverage."""
import json
from pathlib import Path
import uuid

from django.core.exceptions import ValidationError

_REFERENCE = json.loads(Path(__file__).with_name("country_codes.json").read_text(encoding="utf-8"))
COUNTRIES = {row["code"]: row for row in _REFERENCE["countries"]}
COUNTRY_ALIASES = {row["alpha3"]: row["code"] for row in COUNTRIES.values()}


def normalize_country_code(value, *, strict=False):
    token = str(value or "").strip().upper()
    token = COUNTRY_ALIASES.get(token, token)
    if token in COUNTRIES:
        return token
    if strict and token:
        raise ValidationError({"country_code": "Use a recognized ISO country code, for example US or USA. State and delivery-address values are not country codes."})
    return None


def country_region(country_code, *, using="default", registry=None, company_id=None, actor_id=None):
    code = normalize_country_code(country_code)
    if not code:
        return None
    if registry is None:
        from django.apps import apps
        registry = apps
    Region = registry.get_model("tenant", "OperatingRegion")
    matches = list(Region.objects.using(using).filter(code__iexact=code)[:2])
    if len(matches) > 1:
        raise ValidationError({"country_code": "Duplicate canonical country-region identities require administrator review."})
    if matches:
        # A retired identity is not silently reactivated during onboarding.
        return matches[0]
    region, created = Region.objects.using(using).get_or_create(code=code, defaults={"name": COUNTRIES[code]["name"], "is_active": True})
    if created:
        Audit = registry.get_model("audit", "AuditRecord")
        Audit.objects.using(using).create(event_code="tenant.country_region.registered", status="success",
            event_description=json.dumps({"country": code, "source": _REFERENCE["source"], "vendor_coverage_granted": False}),
            actor_reference=actor_id, service_trigger_reference="Country-based onboarding",
            company_scope_reference=company_id or uuid.UUID(int=0), source_module="tenant",
            source_record_type="OperatingRegion", source_record_id=region.id)
    return region
