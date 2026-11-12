"""Catalog app config."""
from django.apps import AppConfig


def _refresh_dropdown_cache(sender, instance, **kwargs):
    from config.cache_service import dropdown_cache
    dropdown_cache.refresh(instance.field_name)


def _invalidate_dropdown_cache(sender, instance, **kwargs):
    from config.cache_service import dropdown_cache
    dropdown_cache.invalidate(instance.field_name)


def _refresh_mapping_cache(sender, instance, **kwargs):
    from config.cache_service import category_mapping_cache
    category_mapping_cache.refresh_from_instance(instance)


def _invalidate_mapping_cache(sender, instance, **kwargs):
    from config.cache_service import category_mapping_cache
    category_mapping_cache.invalidate(
        instance.vendor_company_reference, instance.vendor_category
    )


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"
    verbose_name = "Product Catalog"

    def ready(self):
        from django.db.models.signals import post_save, post_delete, post_migrate
        from apps.catalog.models import DynamicDropdownConfig, VendorCategoryMapping
        post_save.connect(_refresh_dropdown_cache, sender=DynamicDropdownConfig)
        post_delete.connect(_invalidate_dropdown_cache, sender=DynamicDropdownConfig)
        post_save.connect(_refresh_mapping_cache, sender=VendorCategoryMapping)
        post_delete.connect(_invalidate_mapping_cache, sender=VendorCategoryMapping)
        from .compatibility_rebuild import rebuild_after_migrate
        post_migrate.connect(rebuild_after_migrate, sender=self, dispatch_uid='catalog.declared_scope_post_migrate_rebuild')
