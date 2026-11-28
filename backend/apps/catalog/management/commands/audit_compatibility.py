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
        # Manual selections that began as Universal matches: before the Vendor
        # Audit editor was corrected it could resubmit rule results as choices.
        # Reported for admin review only; a deliberate selection looks the same.
        former_universal = {}
        manual = ProductCompatibilityAssertion.objects.filter(compatibility_basis="manual_assertion", is_compatible=True, is_excluded=False,
            product__compatibility_mode="direct_device").values_list("product__sku", "match_evidence")
        for sku, evidence in manual.iterator():
            evidence = evidence if isinstance(evidence, dict) else {}
            if "universal" in evidence and (evidence.get("explicit") or {}).get("active"):
                former_universal[sku] = former_universal.get(sku, 0) + 1
        report = {
            "read_only": True,
            "manual_selections_with_universal_origin": [{"sku": sku, "devices": count} for sku, count in sorted(former_universal.items())],
            "disabled_automatic_types": list(DeviceType.objects.filter(status="active", is_active=True, auto_mapping_eligible=False).values("id", "name", "status")),
            "active_categories_without_resolved_types": [config.value for config in configs.values() if config.status == "active" and not configured_type_ids(config)],
            "category_product_method_mismatches": mismatches,
            "invalid_direct_type_scopes": list(Product.objects.filter(compatibility_mode="direct_device").exclude(compatible_device_types=[]).values("id", "sku")),
            "active_invalid_universal_assertions": ProductCompatibilityAssertion.objects.filter(product__compatibility_mode="direct_device", compatibility_basis="universal_device_type", is_compatible=True).count(),
            "memory_configurations_needing_review": [config.value for config in configs.values() if "memory_capacity" in (config.accessory_fields or []) and ("storage_expansion_compatibility" not in (config.accessory_fields or []) or config.match_logic not in ("AND", "match_all"))],
        }
        self.stdout.write(json.dumps(report, default=str, indent=2))
