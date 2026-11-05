"""Tenant app config."""
from django.apps import AppConfig


def _refresh_company_cache(sender, instance, **kwargs):
    from config.cache_service import company_cache
    company_cache.refresh_from_instance(instance)


class TenantConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tenant"
    verbose_name = "Tenant & Company"

    def ready(self):
        from django.db.models.signals import post_save
        from apps.tenant.models import Company
        post_save.connect(_refresh_company_cache, sender=Company)
