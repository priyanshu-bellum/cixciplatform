"""Read-only rollout diagnostic; never enables types or changes source facts."""
import json
from django.core.management.base import BaseCommand
from apps.catalog.models import Product, DynamicDropdownConfig, ProductCompatibilityAssertion
from apps.catalog.compatibility_contract import category_mode, configured_type_ids
from apps.devices.models import DeviceType


class Command(BaseCommand):
    help = "Report compatibility configuration/data gaps without changing records."

    def handle(self, *args, **options):
        configs = {config.value: config for config in DynamicDropdownConfig.objects.filter(field_name="product_category")}
        mismatches = []
        for product in Product.objects.only("id", "sku", "product_category", "compatibility_mode", "compatible_device_types").iterator():
            config = configs.get(product.product_category)
            if config and category_mode(config.compatibility_mode) == "universal" and product.compatibility_mode != "universal_device_type":
                mismatches.append({"sku": product.sku, "category": product.product_category, "product_mode": product.compatibility_mode, "category_mode": config.compatibility_mode})
        report = {
            "read_only": True,
            "disabled_automatic_types": list(DeviceType.objects.filter(code__in=["phone", "tablet", "smartwatch"], auto_mapping_eligible=False).values("id", "name", "status")),
            "active_categories_without_resolved_types": [config.value for config in configs.values() if config.status == "active" and not configured_type_ids(config)],
            "category_product_method_mismatches": mismatches,
            "invalid_direct_type_scopes": list(Product.objects.filter(compatibility_mode="direct_device").exclude(compatible_device_types=[]).values("id", "sku")),
            "active_invalid_universal_assertions": ProductCompatibilityAssertion.objects.filter(product__compatibility_mode="direct_device", compatibility_basis="universal_device_type", is_compatible=True).count(),
            "memory_configurations_needing_review": [config.value for config in configs.values() if "memory_capacity" in (config.accessory_fields or []) and ("storage_expansion_compatibility" not in (config.accessory_fields or []) or config.match_logic not in ("AND", "match_all"))],
        }
        self.stdout.write(json.dumps(report, default=str, indent=2))
