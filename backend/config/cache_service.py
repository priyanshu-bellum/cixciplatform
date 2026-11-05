"""
Centralized Redis caching for frequently-read, slow-changing data.

Usage:
    from config.cache_service import company_cache, dropdown_cache, category_mapping_cache

    company = company_cache.get(company_uuid)
    categories = dropdown_cache.get_by_field("product_category")
    mapping = category_mapping_cache.get(vendor_id, vendor_category)
"""
from django.core.cache import cache


# ─── TTL constants (seconds) ─────────────────────────────────────────────────

COMPANY_TTL = 300          # 5 min — companies change rarely
DROPDOWN_TTL = 600         # 10 min — dropdown configs almost never change
CATEGORY_MAPPING_TTL = 300 # 5 min — vendor mappings updated occasionally
CAPABILITY_TTL = 600       # 10 min — permission atoms rarely change


def _safe_get(key):
    try:
        return cache.get(key)
    except Exception:
        return None


def _safe_set(key, value, ttl):
    try:
        cache.set(key, value, ttl)
    except Exception:
        pass


def _safe_delete(key):
    try:
        cache.delete(key)
    except Exception:
        pass


def _safe_delete_many(keys):
    try:
        cache.delete_many(keys)
    except Exception:
        for k in keys:
            _safe_delete(k)


# ─── Company Cache ────────────────────────────────────────────────────────────

class CompanyCache:
    PREFIX = "co:"

    def get(self, company_id):
        if not company_id:
            return None
        key = f"{self.PREFIX}{company_id}"
        result = _safe_get(key)
        if result is not None:
            return result
        from apps.tenant.models import Company
        try:
            co = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return None
        return self.refresh_from_instance(co)

    def get_name(self, company_id):
        co = self.get(company_id)
        return co["name"] if co else None

    def get_display_name(self, company_id):
        co = self.get(company_id)
        return co["display_name"] if co else None

    def _to_data(self, co):
        return {
            "id": str(co.id),
            "name": co.name,
            "slug": co.slug,
            "display_name": co.display_name,
            "company_type": co.company_type,
            "status": co.status,
            "map_pricing_enforced": getattr(co, "map_pricing_enforced", False),
        }

    def invalidate(self, company_id):
        _safe_delete(f"{self.PREFIX}{company_id}")

    def refresh_from_instance(self, co):
        data = self._to_data(co)
        _safe_set(f"{self.PREFIX}{co.id}", data, COMPANY_TTL)
        return data

    def bulk_get(self, company_ids):
        results = {}
        missing = []
        for cid in company_ids:
            val = _safe_get(f"{self.PREFIX}{cid}")
            if val is not None:
                results[str(cid)] = val
            else:
                missing.append(cid)
        if missing:
            from apps.tenant.models import Company
            for co in Company.objects.filter(id__in=missing):
                data = self.refresh_from_instance(co)
                results[str(co.id)] = data
        return results


# ─── DynamicDropdownConfig Cache ──────────────────────────────────────────────

class DropdownCache:
    PREFIX = "dd:"

    def get_by_field(self, field_name, status="active"):
        key = f"{self.PREFIX}{field_name}:{status}"
        result = _safe_get(key)
        if result is not None:
            return result
        from apps.catalog.models import DynamicDropdownConfig
        qs = DynamicDropdownConfig.objects.filter(field_name=field_name)
        if status:
            qs = qs.filter(status=status)
        data = list(qs.values("id", "value", "display_name", "status", "compatibility_rules"))
        for item in data:
            item["id"] = str(item["id"])
        _safe_set(key, data, DROPDOWN_TTL)
        return data

    def get_values(self, field_name, status="active"):
        items = self.get_by_field(field_name, status)
        return [item["value"] for item in items]

    def value_exists(self, field_name, value, status="active"):
        items = self.get_by_field(field_name, status)
        return any(item["value"] == value for item in items)

    def value_exists_iexact(self, field_name, value, status="active"):
        items = self.get_by_field(field_name, status)
        lower = value.lower() if value else ""
        return any(item["value"].lower() == lower for item in items)

    KNOWN_FIELDS = ["product_category", "brand", "system_color", "product_type"]

    def invalidate(self, field_name=None):
        if field_name:
            _safe_delete(f"{self.PREFIX}{field_name}:active")
            _safe_delete(f"{self.PREFIX}{field_name}:")
            _safe_delete(f"{self.PREFIX}{field_name}:None")
        else:
            keys = []
            for f in self.KNOWN_FIELDS:
                keys.extend([f"{self.PREFIX}{f}:active", f"{self.PREFIX}{f}:", f"{self.PREFIX}{f}:None"])
            _safe_delete_many(keys)

    def refresh(self, field_name):
        self.invalidate(field_name)
        self.get_by_field(field_name, status="active")
        self.get_by_field(field_name, status=None)


# ─── VendorCategoryMapping Cache ──────────────────────────────────────────────

class CategoryMappingCache:
    PREFIX = "vcm:"

    def get(self, vendor_company_id, vendor_category):
        if not vendor_company_id or not vendor_category:
            return None
        key = f"{self.PREFIX}{vendor_company_id}:{vendor_category.strip().lower()}"
        result = _safe_get(key)
        if result is not None:
            return result if result != "__NONE__" else None
        from apps.catalog.models import VendorCategoryMapping
        mapping = VendorCategoryMapping.objects.filter(
            vendor_company_reference=vendor_company_id,
            vendor_category__iexact=vendor_category.strip(),
            status="active",
        ).first()
        if mapping:
            data = {
                "id": str(mapping.id),
                "cixci_category": mapping.cixci_category,
                "vendor_category": mapping.vendor_category,
            }
            _safe_set(key, data, CATEGORY_MAPPING_TTL)
            return data
        _safe_set(key, "__NONE__", CATEGORY_MAPPING_TTL)
        return None

    def invalidate(self, vendor_company_id, vendor_category=None):
        if vendor_category:
            _safe_delete(f"{self.PREFIX}{vendor_company_id}:{vendor_category.strip().lower()}")

    def refresh_from_instance(self, mapping):
        key = f"{self.PREFIX}{mapping.vendor_company_reference}:{mapping.vendor_category.strip().lower()}"
        if mapping.status == "active":
            data = {
                "id": str(mapping.id),
                "cixci_category": mapping.cixci_category,
                "vendor_category": mapping.vendor_category,
            }
            _safe_set(key, data, CATEGORY_MAPPING_TTL)
            return data
        _safe_delete(key)
        return None


# ─── Singleton instances ──────────────────────────────────────────────────────

company_cache = CompanyCache()
dropdown_cache = DropdownCache()
category_mapping_cache = CategoryMappingCache()
