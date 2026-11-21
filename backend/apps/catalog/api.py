"""Product Catalog — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db import transaction
from django.db.models import Q
from django.urls import path, include
from django.utils import timezone
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin, BuyerScopedQuerysetMixin
from apps.tenant.services import check_access
from apps.media.utils import media_short_url

from .models import (
    Product, ProductCompatibilityAssertion,
    BuyerScopedCompatibilityProjection, BuyerProductExportJob,
    DynamicDropdownConfig, ProductStatus, VendorCategoryMapping,
    VendorCategoryMappingStatus, VendorColorMapping, VendorColorMappingStatus,
)
from .services import recalculate_buyer_compatibility_projection


# ─── Serializers ──────────────────────────────────────────────────────────────

class ProductSerializerBase(serializers.ModelSerializer):
    vendor_map_pricing_enforced = serializers.SerializerMethodField()
    exported_date = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    universal_device_type_ids = serializers.SerializerMethodField()

    def get_universal_device_type_ids(self, obj):
        if obj.compatibility_mode != "universal_device_type":
            return []
        return [str(value) for value in obj.universal_type_scopes.filter(is_active=True).values_list("device_type_id", flat=True)]

    def get_vendor_name(self, obj):
        try:
            bulk = self.context.get("bulk_companies")
            if bulk is not None:
                vendor = bulk.get(obj.vendor_company_reference)
                return vendor["name"] if vendor else None
            from config.cache_service import company_cache
            return company_cache.get_name(obj.vendor_company_reference)
        except Exception:
            return None

    def get_vendor_map_pricing_enforced(self, obj):
        try:
            bulk = self.context.get("bulk_companies")
            if bulk is not None:
                vendor = bulk.get(obj.vendor_company_reference)
                return vendor["map_pricing_enforced"] if vendor else False
            from config.cache_service import company_cache
            co = company_cache.get(obj.vendor_company_reference)
            return co.get("map_pricing_enforced", False) if co else False
        except Exception:
            return False

    def get_exported_date(self, obj):
        if hasattr(obj, "exported_date") and obj.exported_date is not None:
            if hasattr(obj.exported_date, "isoformat"):
                return obj.exported_date.isoformat()
            return obj.exported_date

        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return None
        company = getattr(request.user, "company", None)
        if not company or company.company_type != "buyer":
            return None

        from apps.catalog.models import BuyerProductExportDate
        exported = BuyerProductExportDate.objects.filter(
            company_scope_reference=company.id,
            buyer_entity_reference=request.user.entity_id,
            product_id=obj.id
        ).first()
        return exported.exported_at.isoformat() if exported else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            bulk_owned = self.context.get("bulk_owned_media")
            if bulk_owned is not None:
                assets = [
                    a for a in bulk_owned.get(instance.id, [])
                    if a.get("status") == "ready"
                ]
                asset_urls = [media_short_url(a['id']) for a in assets]
            else:
                from apps.media.models import MediaAsset
                assets = MediaAsset.objects.filter(owner_record_id=instance.id, status="ready").order_by("created_at")
                asset_urls = [media_short_url(asset.id) for asset in assets]

            existing = ret.get("media_references")
            if not isinstance(existing, list):
                existing = []

            combined = []
            for url in asset_urls:
                if url not in combined:
                    combined.append(url)
            # Only fall back to stored media_references when no MediaAsset
            # records exist (legacy products).  When assets exist, asset_urls
            # is the canonical source and the stored URLs are redundant.
            if not asset_urls:
                for url in existing:
                    if isinstance(url, str) and url not in combined:
                        combined.append(url)

            ret["media_references"] = combined
        except Exception:
            pass

        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user:
            user = request.user
            is_admin = getattr(user, "is_cixci_admin", False) or (
                hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
            )
            is_vendor = (
                hasattr(user, "company") and user.company and user.company.company_type == "vendor"
            )
            is_buyer = (
                hasattr(user, "company") and user.company and user.company.company_type == "buyer"
            )
            if is_buyer and "device_compatibility" in ret:
                from .compatibility_contract import buyer_portfolio_device_ids
                if "_buyer_compatible_devices" not in self.context:
                    self.context["_buyer_compatible_devices"] = {str(value) for value in (buyer_portfolio_device_ids(user) or set())}
                allowed_devices = self.context["_buyer_compatible_devices"]
                ret["device_compatibility"] = [row for row in ret["device_compatibility"] if str(row.get("device_id")) in allowed_devices]
            if is_buyer:
                from .offer_services import mapping_reference
                ret['export_mappings'] = [mapping_reference(mapping) for mapping in getattr(instance, '_buyer_export_mappings', [])]

            # Rule (§5/§6): a vendor admin must see "Vendor Wholesale Price"; a
            # buyer must never see it. Only strip for non-admin, non-vendor users.
            if not (is_admin or is_vendor):
                ret.pop("vendor_wholesale_price_amount", None)
                ret.pop("vendor_wholesale_price_currency", None)
            # Vendors must not see CIXCI's internal buyer wholesale price
            if is_vendor:
                ret.pop("buyer_wholesale_price", None)
            if not is_admin:
                ret.pop("vendor_name", None)
                ret.pop("selling_status", None)
                ret.pop("release_date", None)
                ret.pop("inventory_threshold", None)
                ret.pop("compatibility_status", None)

            # Category Governance: Field visibility by role
            # Buyers see only canonical CIXCI category (product_category)
            if is_buyer:
                ret.pop("compatibility_summary", None)
                ret.pop("vendor_category", None)
                ret.pop("vendor_category_raw", None)
                ret.pop("product_category_override", None)
                ret.pop("product_category_override_by", None)
                ret.pop("product_category_override_at", None)
                ret.pop("category_validation_status", None)
            if is_buyer:
                for field in ("compatibility_mode", "compatible_device_types", "universal_device_type_ids", "headphone_jack_compatibility", "bluetooth_compatibility", "compatible_charging_interface", "wireless_charging_compatibility", "storage_expansion_compatibility", "memory_capacity", "compatible_watch_case_size"):
                    ret.pop(field, None)
            elif is_vendor:
                for field in ("product_category_override", "product_category_override_by", "product_category_override_at", "vendor_category_raw"):
                    ret.pop(field, None)
            # Admins see all fields for governance purposes

        return ret


    def _link_media_assets(self, instance):
        try:
            import re
            from apps.media.models import MediaAsset
            
            asset_ids = set()
            
            # 1. Primary image reference UUID
            if instance.primary_image_reference:
                asset_ids.add(str(instance.primary_image_reference))
                
            # 2. Extract UUIDs from media_references list
            if isinstance(instance.media_references, list):
                for ref in instance.media_references:
                    if isinstance(ref, str):
                        matches = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ref, re.IGNORECASE)
                        if matches:
                            asset_ids.add(matches[-1].lower())
                            
            if asset_ids:
                MediaAsset.objects.filter(id__in=list(asset_ids)).update(
                    owner_record_id=instance.id,
                    owner_module="catalog"
                )
        except Exception:
            pass

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        device_ids = validated_data.pop("device_ids", None)
        update_type = validated_data.pop("compatibility_update_type", "add")
        actor_id = request.user.id if request and request.user and request.user.is_authenticated else None
        instance = self.Meta.model(**validated_data)
        if self.context.get('update_source'):
            instance._update_source = self.context['update_source']
            instance._source_run_reference = self.context.get('source_run_reference')
        instance.save(actor_id=actor_id)
        self._save_explicit_devices(instance, device_ids, update_type, request)
        self._link_media_assets(instance)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        device_ids = validated_data.pop("device_ids", None)
        update_type = validated_data.pop("compatibility_update_type", "add")
        actor_id = request.user.id if request and request.user and request.user.is_authenticated else None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if self.context.get('update_source'):
            instance._update_source = self.context['update_source']
            instance._source_run_reference = self.context.get('source_run_reference')
        instance.save(actor_id=actor_id)
        self._save_explicit_devices(instance, device_ids, update_type, request)
        self._link_media_assets(instance)
        return instance

    def _save_explicit_devices(self, instance, device_ids, update_type, request):
        if device_ids is None:
            return
        if request is None:
            raise serializers.ValidationError({"device_ids": "An authorized actor is required."})
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .compatibility_commands import update_explicit_selections
        try:
            is_vendor_sync = self.context.get('update_source') == 'Vendor API Sync'
            update_explicit_selections(instance, device_ids, request.user, update_type=update_type,
                basis='imported' if is_vendor_sync else 'manual_assertion',
                change_source=self.context.get('update_source') or ("Vendor API" if not getattr(request.user, "is_cixci_admin", False) else "CIXCI Admin"),
                vendor_import=is_vendor_sync)
            instance.refresh_from_db(fields=["compatibility_status"])
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict if hasattr(error, "message_dict") else error.messages) from error


class ProductListSerializer(ProductSerializerBase):
    primary_image_url = serializers.SerializerMethodField()
    buyer_wholesale_price = serializers.ReadOnlyField()
    is_tied_to_activity = serializers.ReadOnlyField()
    device_compatibility = serializers.SerializerMethodField()
    vendor_return_address = serializers.SerializerMethodField()
    vendor_return_address1 = serializers.SerializerMethodField()
    vendor_return_address2 = serializers.SerializerMethodField()
    vendor_return_city = serializers.SerializerMethodField()
    vendor_return_state = serializers.SerializerMethodField()
    vendor_return_zip_code = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "series", "sku", "upc", "brand", "brand_reference", "product_type",
            "product_category", "vendor_category",  # Category Governance
            "vendor_category_raw", "product_category_override",
            "category_validation_status",
            "status",
            "vendor_company_reference", "vendor_name",
            "description", "short_description", "promo_information",
            "msrp", "map_price", "sale_price", "buyer_wholesale_price",
            "vendor_wholesale_price_amount", "vendor_wholesale_price_currency",
            "color", "system_color", "system_colors",
            "launch_date", "eol_date",
            "inventory_level",
            "length", "width", "height", "weight", "weight_unit",
            "warranty",
            "is_clearance", "clearance_type", "clearance_end_date",
            "meta_title", "meta_description",
            "primary_image_reference", "primary_image_url", "media_references",
            "device_compatibility",
            "vendor_return_address",
            "vendor_return_address1",
            "vendor_return_address2",
            "vendor_return_city",
            "vendor_return_state",
            "vendor_return_zip_code",
            "recommended_accessory", "is_tied_to_activity",
            "vendor_map_pricing_enforced", "exported_date",
            "compatibility_mode", "compatible_device_types", "universal_device_type_ids",
        ]
        read_only_fields = ["id"]

    def get_primary_image_url(self, obj):
        if obj.primary_image_reference:
            try:
                bulk = self.context.get("bulk_primary_media")
                if bulk is not None:
                    asset = bulk.get(obj.primary_image_reference)
                    if asset and asset.get("status") == "ready":
                        return media_short_url(asset['id'])
                else:
                    from apps.media.models import MediaAsset
                    asset = MediaAsset.objects.get(id=obj.primary_image_reference)
                    if asset.status == "ready":
                        return media_short_url(asset.id)
            except Exception:
                pass
        if isinstance(obj.media_references, list) and len(obj.media_references) > 0:
            return obj.media_references[0]
        return None

    def get_device_compatibility(self, obj):
        """
        Returns a list of compatible device names (Manufacturer + Device name)
        resolved from ProductCompatibilityAssertion records for this product.
        Internal compat signal fields (headphone_jack, bluetooth, etc.) are
        intentionally excluded from buyer-facing responses.
        """
        try:
            bulk = self.context.get("bulk_compatibility")
            if bulk is not None:
                return bulk.get(obj.id, [])
            from apps.catalog.models import ProductCompatibilityAssertion
            from apps.devices.models import Device
            assertions = ProductCompatibilityAssertion.objects.filter(
                product=obj,
                is_compatible=True,
                is_excluded=False,
            ).values_list("device_reference", flat=True)
            if not assertions:
                return []
            devices = Device.objects.filter(id__in=assertions).select_related("manufacturer")
            return [
                {
                    "device_id": str(d.id),
                    "name": f"{d.manufacturer.name} {d.name}",
                    "model_number": d.model_number or "",
                }
                for d in devices
            ]
        except Exception:
            return []

    def _get_vendor_address_data(self, obj):
        try:
            vendor_id = str(obj.vendor_company_reference)
            product_id = str(obj.id)
            emitted = self.context.setdefault("vendor_address_emitted", {})
            if vendor_id in emitted:
                if emitted[vendor_id]["product_id"] == product_id:
                    return emitted[vendor_id]["data"]
                return None

            bulk = self.context.get("bulk_companies")
            if bulk is not None:
                vendor = bulk.get(obj.vendor_company_reference)
                if not vendor:
                    emitted[vendor_id] = {"product_id": product_id, "data": None}
                    return None
                data = {
                    "vendor_return_address1": vendor.get("return_address_line1") or "",
                    "vendor_return_address2": vendor.get("return_address_line2") or "",
                    "vendor_return_city": vendor.get("return_city") or "",
                    "vendor_return_state": vendor.get("return_state") or "",
                    "vendor_return_zip_code": vendor.get("return_zip_code") or "",
                }
                emitted[vendor_id] = {"product_id": product_id, "data": data}
                return data

            from apps.tenant.models import Company
            vendor = Company.objects.filter(id=obj.vendor_company_reference).first()
            if not vendor:
                emitted[vendor_id] = {"product_id": product_id, "data": None}
                return None

            data = {
                "vendor_return_address1": vendor.return_address_line1 or "",
                "vendor_return_address2": vendor.return_address_line2 or "",
                "vendor_return_city": vendor.return_city or "",
                "vendor_return_state": vendor.return_state or "",
                "vendor_return_zip_code": vendor.return_zip_code or "",
            }
            emitted[vendor_id] = {"product_id": product_id, "data": data}
            return data
        except Exception:
            return None

    def get_vendor_return_address(self, obj):
        """
        Returns the vendor's return address fields the first time a product from
        that vendor appears in the serialized list (once per vendor per response).
        Subsequent products from the same vendor return null — the buyer has already
        received the address. This matches the spec rule: address sent once per
        vendor per buyer per export.
        """
        return self._get_vendor_address_data(obj)

    def get_vendor_return_address1(self, obj):
        data = self._get_vendor_address_data(obj)
        return data.get("vendor_return_address1") if data else None

    def get_vendor_return_address2(self, obj):
        data = self._get_vendor_address_data(obj)
        return data.get("vendor_return_address2") if data else None

    def get_vendor_return_city(self, obj):
        data = self._get_vendor_address_data(obj)
        return data.get("vendor_return_city") if data else None

    def get_vendor_return_state(self, obj):
        data = self._get_vendor_address_data(obj)
        return data.get("vendor_return_state") if data else None

    def get_vendor_return_zip_code(self, obj):
        data = self._get_vendor_address_data(obj)
        return data.get("vendor_return_zip_code") if data else None



class VendorAuditProductSerializer(ProductListSerializer):
    """Admin comparison of redacted vendor observations and canonical state."""
    vendor_payload = serializers.SerializerMethodField()
    audit_status = serializers.SerializerMethodField()
    review_errors = serializers.SerializerMethodField()
    device_assertions = serializers.SerializerMethodField()
    payload_devices = serializers.SerializerMethodField()
    payload_images = serializers.SerializerMethodField()
    payload_category = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['vendor_payload','audit_status','review_errors',
            'device_assertions','payload_devices','payload_images','payload_category']

    def _source(self, obj):
        return self.context.get('bulk_sources',{}).get(obj.pk,{})

    def get_vendor_payload(self, obj):
        return self._source(obj).get('payload',{})

    def get_audit_status(self, obj):
        return obj._audit_status

    def get_review_errors(self, obj):
        return self._source(obj).get('review_errors',[])

    def get_device_assertions(self, obj):
        return self.context.get('bulk_compatibility',{}).get(obj.pk,[])

    def get_payload_devices(self, obj):
        from .vendor_audit import declared_devices
        return declared_devices(self._source(obj))

    def get_payload_images(self, obj):
        source = self._source(obj)
        images = source.get('mapped_fields',{}).get('images',
            source.get('payload',{}).get('image_urls',source.get('payload',{}).get('images',[])))
        return images if isinstance(images,list) else []

    def get_payload_category(self, obj):
        source = self._source(obj)
        return source.get('mapped_fields',{}).get('vendor_category',source.get('payload',{}).get('category',''))


class ProductDetailSerializer(ProductSerializerBase):
    vendor_company_reference = serializers.UUIDField(required=False)
    device_ids = serializers.ListField(child=serializers.UUIDField(), required=False, write_only=True)
    compatibility_update_type = serializers.ChoiceField(choices=["add", "replace"], required=False, write_only=True)
    compatibility_summary = serializers.SerializerMethodField()

    def get_compatibility_summary(self, obj):
        from django.db.models import Count
        from .compatibility_contract import eligible_devices
        counts = obj.compatibility_assertions.aggregate(
            matched=Count("id", filter=Q(is_compatible=True, is_excluded=False, device_reference__in=eligible_devices().values_list("id", flat=True))),
            excluded=Count("id", filter=Q(is_excluded=True)),
            pending=Count("id", filter=Q(match_status="Pending")),
        )
        return {**counts, "status": obj.compatibility_status, "warning": "Compatibility Incomplete: no currently eligible devices match." if not counts["matched"] else ""}
    primary_image_url = serializers.SerializerMethodField()
    device_compatibility = serializers.SerializerMethodField()
    buyer_wholesale_price = serializers.ReadOnlyField()
    is_tied_to_activity = serializers.ReadOnlyField()
    media_readiness = serializers.SerializerMethodField()

    def get_device_compatibility(self, obj):
        return ProductListSerializer.get_device_compatibility(self, obj)

    headphone_jack_compatibility = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Headphone jack type (e.g., '3.5mm', 'USB-C', 'Lightning'). Required for certain categories. Defaults to 'Not Compatible' if omitted."
    )
    bluetooth_compatibility = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Bluetooth version (e.g., 'Bluetooth 5.0', 'Bluetooth 5.3'). Required for certain categories. Defaults to 'Yes' if omitted."
    )
    compatible_charging_interface = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Charging port type (e.g., 'USB-C', 'Lightning', 'Wireless Only'). Required for certain categories. Defaults to 'Not Compatible' if omitted."
    )
    wireless_charging_compatibility = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Wireless charging standards (e.g., 'Qi', 'MagSafe'). Optional. Defaults to 'Not Compatible' if omitted."
    )
    storage_expansion_compatibility = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Memory card type (e.g., 'microSD', 'SD'). Required for certain categories. Defaults to 'Not Compatible' if omitted."
    )
    memory_capacity = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Storage capacity (e.g., '64GB', '128GB'). Required when storage expansion is compatible. Defaults to 'Not Compatible' otherwise."
    )
    compatible_watch_case_size = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text="Watch case size (e.g., '40mm', '44mm'). Required for certain categories. Defaults to 'Not Compatible' if omitted."
    )

    class Meta:
        model = Product
        # Explicit field order: Core fields first, compatibility fields last
        fields = [
            # Identifiers
            "id",
            "name",
            "series",
            "sku",
            "upc",

            # Basic Info
            "product_type",
            "vendor_category",
            "vendor_category_raw",
            "product_category",
            "product_category_override",
            "product_category_override_by",
            "product_category_override_at",
            "category_validation_status",
            "brand",
            "brand_reference",
            "description",
            "short_description",

            # Pricing
            "vendor_wholesale_price_amount",
            "vendor_wholesale_price_currency",
            "buyer_wholesale_price",
            "msrp",
            "map_price",
            "sale_price",

            # Status & Dates
            "status",
            "selling_status",
            "launch_date",
            "release_date",
            "eol_date",

            # Physical Attributes
            "color",
            "system_color",
            "system_colors",
            "length",
            "width",
            "height",
            "weight",
            "weight_unit",

            # Inventory
            "inventory_level",
            "inventory_threshold",

            # Media
            "primary_image_reference",
            "primary_image_url",
            "media_references",
            "media_readiness",

            # Marketing
            "warranty",
            "promo_information",
            "recommended_accessory",
            "meta_title",
            "meta_description",

            # Device Compatibility (at the end)
            "compatibility_mode", "universal_device_type_ids", "device_compatibility",
            "device_ids", "compatibility_update_type", "compatibility_summary",
            "compatible_device_types",
            "headphone_jack_compatibility",
            "bluetooth_compatibility",
            "compatible_charging_interface",
            "wireless_charging_compatibility",
            "storage_expansion_compatibility",
            "memory_capacity",
            "compatible_watch_case_size",

            # Clearance
            "is_clearance",
            "clearance_type",
            "clearance_end_date",

            # Sync & Source Preservation
            "needs_buyer_sync",
            "vendor_original_data",

            # System Fields
            "vendor_company_reference",
            "company_scope_reference",
            "deactivation_reason",
            "is_tied_to_activity",
            "created_at",
            "updated_at",
            "exported_date",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "company_scope_reference"]
        validators = []  # Supplier ownership is resolved before scoped checks.

    def validate_upc(self, value):
        if not value:
            raise serializers.ValidationError("UPC is required.")
        val_str = str(value).strip()
        if len(val_str) != 12 or not val_str.isdigit():
            raise serializers.ValidationError("UPC must follow valid UPC-A format (12 numeric characters).")
        
        return val_str

    def validate_status(self, value):
        from apps.catalog.models import ProductStatus
        valid_statuses = [choice[0] for choice in ProductStatus.choices]
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Invalid Product Status value. Allowed values: {', '.join(valid_statuses)}.")
        return value

    def validate_inventory_level(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Inventory Level must be a non-negative integer.")
        return value

    def _resolve_vendor_category_mapping(self, vendor_category, vendor_company_ref):
        """
        Resolve vendor category to canonical CIXCI category using VendorCategoryMapping.
        Returns (cixci_category, needs_review) tuple.
        """
        from apps.catalog.models import VendorCategoryMapping, VendorCategoryMappingStatus

        if not vendor_category:
            return None, False

        # Look up active mapping
        mapping = VendorCategoryMapping.objects.filter(
            vendor_company_reference=vendor_company_ref,
            vendor_category__iexact=vendor_category.strip(),
            status=VendorCategoryMappingStatus.ACTIVE
        ).first()

        if mapping:
            return mapping.cixci_category, False
        else:
            # No mapping found - needs review
            return None, True

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None
        is_vendor = (
            user and hasattr(user, 'company') and user.company
            and user.company.company_type == 'vendor' and not getattr(user, 'is_cixci_admin', False)
        )
        is_admin = user and getattr(user, 'is_cixci_admin', False)
        if is_vendor:
            attrs["vendor_company_reference"] = user.company.id
        if self.instance is None:
            from apps.tenant.models import Company
            vendor_id = attrs.get("vendor_company_reference")
            if not vendor_id or not Company.objects.filter(pk=vendor_id, company_type="vendor").exists():
                raise serializers.ValidationError({"vendor_company_reference": "Select an existing supplier company; vendor requests use their authenticated company."})

        owner_id = attrs.get('vendor_company_reference') or (self.instance.vendor_company_reference if self.instance else None)
        if self.instance and 'vendor_company_reference' in attrs and owner_id != self.instance.vendor_company_reference:
            raise serializers.ValidationError({'vendor_company_reference': 'An existing supplier offer cannot change Vendor ownership.'})
        for field in ('sku', 'upc'):
            if field in attrs and attrs[field]:
                duplicates = Product.objects.filter(vendor_company_reference=owner_id, **{field: attrs[field]})
                if self.instance:
                    duplicates = duplicates.exclude(pk=self.instance.pk)
                if duplicates.exists():
                    message = 'UPC must be unique per product within this supplier.' if field == 'upc' else 'SKU is already used by this supplier.'
                    raise serializers.ValidationError({field: message})
        if attrs.get('brand') and not attrs.get('brand_reference'):
            from .models import VendorBrandRelationship
            key = ' '.join(attrs['brand'].split()).casefold()
            link = VendorBrandRelationship.objects.filter(vendor_company_id=owner_id, is_active=True, brand__is_active=True, brand__canonical_key=key).select_related('brand').first()
            if link:
                attrs['brand_reference'] = link.brand
            elif is_vendor and attrs['brand'] != user.company.name and (not self.instance or attrs['brand'] != self.instance.brand):
                raise serializers.ValidationError({'brand': 'Ask CIXCI Admin to approve this supplier’s Owned or Authorized Distributor Brand relationship.'})
        if attrs.get('brand_reference'):
            from .models import VendorBrandRelationship
            brand = attrs['brand_reference']
            if not VendorBrandRelationship.objects.filter(vendor_company_id=owner_id, brand=brand, is_active=True, brand__is_active=True).exists():
                raise serializers.ValidationError({'brand_reference': 'An active approved Brand relationship is required for this supplier.'})
            raw_brand = attrs.get('brand')
            if raw_brand and ' '.join(raw_brand.split()).casefold() not in (brand.canonical_key, ' '.join(brand.name.split()).casefold()):
                raise serializers.ValidationError({'brand': 'Brand display value must identify the selected canonical Brand.'})
            attrs.setdefault('brand', brand.name)

        # ── Category Governance ──────────────────────────────────────────
        from apps.catalog.models import CategoryValidationStatus

        if is_vendor:
            vendor_category_input = attrs.get('vendor_category')
            product_category_direct = attrs.get('product_category')
            if 'product_category_override' in attrs:
                raise serializers.ValidationError({'product_category_override': 'Only CIXCI Admins can set a category override.'})
            override = self.instance.product_category_override if self.instance else None
            if override and product_category_direct and product_category_direct != override:
                raise serializers.ValidationError({'product_category': 'This product has a saved CIXCI Admin category override.'})

            # Manual Vendors select a governed CIXCI category. Their external
            # grouping is optional metadata; legacy API mappings remain supported.
            if vendor_category_input is not None:
                attrs['vendor_category_raw'] = vendor_category_input
                attrs['vendor_category'] = vendor_category_input.strip()
            if override:
                attrs['product_category'] = override
                attrs['category_validation_status'] = CategoryValidationStatus.OVERRIDE_APPLIED
            elif product_category_direct:
                approved = DynamicDropdownConfig.objects.filter(field_name='product_category', value__iexact=product_category_direct, status='active').first()
                if not approved:
                    raise serializers.ValidationError({'product_category': 'Select an active approved CIXCI Product Category.'})
                attrs['product_category'] = approved.value
                attrs['category_validation_status'] = CategoryValidationStatus.RESOLVED
            elif vendor_category_input:
                cixci_cat, needs_mapping = self._resolve_vendor_category_mapping(vendor_category_input.strip(), user.company.id)
                attrs['product_category'] = cixci_cat
                attrs['category_validation_status'] = CategoryValidationStatus.MAPPING_REQUIRED if needs_mapping else CategoryValidationStatus.RESOLVED

        elif is_admin:
            # Admin can set product_category_override
            override = attrs.get('product_category_override')
            if override:
                attrs['product_category'] = override
                attrs['category_validation_status'] = CategoryValidationStatus.OVERRIDE_APPLIED
                attrs['product_category_override_by'] = user.id
                from django.utils import timezone as tz
                attrs['product_category_override_at'] = tz.now()

            # Admin: store vendor_category_raw if vendor_category is provided
            vendor_category_input = attrs.get('vendor_category')
            if vendor_category_input:
                attrs['vendor_category_raw'] = vendor_category_input
                attrs['vendor_category'] = vendor_category_input.strip()

        category = attrs.get('product_category', self.instance.product_category if self.instance else None)
        from copy import copy
        from django.core.exceptions import ValidationError as CompatibilityValidationError
        from .compatibility_contract import validate_product_scope
        from .compatibility_values import validate_compatibility_values
        candidate = copy(self.instance) if self.instance else Product()
        for field, value in attrs.items():
            setattr(candidate, field, value)
        try:
            original = self.instance if 'compatible_device_types' not in attrs else None
            types = validate_product_scope(candidate, original=original)
            attrs['compatible_device_types'] = [record.code for record in types]
            if category:
                config = DynamicDropdownConfig.objects.filter(field_name='product_category', value=category).first()
                if config is None or config.status != 'active':
                    raise CompatibilityValidationError({'product_category': 'Select an active configured product category.'})
                validate_compatibility_values(attrs, instance=self.instance, rules=config.compatibility_rules, assigned_fields=config.accessory_fields)
        except CompatibilityValidationError as error:
            raise serializers.ValidationError(error.message_dict) from error

        # ── Media readiness gate (Rule §21/§31) ──
        # A product may be saved as Draft without media, but cannot become
        # Active without a valid, transparent PNG primary image.
        # Vendor API Sync bypasses this gate: images are processed separately.
        from apps.catalog.models import ProductStatus
        new_status = attrs.get("status", self.instance.status if self.instance else None)
        if new_status == ProductStatus.ACTIVE and self.context.get('update_source') != 'Vendor API Sync':
            gate_instance = self.instance
            if gate_instance is None:
                gate_instance = self.Meta.model(**{
                    k: v for k, v in attrs.items()
                    if k in {f.name for f in self.Meta.model._meta.fields}
                })
                if "primary_image_reference" in attrs:
                    gate_instance.primary_image_reference = attrs["primary_image_reference"]
            else:
                # Reflect pending changes on a shallow copy for evaluation
                for k in ("primary_image_reference", "media_references"):
                    if k in attrs:
                        setattr(gate_instance, k, attrs[k])

            from apps.media.readiness import compute_media_readiness
            readiness = compute_media_readiness(gate_instance)
            if not readiness.is_ready:
                raise serializers.ValidationError({
                    "status": (
                        "A product cannot be Active without at least one valid, "
                        "transparent PNG primary image. "
                        f"({readiness.reason})"
                    ),
                    "media_readiness": {
                        "is_ready": False,
                        "issues": readiness.issues,
                        "reason": readiness.reason,
                    },
                })

        return attrs

    def get_media_readiness(self, obj):
        try:
            from apps.media.readiness import compute_media_readiness
            r = compute_media_readiness(obj)
            return {
                "is_ready": r.is_ready,
                "has_primary": r.has_primary,
                "primary_is_valid": r.primary_is_valid,
                "valid_image_count": r.valid_image_count,
                "reason": r.reason,
                "issues": r.issues,
                "primary_url": r.primary_url,
            }
        except Exception:
            return None


    def get_primary_image_url(self, obj):
        if obj.primary_image_reference:
            try:
                from apps.media.models import MediaAsset
                asset = MediaAsset.objects.get(id=obj.primary_image_reference)
                if asset.status == "ready":
                    return media_short_url(asset.id)
            except Exception:
                pass
        # Fallback to external media_references URLs if available
        if isinstance(obj.media_references, list) and len(obj.media_references) > 0:
            return obj.media_references[0]
        return None


class ProductCompatibilityAssertionSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    device_type_name = serializers.SerializerMethodField()
    device_record_found = serializers.SerializerMethodField()

    def _device(self, instance):
        if "_assertion_devices" not in self.context:
            from apps.devices.models import Device
            parent = getattr(self, "parent", None)
            rows = getattr(parent, "instance", None) if parent else None
            rows = rows if rows is not None else [instance]
            ids = [row.device_reference for row in rows]
            self.context["_assertion_devices"] = {row.id: row for row in Device.objects.filter(id__in=ids).select_related("manufacturer", "device_type")}
        return self.context["_assertion_devices"].get(instance.device_reference)

    def get_device_name(self, instance):
        device = self._device(instance)
        return str(device) if device else "Device record unavailable"

    def get_device_type_name(self, instance):
        device = self._device(instance)
        return device.device_type.name if device and device.device_type else None

    def get_device_record_found(self, instance):
        return self._device(instance) is not None

    def validate_device_reference(self, value):
        from apps.devices.models import Device
        if not Device.objects.filter(id=value).exists():
            raise serializers.ValidationError("Select an existing canonical device.")
        return value

    class Meta:
        model = ProductCompatibilityAssertion
        fields = [
            "id", "product", "device_reference",
            "capability_evidence_snapshot_reference",
            "is_compatible", "compatibility_basis", "notes", "asserted_at",
            "is_excluded", "exclusion_type", "is_locked",
            "vendor_company_reference", "sku", "device_status_at_mapping",
            "device_launch_date_at_mapping", "match_source", "match_reason",
            "match_status", "exclusion_source", "exclusion_reason",
            "created_by", "updated_by", "reviewed_by", "reviewed_date",
            "created_at", "updated_at", "device_name", "device_type_name", "device_record_found", "match_evidence"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "asserted_at"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user:
            user = request.user
            is_admin = getattr(user, "is_cixci_admin", False)
            is_vendor = getattr(user, "company", None) and getattr(user.company, "company_type", None) == "vendor"
            
            if not is_admin and not is_vendor:
                public_fields = {"id", "product", "device_reference", "device_name", "device_type_name", "device_record_found", "is_compatible"}
                ret = {field: value for field, value in ret.items() if field in public_fields}
        return ret


class BuyerCompatibilityProjectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerScopedCompatibilityProjection
        fields = [
            "id", "status",
            "compatible_product_ids", "compatible_product_count",
            "incompatible_product_ids",
            "portfolio_snapshot_reference",
            "last_recalculated_at", "recalculation_trigger",
        ]
        read_only_fields = ["id", "last_recalculated_at"]


class BuyerExportJobSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    buyer_company_name = serializers.SerializerMethodField()
    products_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = BuyerProductExportJob
        fields = [
            "id", "status", "format", "include_incompatible",
            "portfolio_snapshot_reference", "product_count",
            "output_file_reference", "download_url", "created_at", "completed_at",
            "trigger_type", "triggered_by_id", "triggered_by_name", "triggered_by_role", "failure_details",
            "buyer_company_name", "products_snapshot", "storefront"
        ]

    def get_download_url(self, obj):
        if obj.status == "completed" and obj.output_file_reference:
            from apps.media.models import MediaAsset
            asset = MediaAsset.objects.filter(id=obj.output_file_reference).first()
            if asset and asset.storage_key:
                return media_short_url(asset.id)
        return None

    def get_buyer_company_name(self, obj):
        from config.cache_service import company_cache
        return company_cache.get_name(obj.company_scope_reference) or "Unknown Buyer"

    def get_products_snapshot(self, obj):
        snapshot = getattr(obj, "selection_snapshot", None)
        if snapshot and hasattr(snapshot, "exported_products_snapshot") and snapshot.exported_products_snapshot:
            return snapshot.exported_products_snapshot
        if snapshot and snapshot.product_ids:
            from apps.catalog.models import Product
            from config.cache_service import company_cache
            products = list(Product.objects.filter(id__in=snapshot.product_ids))
            vendor_ids = list({p.vendor_company_reference for p in products if p.vendor_company_reference})
            vendors = company_cache.bulk_get(vendor_ids)
            image_refs = [p.primary_image_reference for p in products if p.primary_image_reference]
            asset_map = {}
            if image_refs:
                from apps.media.models import MediaAsset
                asset_map = {
                    str(a.id): a for a in MediaAsset.objects.filter(id__in=image_refs, status="ready")
                }
            data = []
            for p in products:
                primary_image_url = ""
                if p.primary_image_reference:
                    asset = asset_map.get(str(p.primary_image_reference))
                    if asset:
                        primary_image_url = media_short_url(asset.id)
                if not primary_image_url and isinstance(p.media_references, list) and len(p.media_references) > 0:
                    primary_image_url = p.media_references[0]
                vendor = vendors.get(str(p.vendor_company_reference))
                data.append({
                    "product_id": str(p.id),
                    "vendor_name": vendor["name"] if vendor else "Unknown Vendor",
                    "primary_image_url": primary_image_url or "",
                    "product_name": p.name,
                    "sku": p.sku,
                    "upc": p.upc or ""
                })
            return data
        return []



class DynamicDropdownConfigSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(required=False, allow_blank=True)
    linked_product_count = serializers.SerializerMethodField()

    _FIELD_TO_PRODUCT_COLUMN = {
        "product_category": "product_category",
        "system_color": "system_color",
        "brand": "brand",
    }

    class Meta:
        model = DynamicDropdownConfig
        fields = [
            "id", "field_name", "value", "display_name", "created_at",
            "status", "compatibility_mode", "eligible_device_types",
            "match_logic", "accessory_fields", "compatibility_rules",
            "linked_product_count",
        ]
        read_only_fields = ["id", "created_at", "linked_product_count"]

    def get_linked_product_count(self, obj):
        product_field = self._FIELD_TO_PRODUCT_COLUMN.get(obj.field_name)
        if not product_field:
            return 0
        return Product.objects.filter(**{product_field: obj.value}).count()

    def validate(self, attrs):
        from django.core.exceptions import ValidationError as ConfigurationValidationError
        from .compatibility_contract import validate_category_configuration
        from .compatibility_values import MANAGED_FIELDS, WIRELESS_POLICY_FIELD, validate_managed_configuration
        if self.instance is None or "display_name" in attrs:
            attrs["display_name"] = attrs.get("display_name") or attrs.get("value", self.instance.value if self.instance else "")
        try:
            validate_managed_configuration(attrs, self.instance)
            if attrs["field_name"] == "product_category":
                validate_category_configuration(attrs, self.instance)
            elif attrs["field_name"] in MANAGED_FIELDS + (WIRELESS_POLICY_FIELD,):
                if self.instance is None:
                    attrs.setdefault("status", "active")
                if attrs.get("status", self.instance.status if self.instance else "active") not in ("active", "inactive", "retired", "setup_required"):
                    raise ConfigurationValidationError({"status": "Invalid controlled value status."})
        except ConfigurationValidationError as error:
            raise serializers.ValidationError(error.message_dict) from error
        return attrs


# ─── Product list filtering + pagination ─────────────────────────────────────

class CSVInFilter(django_filters.BaseInFilter):
    """
    Comma-separated multi-value filter (e.g. ?brand=Apple,Samsung).
    django-filter's BaseInFilter expects a list; query strings arrive as CSV.
    """
    def filter(self, qs, value):
        if value in (None, "", []):
            return qs
        if isinstance(value, str):
            value = [v.strip() for v in value.split(",") if v.strip()]
            if not value:
                return qs
        return super().filter(qs, value)


class ProductFilterSet(django_filters.FilterSet):
    sku = django_filters.CharFilter(field_name="sku", lookup_expr="exact")
    """
    Server-side filters for the Product Catalog list.

    These mirror the filters the Catalog UI applies client-side, so that the
    list can be paginated server-side without the client needing every row.
    """
    product_category = CSVInFilter(field_name="product_category", lookup_expr="in")
    brand = CSVInFilter(method="filter_brand")
    color = CSVInFilter(method="filter_color")
    msrp_range = CSVInFilter(method="filter_msrp_range")
    projection_scope = django_filters.BooleanFilter(method="filter_projection_scope")
    product_ids = django_filters.CharFilter(method="filter_product_ids")
    vendor_name = django_filters.CharFilter(method="filter_vendor_name")
    has_map_price = django_filters.BooleanFilter(method="filter_has_map_price")
    has_wholesale_price = django_filters.BooleanFilter(method="filter_has_wholesale_price")

    class Meta:
        model = Product
        fields = [
            "product_type", "status", "selling_status", "vendor_company_reference",
        ]

    def filter_color(self, queryset, name, value):
        """A product matches when its color OR its system_color is selected."""
        if not value:
            return queryset
        if isinstance(value, str):
            value = [v.strip() for v in value.split(",") if v.strip()]
        if not value:
            return queryset
        from django.db.models import Q
        q = Q(color__in=value) | Q(system_color__in=value)
        for v in value:
            q |= Q(system_colors__contains=[v])
        return queryset.filter(q)

    def filter_msrp_range(self, queryset, name, value):
        """
        MSRP band filter. Bands match the UI options:
        0-25, 25-50, 50-100, 100-200, 200+ (values are inclusive of the
        lower bound and the upper bound except for the open-ended top band).
        """
        if not value:
            return queryset
        if isinstance(value, str):
            value = [v.strip() for v in value.split(",") if v.strip()]
        if not value:
            return queryset

        from decimal import Decimal
        from django.db.models import Q

        bands = {
            "0-25": (Decimal("0"), Decimal("25"), False),
            "25-50": (Decimal("25"), Decimal("50"), True),
            "50-100": (Decimal("50"), Decimal("100"), True),
            "100-200": (Decimal("100"), Decimal("200"), True),
            "200+": (Decimal("200"), None, True),
        }

        query = Q()
        matched = False
        for band in value:
            if band not in bands:
                continue
            low, high, low_inclusive = bands[band]
            if high is None:
                cond = Q(msrp__gte=low) if low_inclusive else Q(msrp__gt=low)
            else:
                cond = Q(msrp__gte=low, msrp__lte=high) if low_inclusive else Q(msrp__gt=low, msrp__lte=high)
            query = query | cond
            matched = True

        if not matched:
            return queryset
        return queryset.filter(query)

    def filter_brand(self, queryset, name, value):
        values = [item.strip() for item in value if item and item.strip()]
        if not values:
            return queryset
        query = Q(brand_reference__canonical_key__in=[' '.join(item.split()).casefold() for item in values])
        for item in values:
            query |= Q(brand__iexact=item)
        return queryset.filter(query)

    def filter_product_ids(self, queryset, name, value):
        """Restrict to an explicit set of product UUIDs (buyer projection scope)."""
        if not value:
            return queryset
        ids = [v.strip() for v in str(value).split(",") if v.strip()]
        if not ids:
            return queryset
        return queryset.filter(id__in=ids)

    def filter_vendor_name(self, queryset, name, value):
        """Filter products whose vendor company name contains the search term."""
        if not value:
            return queryset
        from apps.tenant.models import Company
        vendor_ids = Company.objects.filter(
            name__icontains=value, company_type="vendor"
        ).values_list("id", flat=True)
        return queryset.filter(vendor_company_reference__in=vendor_ids)

    def filter_has_map_price(self, queryset, name, value):
        """True → has a MAP price; False → MAP price is null."""
        if value is None:
            return queryset
        if value:
            return queryset.filter(map_price__isnull=False)
        return queryset.filter(map_price__isnull=True)

    def filter_has_wholesale_price(self, queryset, name, value):
        """True → has a positive wholesale price; False → missing or zero."""
        if value is None:
            return queryset
        if value:
            return queryset.filter(
                vendor_wholesale_price_amount__isnull=False,
                vendor_wholesale_price_amount__gt=0,
            )
        return queryset.filter(
            Q(vendor_wholesale_price_amount__isnull=True)
            | Q(vendor_wholesale_price_amount=0)
        )

    def filter_projection_scope(self, queryset, name, value):
        """
        Restrict to the buyer's own compatibility projection.

        The projection id set is resolved on the server rather than sent as a
        query parameter — a buyer can have thousands of compatible products and
        the resulting URL would exceed the request-line limit.
        """
        if not value:
            return queryset
        user = getattr(self.request, "user", None)
        if not user or user.is_anonymous or not getattr(user, "entity", None):
            return queryset.none()

        from .services import ensure_buyer_compatibility_projection
        projection = ensure_buyer_compatibility_projection(user)
        if projection is None:
            return queryset.none()
        ids = [str(i) for i in (projection.compatible_product_ids or [])]
        if not ids:
            return queryset.none()
        return queryset.filter(id__in=ids)


class ProductPagination(PageNumberPagination):
    """
    Numbered pagination for the catalog list.

    The Catalog UI shows "Page X of Y" with prev/next controls, so a
    page-number scheme is used rather than the platform-wide cursor scheme.
    `paginate=false` still returns the full list for internal/export callers.
    """
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class CatalogSearchFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        from decimal import Decimal, InvalidOperation
        fields = list(super().get_search_fields(view, request) or [])
        try:
            numeric = Decimal(str(request.query_params.get("search", ""))).is_finite()
        except InvalidOperation:
            numeric = False
        if numeric:
            fields.append("msrp")
            company = getattr(request.user, "company", None)
            if getattr(request.user, "is_cixci_admin", False) or (company and company.company_type == "vendor"):
                fields.append("vendor_wholesale_price_amount")
        return fields


class ProductViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    action_capability_map = {
        "list": "catalog.product.list",
        "matching_ids": "catalog.product.list",
        "filter_options": "catalog.product.list",
        "retrieve": "catalog.product.read",
        "create": "catalog.product.create",
        "update": "catalog.product.update",
        "partial_update": "catalog.product.update",
        "destroy": "catalog.product.delete",
        "set_selling_status": "catalog.product.manage_selling",
        "compatibility": "catalog.product.read",
        "bulk_upload": "catalog.product.create",
        "recalculate_compatibility": "catalog.product.update",
        "recalculate_bulk_compatibility": "catalog.product.update",
        "audit_history": "catalog.product.read",
        "vendor_audit": "catalog.product.list",
        "vendor_audit_stats": "catalog.product.list",
        "map_devices": "catalog.product.update",
        "bulk_map_devices": "catalog.product.update",
        "resolve_review": "catalog.product.update",
        "bulk_resolve_review": "catalog.product.update",
    }

    def get_throttles(self):
        """Apply role-based throttling."""
        from config.throttling import VendorRateThrottle, BuyerRateThrottle, AdminRateThrottle
        # Apply role-specific throttles (they auto-check user role)
        return [VendorRateThrottle(), BuyerRateThrottle(), AdminRateThrottle()]
    filter_backends = [DjangoFilterBackend, CatalogSearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilterSet
    search_fields = [
        "name",
        "sku",
        "upc",
        "brand",
        "product_category",
        "color",
        "status",
    ]
    ordering_fields = ["name", "created_at", "exported_date", "status"]
    ordering = ["status", "-created_at"]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action in {'vendor_audit','vendor_audit_stats','map_devices',
                'bulk_map_devices','resolve_review','bulk_resolve_review'} and not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vendor product audit requires CIXCI System Admin authority.')
        if self.action in ["create", "update", "partial_update", "destroy", "bulk_upload"]:
            user = request.user
            if user and not getattr(user, "is_cixci_admin", False):
                company = getattr(user, "company", None)
                if company and getattr(company, "company_type", None) == "buyer":
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Buyer users cannot create or modify catalog products.")

    def get_serializer_class(self):
        if self.action in ["retrieve", "create", "update", "partial_update"]:
            return ProductDetailSerializer
        return ProductListSerializer

    def get_serializer_context(self):
        """
        Inject a shared mutable dict into serializer context so that
        vendor_return_address is emitted only once per vendor per response.
        """
        ctx = super().get_serializer_context()
        # Only needed for list action; dict is mutated in-place by the serializer
        if getattr(self, "action", None) == "list":
            ctx["vendor_address_emitted"] = {}
        # Bulk-prefetched maps (media / vendors / compatibility) — built in list()
        # to avoid the N+1 query pattern in the serializer.
        bulk = getattr(self, "_bulk_ctx", None)
        if bulk:
            ctx.update(bulk)
        return ctx

    @property
    def pagination_class(self):
        """
        Numbered pagination for the catalog list.

        `paginate=false` returns the complete list (used by internal/export
        callers that need every row).
        """
        request = getattr(self, "request", None)
        if request is not None and request.query_params.get("paginate") == "false":
            return None
        return ProductPagination

    def _build_bulk_context(self, products):
        """
        Pre-load the related rows needed by ProductListSerializer in a fixed
        number of queries, instead of one query per product per relation.

        Without this the catalog list issued ~5 queries per row (media assets,
        vendor company x2, primary image, compatibility assertions + devices),
        which is what made the Catalog page slow to load.
        """
        if not products:
            return {}

        from apps.media.models import MediaAsset
        from apps.tenant.models import Company
        from apps.catalog.models import ProductCompatibilityAssertion
        from apps.devices.models import Device
        from django.conf import settings

        product_ids = [p.id for p in products]
        media_url = getattr(settings, "MEDIA_URL", "/media/")

        # ── Media assets: primary images (by id) + owned assets (by owner id) ──
        primary_ids = {p.primary_image_reference for p in products if p.primary_image_reference}
        assets = MediaAsset.objects.filter(
            Q(id__in=primary_ids) | Q(owner_record_id__in=product_ids)
        ).order_by("created_at").values("id", "owner_record_id", "status", "storage_key")

        primary_map = {}
        owned_map = {}
        for a in assets:
            if a["id"] in primary_ids and a["id"] not in primary_map:
                primary_map[a["id"]] = a
            owner_id = a["owner_record_id"]
            if owner_id:
                owned_map.setdefault(owner_id, []).append(a)

        # ── Vendor companies (name + MAP enforcement) ──────────────────────────
        vendor_ids = list({p.vendor_company_reference for p in products if p.vendor_company_reference})
        company_map = {
            c.id: {
                "name": c.name,
                "map_pricing_enforced": c.map_pricing_enforced,
                "return_address_line1": c.return_address_line1,
                "return_address_line2": c.return_address_line2,
                "return_city": c.return_city,
                "return_state": c.return_state,
                "return_zip_code": c.return_zip_code,
            }
            for c in Company.objects.filter(id__in=vendor_ids)
        }

        # ── Device compatibility (assertions + devices in one pass each) ───────
        assertions = ProductCompatibilityAssertion.objects.filter(
            product_id__in=product_ids,
            is_compatible=True,
            is_excluded=False,
        ).values_list("product_id", "device_reference")

        device_ids = {d for (_pid, d) in assertions}
        devices = {
            d.id: d
            for d in Device.objects.filter(id__in=device_ids).select_related("manufacturer")
        }
        compat_map = {}
        for pid, device_ref in assertions:
            dev = devices.get(device_ref)
            if not dev:
                continue
            compat_map.setdefault(pid, []).append({
                "device_id": str(dev.id),
                "name": f"{dev.manufacturer.name} {dev.name}",
                "model_number": dev.model_number or "",
            })

        return {
            "bulk_primary_media": primary_map,
            "bulk_owned_media": owned_map,
            "bulk_companies": company_map,
            "bulk_compatibility": compat_map,
            "bulk_media_url": media_url,
        }

    def list(self, request, *args, **kwargs):
        """
        Paginated product list.

        The page of products is resolved first, then the related rows needed
        for serialization are loaded in bulk (see _build_bulk_context) so the
        response cost is proportional to the page size, not to the catalog size.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else list(queryset)

        self._bulk_ctx = self._build_bulk_context(rows)

        serializer = self.get_serializer(rows, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="ids")
    def matching_ids(self, request):
        """
        Ids of every product matching the current filters (no pagination).

        The catalog list is paged server-side, so "select all" needs the full
        id set for the active filters. Only ids are returned — no product
        payload is serialized.
        """
        queryset = self.filter_queryset(self.get_queryset())
        ids = list(queryset.values_list("id", flat=True))
        return Response({"ids": [str(i) for i in ids], "count": len(ids)})

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return Product.objects.none()

        # Annotate buyer-specific exported_date (per device when filtered)
        from django.db.models import Subquery, OuterRef, Value, DateTimeField
        from apps.catalog.models import BuyerProductExportDate
        company = getattr(user, "company", None)
        if company and company.company_type == "buyer":
            export_filter = dict(
                company_scope_reference=company.id,
                buyer_entity_reference=user.entity_id,
                product_id=OuterRef("pk"),
            )
            device_id_param = self.request.query_params.get("device_id")
            if device_id_param:
                from uuid import UUID as _UUID
                try:
                    dev_ids = [_UUID(x.strip()) for x in device_id_param.split(",") if x.strip()]
                    if len(dev_ids) == 1:
                        export_filter["device_reference"] = dev_ids[0]
                except (ValueError, TypeError):
                    pass
            exported_subquery = BuyerProductExportDate.objects.filter(
                **export_filter
            ).values("exported_at")[:1]
            qs = qs.annotate(exported_date=Subquery(exported_subquery))
        else:
            qs = qs.annotate(exported_date=Value(None, output_field=DateTimeField()))
        if user.is_cixci_admin:
            device_id_param = self.request.query_params.get("device_id")
            if device_id_param:
                from uuid import UUID
                try:
                    dev_uuids = [UUID(x.strip()) for x in device_id_param.split(",") if x.strip()]
                    if dev_uuids:
                        compatible_product_ids = ProductCompatibilityAssertion.objects.filter(
                            device_reference__in=dev_uuids,
                            is_compatible=True,
                            is_excluded=False
                        ).values_list("product_id", flat=True)
                        qs = qs.filter(id__in=compatible_product_ids)
                except ValueError:
                    return Product.objects.none()
            return qs

        company = getattr(user, "company", None) or (user.entity.company if getattr(user, "entity", None) else None)
        if not company:
            return Product.objects.none()

        if company.company_type == "vendor":
            qs = qs.filter(vendor_company_reference=company.id)
            device_id_param = self.request.query_params.get("device_id")
            if device_id_param:
                from uuid import UUID
                try:
                    dev_uuids = [UUID(x.strip()) for x in device_id_param.split(",") if x.strip()]
                    if dev_uuids:
                        compatible_product_ids = ProductCompatibilityAssertion.objects.filter(
                            device_reference__in=dev_uuids,
                            is_compatible=True,
                            is_excluded=False
                        ).values_list("product_id", flat=True)
                        qs = qs.filter(id__in=compatible_product_ids)
                except ValueError:
                    return Product.objects.none()
            return qs

        from apps.tenant.models import Company, CompanyStatus, CompanyType
        from django.db.models import Q
        import pytz

        # Non-vendor (buyer/retailer) users can only see Active products whose Release Date has arrived
        est = pytz.timezone("US/Eastern")
        today_est = timezone.now().astimezone(est).date()
        qs = qs.filter(status=ProductStatus.ACTIVE).exclude(compatibility_status="incomplete").filter(
            Q(release_date__isnull=True) | Q(release_date__lte=today_est)
        )

        # Media readiness gate (Rule §24): buyers only see products with an
        # approved, ready primary image. Accepts PNG and JPEG from vendor imports.
        from django.conf import settings as _settings
        if getattr(_settings, "MEDIA_READINESS_ENFORCE_BUYER", True):
            from apps.media.models import MediaAsset
            ready_asset_ids = MediaAsset.objects.filter(
                status="ready",
                mime_type__in=["image/png", "image/jpeg"],
                review_status="approved",
            ).values_list("id", flat=True)
            qs = qs.filter(primary_image_reference__in=list(ready_asset_ids))

        if company.company_type == "buyer":
            from apps.integration.models import CompanyAPIKey
            from apps.integration.storefront_api import request_storefront
            from .models import BuyerExportMapping
            from django.db.models import Prefetch
            storefront = request_storefront(self.request)
            selections = BuyerExportMapping.objects.filter(company_id=company.id, entity_id=user.entity_id,
                status__in=['active', 'review_required']).order_by('-exported_at')
            if storefront:
                selections = selections.filter(storefront=storefront)
                if isinstance(self.request.auth, CompanyAPIKey):
                    qs = qs.filter(pk__in=selections.values_list('product_id', flat=True))
            qs = qs.prefetch_related(Prefetch('export_mappings', queryset=selections, to_attr='_buyer_export_mappings'))
            from .compatibility_contract import buyer_portfolio_device_ids
            portfolio_ids = buyer_portfolio_device_ids(user) or set()
            if not portfolio_ids:
                return qs.none()
            target_ids = portfolio_ids
            requested_devices = self.request.query_params.get("device_id")
            if requested_devices:
                from uuid import UUID
                try:
                    target_ids = portfolio_ids.intersection(UUID(value.strip()) for value in requested_devices.split(",") if value.strip())
                except (ValueError, TypeError):
                    return qs.none()
                if not target_ids:
                    return qs.none()
            compatible_ids = ProductCompatibilityAssertion.objects.filter(
                device_reference__in=target_ids, is_compatible=True, is_excluded=False,
            ).values_list("product_id", flat=True)
            qs = qs.filter(id__in=compatible_ids)
            if isinstance(self.request.auth, CompanyAPIKey):
                if str(self.request.auth.company_scope_reference) != str(company.id):
                    return qs.none()
                exported_ids = BuyerProductExportDate.objects.filter(
                    company_scope_reference=company.id,
                    buyer_entity_reference=user.entity_id,
                ).filter(Q(device_reference__in=target_ids) | Q(device_reference__isnull=True)).values_list("product_id", flat=True)
                qs = qs.filter(id__in=exported_ids)

        from apps.tenant.regional_visibility import filter_buyer_regional_products
        from .source_visibility import eligible_vendor_sources
        qs = eligible_vendor_sources(qs)
        qs = filter_buyer_regional_products(qs, company.id, user.entity_id)

        # MAP Pricing buyer visibility exclusions
        from apps.pricing.models import MapException
        from decimal import Decimal

        enforced_vendor_ids = Company.objects.filter(
            company_type=CompanyType.VENDOR,
            map_pricing_enforced=True
        ).values_list("id", flat=True)

        map_products = Product.objects.filter(
            Q(vendor_company_reference__in=enforced_vendor_ids) | Q(map_price__isnull=False)
        ).filter(status=ProductStatus.ACTIVE)

        approved_exceptions = MapException.objects.filter(
            status="approved",
            start_date__lte=today_est,
            end_date__gte=today_est
        ).filter(
            Q(buyer_company_reference=company.id) | Q(buyer_company_reference__isnull=True)
        )
        except_skus = set(approved_exceptions.values_list("sku", flat=True))

        excluded_product_ids = []
        for p in map_products:
            if p.vendor_company_reference in enforced_vendor_ids and p.map_price is None:
                excluded_product_ids.append(p.id)
                continue

            if p.map_price is not None:
                wholesale = Decimal(str(p.vendor_wholesale_price_amount or "0.00"))
                msrp_val = Decimal(str(p.msrp or "0.00"))
                buyer_wholesale_price = wholesale + msrp_val * Decimal("0.14")
                if buyer_wholesale_price >= p.map_price and p.sku not in except_skus:
                    excluded_product_ids.append(p.id)
                    continue

                if p.sale_price is not None:
                    buyer_exc = approved_exceptions.filter(sku=p.sku, vendor_company_reference=p.vendor_company_reference).order_by("approved_minimum_price").first()
                    eff_map = buyer_exc.approved_minimum_price if buyer_exc else p.map_price
                    if p.sale_price < eff_map:
                        excluded_product_ids.append(p.id)
                        continue

        if excluded_product_ids:
            qs = qs.exclude(id__in=excluded_product_ids)

        return qs

    @action(detail=False, methods=['get'], url_path='filter-options')
    def filter_options(self, request):
        """Facet values from exactly the caller's current authorized catalog."""
        products = self.filter_queryset(self.get_queryset())
        brands = products.exclude(brand='').order_by('brand').values_list('brand', flat=True).distinct()
        return Response({'brands': list(brands)})

    @action(detail=False, methods=['get'], url_path='vendor-audit')
    def vendor_audit(self, request):
        from .vendor_audit import audit_products, source_context
        _, products = audit_products(request.query_params)
        # Always bounded, including when a caller supplies paginate=false.
        paginator = ProductPagination()
        rows = paginator.paginate_queryset(products,request,view=self)
        self._bulk_ctx = self._build_bulk_context(rows)
        self._bulk_ctx['bulk_sources'] = source_context(rows)
        serializer = VendorAuditProductSerializer(rows,many=True,context=self.get_serializer_context())
        return paginator.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'], url_path='vendor-audit-stats')
    def vendor_audit_stats(self, request):
        from .vendor_audit import audit_products
        from apps.integration.models import VendorCatalogItem
        from django.db.models import Count
        vendor, products = audit_products({'vendor':request.query_params.get('vendor')})
        stats = products.aggregate(total=Count('id'),active=Count('id',filter=Q(status='active')),
            with_image=Count('id',filter=Q(primary_image_reference__isnull=False)),
            no_image=Count('id',filter=Q(primary_image_reference__isnull=True)),
            mapped=Count('id',filter=Q(compatibility_mode='direct_device',_audit_has_device=True)),
            unmapped=Count('id',filter=Q(compatibility_mode='direct_device',_audit_has_device=False)),
            review_products=Count('id',filter=Q(_audit_review=True)))
        reviews = VendorCatalogItem.objects.filter(connection__vendor_company_id=vendor.pk,review_required=True)
        stats['review_required'] = reviews.count()
        stats['unlinked_review_required'] = reviews.filter(product_id__isnull=True).count()
        stats['brands'] = list(products.exclude(brand_reference_id=None).order_by('brand_reference__name').values(
            'brand_reference_id','brand_reference__name').distinct())
        return Response(stats)

    @action(detail=True, methods=['post'], url_path='map-devices')
    def map_devices(self, request, pk=None):
        from django.core.exceptions import ValidationError
        from .vendor_audit import DeviceMappingSerializer, validated, map_product_devices
        data = validated(DeviceMappingSerializer,request.data)
        try:
            result = map_product_devices(self.get_object(),request.user,data)
        except ValidationError as error:
            raise serializers.ValidationError(getattr(error,'message_dict',error.messages)) from error
        return Response(result)

    @action(detail=True, methods=['post'], url_path='resolve-review')
    def resolve_review(self, request, pk=None):
        from .vendor_audit import resolve_product_review
        cleared = resolve_product_review(self.get_object(),request.user)
        if cleared:
            from .services import invalidate_buyer_projection_cache
            invalidate_buyer_projection_cache('vendor_audit_review_resolved')
        return Response({'status':'ok','cleared':cleared})

    @action(detail=False, methods=['post'], url_path='bulk-map-devices')
    @transaction.atomic
    def bulk_map_devices(self, request):
        from django.core.exceptions import ValidationError
        from .vendor_audit import BulkDeviceMappingSerializer, validated, map_product_devices
        data = validated(BulkDeviceMappingSerializer,request.data)
        ids = list(dict.fromkeys(data['product_ids']))
        products = {product.pk:product for product in self.get_queryset().filter(pk__in=ids)}
        failures, results = [], []
        from .services import defer_buyer_projection_refresh, invalidate_buyer_projection_cache
        with defer_buyer_projection_refresh():
            for identifier in sorted(ids,key=str):
                product = products.get(identifier)
                if product is None:
                    failures.append({'product_id':str(identifier),'errors':['Product not found.']})
                    continue
                try:
                    results.append({'product_id':str(identifier),**map_product_devices(product,request.user,data)})
                except ValidationError as error:
                    failures.append({'product_id':str(identifier),'errors':getattr(error,'message_dict',error.messages)})
        if results:
            invalidate_buyer_projection_cache('vendor_audit_bulk_mapping')
        return Response({'status':'partial' if failures else 'ok','updated':len(results),
            'total':len(ids),'results':results,'failures':failures})

    @action(detail=False, methods=['post'], url_path='bulk-resolve-review')
    @transaction.atomic
    def bulk_resolve_review(self, request):
        from .vendor_audit import BulkReviewSerializer, validated, resolve_product_review
        ids = list(dict.fromkeys(validated(BulkReviewSerializer,request.data)['product_ids']))
        products = {product.pk:product for product in self.get_queryset().filter(pk__in=ids)}
        missing = [str(identifier) for identifier in ids if identifier not in products]
        if missing:
            raise serializers.ValidationError({'product_ids':'One or more products were not found.'})
        cleared = sum(resolve_product_review(products[identifier],request.user) for identifier in sorted(ids,key=str))
        if cleared:
            from .services import invalidate_buyer_projection_cache
            invalidate_buyer_projection_cache('vendor_audit_bulk_review_resolved')
        return Response({'status':'ok','cleared':cleared})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user and not getattr(user, "is_cixci_admin", False):
            company = getattr(user, "company", None)
            if company and company.company_type == "vendor":
                if instance.status == "active":
                    return Response(
                        {"detail": "Active products that are live and being sold by buyers cannot be deleted."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cannot delete this product because it has dependent records (e.g. compatibility assertions, export snapshots). Remove those first."},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_required_capability(self):
        action = getattr(self, "action", None)
        if action == "compatibility" and self.request.method == "POST":
            return "catalog.product.update"
        return super().get_required_capability()

    def perform_create(self, serializer):
        user = self.request.user
        # The supplier owns source catalog data even when an Admin with an
        # Internal/Buyer/Vendor entity acts on its behalf.
        from apps.tenant.models import Company
        vendor_id = serializer.validated_data["vendor_company_reference"]
        vendor = Company.objects.get(pk=vendor_id, company_type="vendor")
        kwargs = {"company_scope_reference": vendor.id}
        if not serializer.validated_data.get("brand"):
            kwargs["brand"] = vendor.name
        product = serializer.save(**kwargs)

    def perform_update(self, serializer):
        kwargs = {}
        user = self.request.user
        if user and user.entity and user.entity.company:
            if user.entity.company.company_type == "vendor" and not getattr(user, "is_cixci_admin", False):
                kwargs["vendor_company_reference"] = user.entity.company.id
        product = serializer.save(**kwargs)

    @action(detail=True, methods=["post"])
    def set_selling_status(self, request, pk=None):
        """
        Explicitly set selling_status.
        Architecture rule: this is NEVER auto-triggered by portfolio changes.
        Only called via explicit Product Catalog workflow action.
        """
        new_status = request.data.get("selling_status")
        valid = [c[0] for c in Product.selling_status.field.choices]
        if new_status not in valid:
            return Response({"error": f"Invalid status. Choose from: {valid}"}, status=400)
        product = self.get_object()
        product.selling_status = new_status
        product.save(update_fields=["selling_status", "updated_at"])
        return Response({"selling_status": new_status})

    @action(detail=True, methods=["get", "post"])
    def compatibility(self, request, pk=None):
        """Read canonical current mappings or apply audited, scoped commands."""
        from django.core.exceptions import ValidationError as CompatibilityValidationError
        from .compatibility_commands import update_explicit_selections, apply_mapping_control
        from .compatibility_contract import buyer_portfolio_device_ids
        product = self.get_object()
        if request.method == "POST":
            try:
                if request.data.get("action"):
                    apply_mapping_control(
                        product, request.user, request.data["action"], request.data.get("device_reference"),
                        reason=request.data.get("exclusion_reason"), notes=request.data.get("notes", ""),
                    )
                else:
                    items = request.data.get("assertions", request.data.get("device_ids", []))
                    mode = request.data.get("update_type", request.data.get("compatibility_update_type", "add"))
                    if mode == "remove" and request.data.get("exclusion_reason"):
                        items = [dict(item, exclusion_reason=item.get("exclusion_reason", request.data["exclusion_reason"]), notes=item.get("notes", request.data.get("notes", ""))) if isinstance(item, dict) else {"device_id": item, "exclusion_reason": request.data["exclusion_reason"], "notes": request.data.get("notes", "")} for item in items]
                    update_explicit_selections(product, items, request.user, update_type=mode)
            except CompatibilityValidationError as error:
                raise serializers.ValidationError(error.message_dict) from error
        assertions = product.compatibility_assertions.all()
        portfolio_ids = buyer_portfolio_device_ids(request.user)
        if portfolio_ids is not None:
            assertions = assertions.filter(device_reference__in=portfolio_ids, is_compatible=True, is_excluded=False)
        elif request.query_params.get("include_archived") != "true":
            assertions = assertions.filter(Q(is_compatible=True) | Q(is_excluded=True) | Q(is_locked=True) | Q(match_status="Pending"))
        return Response(ProductCompatibilityAssertionSerializer(assertions.order_by("created_at", "id"), many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="recalculate-compatibility")
    def recalculate_compatibility(self, request, pk=None):
        """Allows admins to manually trigger recalculations for a single product."""
        is_admin = getattr(request.user, "is_cixci_admin", False)
        if not is_admin:
            return Response({"error": "Only CIXCI Admins can trigger compatibility recalculation."}, status=403)
        product = self.get_object()
        try:
            from apps.catalog.compatibility_engine import run_compatibility_automapping
            from django.db import transaction
            with transaction.atomic():
                run_compatibility_automapping(product, actor_id=request.user.id, change_source="Manual Recalculation")
            return Response({"status": "success", "compatibility_status": product.compatibility_status})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["post"], url_path="recalculate-compatibility")
    def recalculate_bulk_compatibility(self, request):
        """Allows admins to trigger recalculations at the Category, Vendor, or Brand level."""
        is_admin = getattr(request.user, "is_cixci_admin", False)
        if not is_admin:
            return Response({"error": "Only CIXCI Admins can trigger compatibility recalculation."}, status=403)
            
        category = request.data.get("category")
        vendor_id = request.data.get("vendor_id")
        brand = request.data.get("brand")
        
        if not category and not vendor_id and not brand:
            return Response({"error": "Please provide 'category', 'vendor_id', or 'brand' to recalculate compatibility."}, status=400)
            
        from apps.catalog.compatibility_engine import run_compatibility_automapping
        from django.db import transaction
        
        products = Product.objects.all()
        if category:
            products = products.filter(product_category=category)
        if vendor_id:
            products = products.filter(vendor_company_reference=vendor_id)
        if brand:
            products = products.filter(brand=brand)
            
        count = 0
        try:
            with transaction.atomic():
                for prod in products:
                    run_compatibility_automapping(prod, actor_id=request.user.id, change_source="Bulk Recalculation")
                    count += 1
            return Response({"status": "success", "recalculated_count": count})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["get"])
    def audit_history(self, request, pk=None):
        """Retrieves compatibility-related audit logs for a product."""
        product = self.get_object()
        from apps.audit.models import AuditRecord
        import json
        
        company_scope = product.company_scope_reference or "00000000-0000-0000-0000-000000000000"
        records = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
            company_scope_reference=company_scope
        ).order_by("-created_at")
        
        history = []
        product_id_str = str(product.id)
        for r in records:
            try:
                data = json.loads(r.event_description)
                if data.get("product_id") == product_id_str:
                    history.append({
                        "id": str(r.id),
                        "created_at": r.created_at,
                        "actor_id": str(r.actor_reference) if r.actor_reference else None,
                        "change_source": r.service_trigger_reference,
                        "payload": data
                    })
            except Exception:
                pass
                
        return Response(history)

    @action(detail=False, methods=["get"], url_path="bulk-upload-template")
    def bulk_upload_template(self, request):
        """Generate and return an Excel (.xlsx) bulk-upload template with
        blue header row, proper column widths, and data-validation dropdowns
        for Status (Active / Inactive) and Product Category (dynamic from
        DynamicDropdownConfig).
        """
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
        from openpyxl.worksheet.datavalidation import DataValidation
        from django.http import HttpResponse

        columns = [
            ("Brand", 22),
            ("Product Name", 35),
            ("Series", 22),
            ("Product Status", 18),
            ("EOL Date", 16),
            ("Product Category", 28),
            ("SKU", 20),
            ("UPC", 18),
            ("Launch Date", 16),
            ("Release Date", 16),
            ("Color", 16),
            ("System Color", 16),
            ("Vendor Wholesale Price", 24),
            ("MSRP", 12),
            ("MAP Price", 14),
            ("Sale Price", 14),
            ("Recommended Accessory", 24),
            ("Inventory Level", 18),
            ("Device Compatibility", 30),
            ("Universal Device Types", 24),
            ("Length", 12),
            ("Width", 12),
            ("Height", 12),
            ("Weight", 12),
            ("Brand Warranty", 18),
            ("Short Description", 30),
            ("Product Description", 40),
            ("Promo Information", 28),
            ("Image URL 1", 30),
            ("Image URL 2", 30),
            ("Image URL 3", 30),
            ("Image URL 4", 30),
            ("Image URL 5", 30),
            ("Meta Title", 30),
            ("Meta Description", 35),
        ]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Bulk Upload Template"

        header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style="thin", color="B0B0B0"),
            right=Side(style="thin", color="B0B0B0"),
            top=Side(style="thin", color="B0B0B0"),
            bottom=Side(style="thin", color="B0B0B0"),
        )

        for col_idx, (col_name, col_width) in enumerate(columns, start=1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = col_width

        ws.row_dimensions[1].height = 30
        ws.freeze_panes = "A2"

        # Build a lookup from column header to its 1-based index so
        # dropdowns stay correct when columns are added or reordered.
        col_index = {name: idx for idx, (name, _) in enumerate(columns, start=1)}

        # Product Status dropdown — vendor-facing statuses only
        from apps.catalog.models import ProductStatus as PS
        _VENDOR_STATUSES = {PS.ACTIVE, PS.INACTIVE, PS.EOL, PS.OUT_OF_STOCK}
        status_labels = [label for val, label in PS.choices if val in _VENDOR_STATUSES]
        status_formula = ",".join(status_labels)
        status_dv = DataValidation(
            type="list",
            formula1=f'"{status_formula}"',
            allow_blank=True,
            showErrorMessage=True,
            errorTitle="Invalid Status",
            error=f"Please select one of: {status_formula}.",
        )
        status_col_letter = get_column_letter(col_index["Product Status"])
        status_dv.add(f"{status_col_letter}2:{status_col_letter}1000")
        ws.add_data_validation(status_dv)

        # Product Category dropdown — dynamic from DynamicDropdownConfig
        categories = list(
            DynamicDropdownConfig.objects.filter(
                field_name="product_category", status="active"
            ).values_list("value", flat=True).order_by("value")
        )
        if categories:
            cat_formula = ",".join(categories)
            cat_dv = DataValidation(
                type="list",
                formula1=f'"{cat_formula}"',
                allow_blank=True,
                showErrorMessage=True,
                errorTitle="Invalid Category",
                error="Please select a valid Product Category.",
            )
            cat_col_letter = get_column_letter(col_index["Product Category"])
            cat_dv.add(f"{cat_col_letter}2:{cat_col_letter}1000")
            ws.add_data_validation(cat_dv)

        # System Color dropdown — dynamic from DynamicDropdownConfig
        sys_colors = list(
            DynamicDropdownConfig.objects.filter(
                field_name="system_color", status="active"
            ).values_list("value", flat=True).order_by("value")
        )
        if sys_colors:
            color_formula = ",".join(sys_colors)
            color_dv = DataValidation(
                type="list",
                formula1=f'"{color_formula}"',
                allow_blank=True,
                showErrorMessage=True,
                errorTitle="Invalid System Color",
                error="Please select a valid System Color.",
            )
            color_col_letter = get_column_letter(col_index["System Color"])
            color_dv.add(f"{color_col_letter}2:{color_col_letter}1000")
            ws.add_data_validation(color_dv)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="CIXCI_Bulk_Upload_Template.xlsx"'
        wb.save(response)
        return response

    @action(detail=False, methods=["post"], url_path="check-skus")
    def check_skus(self, request):
        """Return which SKUs already exist for a vendor.

        Used by the import preview to label rows as CREATE vs UPDATE.
        """
        skus = request.data.get("skus", [])
        vendor_company_id = request.data.get("vendor_company_reference")
        if not vendor_company_id:
            vendor_company_id = (
                request.user.entity.company_id
                if (request.user.entity and request.user.entity.company)
                else None
            )
        if not vendor_company_id or not skus:
            return Response({"existing": []})
        existing = list(
            Product.objects.filter(
                sku__in=skus, vendor_company_reference=vendor_company_id
            ).values_list("sku", flat=True)
        )
        return Response({"existing": existing})

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def bulk_upload(self, request):
        """Bulk upload products from a CSV or Excel (.xlsx) file with detailed validations."""
        from django.conf import settings
        import csv
        import io
        import datetime
        from decimal import Decimal
        import pytz
        from django.utils import timezone
        from apps.devices.models import Device, Manufacturer, DeviceType
        from apps.catalog.models import ProductCompatibilityAssertion, DynamicDropdownConfig, ProductStatus
        from apps.catalog.services import log_catalog_audit
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=400)
            
        filename = file_obj.name.lower()
        rows = []
        raw_headers = []
        
        # Helper converters
        def normalize_key(k):
            return "".join(c for c in str(k).lower() if c.isalnum())
            
        def parse_date_value(val):
            if not val:
                return None
            if isinstance(val, (datetime.datetime, datetime.date)):
                if isinstance(val, datetime.datetime):
                    return val.date()
                return val
            val_str = str(val).strip()
            for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%d/%m/%Y"):
                try:
                    return datetime.datetime.strptime(val_str, fmt).date()
                except ValueError:
                    continue
            return None

        def parse_decimal_value(val):
            if val is None or val == "":
                return None
            try:
                cleaned = str(val).replace('$', '').replace(',', '').strip()
                return Decimal(cleaned)
            except Exception:
                return None

        def parse_int_value(val):
            if val is None or val == "":
                return None
            try:
                return int(float(str(val).strip()))
            except Exception:
                return None

        def parse_bool_value(val):
            if val is None or val == "":
                return False
            if isinstance(val, bool):
                return val
            return str(val).lower() in ["true", "yes", "y", "1"]

        # Parse Excel or CSV
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_obj, data_only=True)
                ws = wb.active
                sheet_rows = list(ws.iter_rows(values_only=True))
                if sheet_rows:
                    raw_headers = [str(h).strip() if h is not None else '' for h in sheet_rows[0]]
                    headers = [normalize_key(h) for h in raw_headers]
                    for row_cells in sheet_rows[1:]:
                        if not any(cell is not None for cell in row_cells):
                            continue
                        row_dict = {}
                        for col_idx, cell_value in enumerate(row_cells):
                            if col_idx < len(headers) and headers[col_idx]:
                                row_dict[headers[col_idx]] = cell_value
                        rows.append(row_dict)
            except Exception as e:
                return Response({"error": f"Failed to parse Excel file: {str(e)}"}, status=400)
        else:
            try:
                decoded_file = file_obj.read().decode('utf-8-sig')
                io_string = io.StringIO(decoded_file)
                reader = csv.reader(io_string)
                header_row = next(reader, None)
                if header_row:
                    raw_headers = [h.strip() for h in header_row if h]
                    headers = [normalize_key(h) for h in raw_headers]
                    for r in reader:
                        if not any(cell.strip() for cell in r if cell):
                            continue
                        row_dict = {}
                        for col_idx, cell_value in enumerate(r):
                            if col_idx < len(headers):
                                row_dict[headers[col_idx]] = cell_value.strip()
                        rows.append(row_dict)
            except Exception as e:
                return Response({"error": f"Failed to parse CSV file: {str(e)}"}, status=400)

        # 1. Header Validation
        normalized_headers = [normalize_key(h) for h in raw_headers]
        required_fields = {
            "sku": "SKU",
            "brand": "Brand",
            "productcategory": "Product Category",
            "upc": "UPC",
            "launchdate": "Launch Date",
            "vendorwholesaleprice": "Vendor Wholesale Price",
            "msrp": "MSRP"
        }
        
        # Check either 'accessoryname' or 'name' or 'productname'
        has_name = any(k in normalized_headers for k in ["accessoryname", "name", "productname"])
        missing_headers = []
        for req_k, req_name in required_fields.items():
            # Allow fallback checks (e.g. wholesaleprice for vendorwholesaleprice, category for productcategory)
            if req_k == "productcategory" and "category" in normalized_headers:
                continue
            if req_k == "vendorwholesaleprice" and any(k in normalized_headers for k in ["wholesaleprice", "vendorwholesalepriceamount"]):
                continue
            if req_k not in normalized_headers:
                missing_headers.append(req_name)
        if not has_name:
            missing_headers.append("Product Name")

        if missing_headers:
            return Response({
                "error": f"Missing required headers: {', '.join(missing_headers)}",
                "missing_headers": missing_headers
            }, status=400)

        # 2. Row-by-row validation
        products_created = []
        validation_errors = []
        
        passed_count = 0
        failed_count = 0
        staged_count = 0
        created_count = 0
        updated_count = 0
        
        seen_skus = set()
        seen_upcs = set()

        vendor_company_id = request.user.entity.company_id if (request.user.entity and request.user.entity.company) else None
        from apps.tenant.models import Company
        if getattr(request.user, "is_cixci_admin", False):
            vendor_company_id = request.data.get("vendor_company_reference") or request.query_params.get("vendor_company_reference")
        if not vendor_company_id:
            raise serializers.ValidationError({"vendor_company_reference": "Select the supplier company for this catalog import."})
        import uuid
        try:
            vendor_company_id = uuid.UUID(str(vendor_company_id))
        except (TypeError, ValueError):
            raise serializers.ValidationError({"vendor_company_reference": "Use a canonical supplier Company UUID."}) from None
        vendor = Company.objects.filter(id=vendor_company_id).first()
        if not vendor or vendor.company_type != "vendor":
            raise serializers.ValidationError({"vendor_company_reference": "Select an existing supplier company."})
        is_map_enforced = vendor.map_pricing_enforced if vendor else False
            
        est = pytz.timezone("US/Eastern")
        today_est = timezone.now().astimezone(est).date()
        
        # Determine update mode
        raw_mode = request.data.get("update_mode") or request.query_params.get("update_mode")
        if raw_mode:
            raw_mode = str(raw_mode).strip().lower()
            if raw_mode in ["create new products only", "create_only", "create_new"]:
                update_mode = "create_only"
            elif raw_mode in ["update existing products only", "update_only", "update_existing"]:
                update_mode = "update_only"
            elif raw_mode in ["create and update / upsert", "upsert", "create_update", "create_and_update"]:
                update_mode = "upsert"
            else:
                update_mode = "upsert"
        else:
            fn = file_obj.name.lower() if hasattr(file_obj, 'name') else ""
            if "update" in fn:
                update_mode = "update_only"
            else:
                update_mode = "create_only"

        # Determine compatibility update type
        compatibility_update_type = request.data.get("compatibility_update_type") or request.query_params.get("compatibility_update_type") or "add"
        compatibility_update_type = str(compatibility_update_type).strip().lower()
        if compatibility_update_type not in ["add", "replace", "remove"]:
            compatibility_update_type = "add"

        from django.db import transaction
        sid = transaction.savepoint()

        from .models import VendorBrandRelationship
        supplier_brands = {link.brand.canonical_key: link.brand
                           for link in VendorBrandRelationship.objects.filter(
                               vendor_company_id=vendor_company_id, is_active=True,
                               brand__is_active=True).select_related('brand')}
        for idx, row in enumerate(rows):
            row_errors = []
            should_stage = False
            row_num = idx + 2
            
            row_bluetooth = ""
            row_jack = ""
            row_charging = ""
            row_wireless = ""
            row_storage = ""
            row_memory = ""
            row_watch_size = ""
            
            # --- SKU ---
            sku = str(row.get("sku") or "").strip()
            if not sku:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "SKU",
                    "submitted_value": "",
                    "validation_error": "SKU must not be blank.",
                    "recommended_correction": "Provide a unique product SKU."
                })
                product = None
            elif sku in seen_skus and update_mode == "create_only":
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "SKU",
                    "submitted_value": sku,
                    "validation_error": "Duplicate SKU within the same import file.",
                    "recommended_correction": "Ensure each SKU in the file is unique."
                })
                product = None
            else:
                seen_skus.add(sku)
                # Lookup product using SKU + Vendor Company
                product = Product.objects.filter(sku=sku, vendor_company_reference=vendor_company_id).first()
                
                # Enforce update mode lookup constraints
                if update_mode == "create_only" and product is not None:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "SKU",
                        "submitted_value": sku,
                        "validation_error": f"The Device Already Exists. Product with SKU '{sku}' already exists for this vendor.",
                        "recommended_correction": "Import using Update mode or change SKU."
                    })
                elif update_mode == "update_only" and product is None:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "SKU",
                        "submitted_value": sku,
                        "validation_error": f"Product with SKU ‘{sku}’ was not found for this vendor. Please confirm the SKU or import the product as a new product.",
                        "recommended_correction": "Check the SKU or change the import mode."
                    })

            is_new_row = product is None
            is_update_row = product is not None

            # --- Product Name ---
            name = str(row.get("productname") or row.get("accessoryname") or row.get("name") or "").strip()
            if not name and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Name",
                    "submitted_value": "",
                    "validation_error": "Product Name must not be blank.",
                    "recommended_correction": "Provide a readable, customer-facing product name."
                })
                
            # --- Series ---
            series = str(row.get("series") or "").strip()

            # --- Brand ---
            brand = str(row.get("brand") or "").strip()
            brand_reference = supplier_brands.get(' '.join(brand.split()).casefold())
            if (brand and not brand_reference and not request.user.is_cixci_admin
                    and brand != vendor.name and (not product or brand != product.brand)):
                row_errors.append({
                    'row_number': row_num, 'column_name': 'Brand', 'submitted_value': brand,
                    'validation_error': 'An active approved Owned or Authorized Distributor Brand relationship is required for this supplier.',
                    'recommended_correction': 'Ask CIXCI Admin to configure the supplier Brand relationship.'})
            if not brand and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Brand",
                    "submitted_value": "",
                    "validation_error": "Brand must not be blank.",
                    "recommended_correction": "Provide an approved brand name."
                })
            else:
                brand_exists = DynamicDropdownConfig.objects.filter(field_name="brand", value__iexact=brand).exists()
                if not brand_exists:
                    if request.user.is_cixci_admin:
                        # Auto-create approved brand if admin uploads
                        DynamicDropdownConfig.objects.create(field_name="brand", value=brand, display_name=brand)
                    else:
                        # Stage for review if non-admin or unknown brand
                        should_stage = True

            # --- Product Status ---
            status_raw = str(row.get("productstatus") or row.get("status") or "").strip()
            status_str = status_raw.lower()
            if not status_str:
                status_str = "active"
            status_label_map = {label.lower(): val for val, label in ProductStatus.choices}
            if status_str in status_label_map:
                status_str = status_label_map[status_str]
            valid_status_values = [v for v, _ in ProductStatus.choices]
            if status_str not in valid_status_values:
                valid_labels = ", ".join(label for _, label in ProductStatus.choices)
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Status",
                    "submitted_value": status_raw,
                    "validation_error": "Invalid Product Status value.",
                    "recommended_correction": f"Provide one of: {valid_labels}."
                })

            # --- Launch Date ---
            launch_raw = row.get("launchdate")
            launch_date = parse_date_value(launch_raw)
            if not launch_date and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Launch Date",
                    "submitted_value": str(launch_raw),
                    "validation_error": "Launch Date must be a valid date in MM/DD/YYYY format.",
                    "recommended_correction": "Provide a valid Launch Date (e.g. 12/31/2026)."
                })
            else:
                # If Launch Date is in the future, Product Status must be Inactive
                if launch_date > today_est:
                    if launch_date.year != 9999 and status_str in ["active", "eol", "out_of_stock"]:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Product Status",
                            "submitted_value": status_str.capitalize(),
                            "validation_error": "Product Status must be Inactive if Launch Date is in the future.",
                            "recommended_correction": "Set product status to Inactive."
                        })

            # --- Release Date ---
            release_raw = row.get("releasedate")
            release_date = parse_date_value(release_raw) if release_raw else None
            if launch_date and launch_date > today_est and launch_date.year != 9999:
                if not release_date and is_new_row:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Release Date",
                        "submitted_value": "",
                        "validation_error": "Release Date is required when the Launch Date is in the future.",
                        "recommended_correction": "Provide a valid Release Date."
                    })
            if release_raw and not release_date:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Release Date",
                    "submitted_value": str(release_raw),
                    "validation_error": "Release Date must be a valid date in MM/DD/YYYY format if provided.",
                    "recommended_correction": "Format Release Date as MM/DD/YYYY."
                })

            # --- EOL Date ---
            eol_raw = row.get("eoldate")
            eol_date = parse_date_value(eol_raw) if eol_raw else None
            if status_str == "eol":
                if not eol_date and is_new_row:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "EOL Date",
                        "submitted_value": "",
                        "validation_error": "EOL Date is required when Product Status is EOL.",
                        "recommended_correction": "Provide a valid EOL Date."
                    })
                elif launch_date and eol_date < launch_date:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "EOL Date",
                        "submitted_value": str(eol_raw),
                        "validation_error": "EOL Date cannot be earlier than Launch Date.",
                        "recommended_correction": "Ensure EOL Date is equal to or after Launch Date."
                    })
                elif eol_date > today_est:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Product Status",
                        "submitted_value": "EOL",
                        "validation_error": "Product Status cannot be EOL if EOL Date is in the future (must remain Active).",
                        "recommended_correction": "Set Product Status to Active."
                    })
            elif status_str in ["active", "inactive"] and eol_date:
                if eol_date <= today_est:
                    status_str = "eol"

            # --- Product Category (Category Governance) ---
            # Vendor provides their own category name (vendor_category)
            # System resolves it to canonical CIXCI category (product_category)
            from apps.catalog.models import VendorCategoryMapping, VendorCategoryMappingStatus, CategoryValidationStatus
            category_raw = str(row.get("productcategory") or row.get("category") or "").strip()
            vendor_category_raw_val = str(row.get("vendorcategory") or "")
            vendor_category = vendor_category_raw_val.strip()
            product_category = None  # Canonical CIXCI category
            category_validation = CategoryValidationStatus.PENDING

            if not category_raw and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Category",
                    "submitted_value": "",
                    "validation_error": "Product Category must not be blank.",
                    "recommended_correction": "Specify a valid vendor category."
                })
            elif category_raw:
                # Product Category is the canonical choice. An optional Vendor
                # Category cannot silently redirect it through a mapping.
                canonical = DynamicDropdownConfig.objects.filter(field_name="product_category", value__iexact=category_raw, status="active").first()
                vendor_ref = vendor_company_id

                mapping = None
                if vendor_ref:
                    mapping = VendorCategoryMapping.objects.filter(
                        vendor_company_reference=vendor_ref,
                        vendor_category__iexact=category_raw,
                        status=VendorCategoryMappingStatus.ACTIVE
                    ).first()

                if canonical:
                    product_category = canonical.value
                    category_validation = CategoryValidationStatus.RESOLVED
                elif mapping:
                    # Mapping found - use canonical CIXCI category
                    product_category = mapping.cixci_category
                    if not vendor_category:
                        vendor_category = category_raw
                        vendor_category_raw_val = category_raw
                    category_validation = CategoryValidationStatus.RESOLVED
                else:
                    product_category = None
                    category_validation = CategoryValidationStatus.MAPPING_REQUIRED
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Product Category",
                        "submitted_value": category_raw,
                        "validation_error": f"Category '{category_raw}' is not an active CIXCI category or approved supplier mapping.",
                        "recommended_correction": "Select an approved CIXCI Product Category or ask CIXCI Admin to configure the supplier mapping."
                    })

            # --- UPC ---
            upc_val = str(row.get("upc") or "").strip()
            if upc_val.endswith(".0"):
                upc_val = upc_val[:-2]
            if not upc_val and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": "",
                    "validation_error": "UPC must not be blank.",
                    "recommended_correction": "Provide a 12-digit numeric UPC."
                })
            elif upc_val and (len(upc_val) != 12 or not upc_val.isdigit()):
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": upc_val,
                    "validation_error": "UPC must be exactly 12 numeric digits.",
                    "recommended_correction": "Enter exactly 12 digits (e.g. 012345678901)."
                })
            elif upc_val in seen_upcs and update_mode == "create_only":
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": upc_val,
                    "validation_error": "Duplicate UPC within the same import file.",
                    "recommended_correction": "Ensure each UPC in the file is unique."
                })
            else:
                seen_upcs.add(upc_val)
                # The same UPC may identify offers from different suppliers.
                qs = Product.objects.filter(upc=upc_val, vendor_company_reference=vendor_company_id)
                if product:
                    qs = qs.exclude(id=product.id)
                if qs.exists():
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "UPC",
                        "submitted_value": upc_val,
                        "validation_error": "UPC must be unique per product. This UPC is already registered to another product.",
                        "recommended_correction": "Provide a unique 12-digit numeric UPC."
                    })
                else:
                    # UPC secondary validation
                    if product and product.upc and upc_val != product.upc:
                        if update_mode == "update_only":
                            row_errors.append({
                                "row_number": row_num,
                                "column_name": "UPC",
                                "submitted_value": upc_val,
                                "validation_error": f"UPC mismatch detected for existing SKU '{sku}'. Submitted UPC '{upc_val}' does not match registered UPC '{product.upc}'.",
                                "recommended_correction": "Confirm and correct the UPC value."
                            })
                        else:
                            should_stage = True

            # --- Inventory Level ---
            if "inventorylevel" in row:
                inv_val = row.get("inventorylevel")
                if inv_val is None or str(inv_val).strip() == "":
                    inv_val = "0"
                
                parsed_inv = parse_int_value(inv_val)
                if parsed_inv is None:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Inventory Level",
                        "submitted_value": str(inv_val),
                        "validation_error": "Inventory Level must be a valid number.",
                        "recommended_correction": "Provide a non-negative integer."
                    })
                elif parsed_inv < 0:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Inventory Level",
                        "submitted_value": str(inv_val),
                        "validation_error": "Inventory Level must be a non-negative number.",
                        "recommended_correction": "Provide a non-negative integer."
                    })

            # --- Color / System Color ---
            color = str(row.get("color") or "").strip()
            sys_color = str(row.get("systemcolor") or "").strip()
            if color:
                if not sys_color:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "System Color",
                        "submitted_value": "",
                        "validation_error": "System Color is required when the product has a color.",
                        "recommended_correction": "Provide a system color mapping."
                    })
                else:
                    sys_colors_list = [c.strip() for c in sys_color.replace(";", ",").split(",") if c.strip()]
                    invalid_sys_colors = []
                    for c in sys_colors_list:
                        if not DynamicDropdownConfig.objects.filter(field_name="system_color", value__iexact=c).exists():
                            invalid_sys_colors.append(c)
                    if invalid_sys_colors:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "System Color",
                            "submitted_value": sys_color,
                            "validation_error": f"System Color '{sys_color}' is not on the approved list.",
                            "recommended_correction": "Choose approved system colors like Red, Blue, Clear, Gray, etc."
                        })

            # --- Prices ---
            wholesale_price = parse_decimal_value(row.get("vendorwholesaleprice") or row.get("wholesaleprice") or row.get("vendorwholesalepriceamount"))
            msrp = parse_decimal_value(row.get("msrp"))
            map_price = parse_decimal_value(row.get("mapprice"))
            sale_price = parse_decimal_value(row.get("saleprice"))
            
            if wholesale_price is None and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Vendor Wholesale Price",
                    "submitted_value": "",
                    "validation_error": "Vendor Wholesale Price must not be blank.",
                    "recommended_correction": "Provide a numeric wholesale price."
                })
            elif wholesale_price is not None and wholesale_price <= 0:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Vendor Wholesale Price",
                    "submitted_value": str(wholesale_price),
                    "validation_error": "Vendor Wholesale Price must be greater than zero.",
                    "recommended_correction": "Provide a positive price value."
                })
                
            if msrp is None and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "MSRP",
                    "submitted_value": "",
                    "validation_error": "MSRP must not be blank.",
                    "recommended_correction": "Provide a numeric MSRP."
                })
            elif msrp is not None and msrp <= 0:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "MSRP",
                    "submitted_value": str(msrp),
                    "validation_error": "MSRP must be greater than zero.",
                    "recommended_correction": "Provide a positive MSRP."
                })

            if wholesale_price is not None and msrp is not None:
                if wholesale_price >= msrp:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Vendor Wholesale Price",
                        "submitted_value": f"Wholesale: {wholesale_price}, MSRP: {msrp}",
                        "validation_error": "Vendor Wholesale Price must be lower than MSRP.",
                        "recommended_correction": "Ensure Wholesale Price < MSRP."
                    })
                    
            if is_map_enforced and map_price is None:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "MAP Price",
                    "submitted_value": "",
                    "validation_error": "MAP Price is required because MAP pricing is enforced for this vendor.",
                    "recommended_correction": "Provide a numeric MAP Price greater than zero."
                })

            if map_price is not None:
                if map_price <= 0:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "MAP Price",
                        "submitted_value": str(map_price),
                        "validation_error": "MAP Price must be greater than zero if provided.",
                        "recommended_correction": "Provide MAP > 0."
                    })
                if msrp is not None and map_price > msrp:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "MAP Price",
                        "submitted_value": f"MAP: {map_price}, MSRP: {msrp}",
                        "validation_error": "MAP Price must not be greater than MSRP.",
                        "recommended_correction": "Ensure MAP Price <= MSRP."
                    })
                if wholesale_price is not None and map_price < wholesale_price:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "MAP Price",
                        "submitted_value": f"MAP: {map_price}, Wholesale: {wholesale_price}",
                        "validation_error": "MAP Price must be greater than or equal to Vendor Wholesale Price.",
                        "recommended_correction": "Ensure MAP Price >= Wholesale Price."
                    })

                # Buyer Wholesale Price must be lower than MAP Price unless an approved pricing exception exists.
                if wholesale_price is not None and msrp is not None:
                    buyer_commission_percentage = Decimal("14.00")
                    buyer_commission_amount = msrp * (buyer_commission_percentage / Decimal("100.00"))
                    buyer_wholesale_price = wholesale_price + buyer_commission_amount
                    from apps.pricing.services import check_pricing_exception_exists
                    has_exception = check_pricing_exception_exists(vendor_company_id, sku)
                    if buyer_wholesale_price >= map_price and not has_exception:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Buyer Wholesale Price",
                            "submitted_value": f"Buyer Wholesale: {buyer_wholesale_price}, MAP: {map_price}",
                            "validation_error": "Buyer Wholesale Price must be lower than MAP Price unless an approved pricing exception exists.",
                            "recommended_correction": "Lower the wholesale price/MSRP or obtain a MAP exception."
                        })

            if sale_price is not None:
                if sale_price <= 0:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Sale Price",
                        "submitted_value": str(sale_price),
                        "validation_error": "Sale Price must be greater than zero if provided.",
                        "recommended_correction": "Provide Sale > 0."
                    })
                if msrp is not None and sale_price >= msrp:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Sale Price",
                        "submitted_value": f"Sale: {sale_price}, MSRP: {msrp}",
                        "validation_error": "Sale Price must be less than MSRP.",
                        "recommended_correction": "Ensure Sale Price < MSRP."
                    })
                buyer_wholes_temp = wholesale_price
                if wholesale_price is not None and msrp is not None:
                    buyer_wholes_temp = wholesale_price + msrp * Decimal("0.14")

                if buyer_wholes_temp is not None and sale_price < buyer_wholes_temp:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Sale Price",
                        "submitted_value": f"Sale: {sale_price}, Buyer Wholesale: {buyer_wholes_temp}",
                        "validation_error": "Sale Price must not be lower than buyer Wholesale Price.",
                        "recommended_correction": "Ensure Sale Price >= Buyer Wholesale Price."
                    })
                
                # Sale Price must not be lower than MAP Price unless an approved MAP exception exists.
                from apps.pricing.services import get_effective_map_price
                eff_map = get_effective_map_price(vendor_company_id, sku, map_price)
                if eff_map is not None and sale_price < eff_map:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Sale Price",
                        "submitted_value": f"Sale: {sale_price}, MAP: {map_price}",
                        "validation_error": "Sale Price must not be lower than MAP Price.",
                        "recommended_correction": "Ensure Sale Price >= MAP Price (or approved MAP exception)."
                    })

            # --- Backend-Calculated Buyer Wholesale Price Validation ---
            if wholesale_price is not None and msrp is not None:
                buyer_commission_percentage = Decimal("14.00")
                buyer_commission_amount = msrp * (buyer_commission_percentage / Decimal("100.00"))
                buyer_wholesale_price = wholesale_price + buyer_commission_amount
                
                if buyer_wholesale_price <= wholesale_price:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Buyer Wholesale Price",
                        "submitted_value": str(buyer_wholesale_price),
                        "validation_error": "Calculated Buyer Wholesale Price must be greater than Vendor Wholesale Price.",
                        "recommended_correction": "Ensure MSRP and Vendor Wholesale Price are set correctly."
                    })
                if buyer_wholesale_price >= msrp:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Buyer Wholesale Price",
                        "submitted_value": str(buyer_wholesale_price),
                        "validation_error": "Calculated Buyer Wholesale Price must be lower than MSRP.",
                        "recommended_correction": "Ensure MSRP is sufficiently higher than Vendor Wholesale Price."
                    })
                if buyer_wholesale_price <= 0:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Buyer Wholesale Price",
                        "submitted_value": str(buyer_wholesale_price),
                        "validation_error": "Calculated Buyer Wholesale Price must be positive.",
                        "recommended_correction": "Ensure pricing inputs are positive."
                    })

            # --- Physical Dimensions ---
            length = parse_decimal_value(row.get("length"))
            width = parse_decimal_value(row.get("width"))
            height = parse_decimal_value(row.get("height"))
            weight = parse_decimal_value(row.get("weight"))
            
            if length is None or length <= 0 or width is None or width <= 0 or height is None or height <= 0 or weight is None or weight <= 0:
                should_stage = True

            # --- Descriptions ---
            description = str(row.get("productdescription") or row.get("description") or "").strip()
            short_desc = str(row.get("shortdescription") or "").strip()
            
            if not description and is_new_row:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Description",
                    "submitted_value": "",
                    "validation_error": "Product Description is required.",
                    "recommended_correction": "Provide a descriptive text for the product."
                })

            from apps.catalog.compatibility_import import parse_compatibility_row
            cat_cfg = DynamicDropdownConfig.objects.filter(field_name="product_category", value=product_category).first()
            try:
                row_compatibility_values, row_universal_device_types, row_device_ids = parse_compatibility_row(row, cat_cfg)
            except Exception as error:
                from django.core.exceptions import ValidationError as DjangoValidationError
                if not isinstance(error, DjangoValidationError):
                    raise
                row_compatibility_values, row_universal_device_types, row_device_ids = {}, [], []
                row_errors.append({"row_number": row_num, "column_name": "Device Compatibility", "submitted_value": "",
                    "validation_error": "; ".join(error.messages), "recommended_correction": "Use approved structured values and canonical device references."})
            # --- Image URLs (Rule §11/§22 URL validation) ---
            media_refs = []
            for k in ['imageurl1', 'imageurl2', 'imageurl3', 'imageurl4', 'imageurl5']:
                url_val = row.get(k)
                if url_val and str(url_val).strip():
                    media_refs.append(str(url_val).strip())

            if not media_refs:
                should_stage = True
            else:
                # Validate configured image URLs now (format + reachability +
                # PNG signature) so a non-PNG/broken reference cannot silently
                # create a buyer-ready product (Rule §11, §22, §23).
                if getattr(settings, "MEDIA_VALIDATE_IMPORT_URLS", True):
                    from apps.media.validation import validate_image_url
                    for url_val in media_refs:
                        try:
                            _ok, _data, _fname, _uerrs = validate_image_url(url_val)
                        except Exception as _exc:
                            _ok, _uerrs = False, [f"Image URL validation error ({_exc})."]
                        if not _ok:
                            row_errors.append({
                                "row_number": row_num,
                                "column_name": "Image URL",
                                "submitted_value": url_val,
                                "validation_error": " | ".join(_uerrs),
                                "recommended_correction": "Provide a reachable transparent PNG image URL (Rule §11).",
                            })



            # --- Product Type ---
            prod_type_raw = str(row.get("producttype") or "").strip().lower()
            if "merchandise" in prod_type_raw or (product_category and "merchandise" in product_category.lower()):
                product_type = "branded_merchandise"
            elif "device" in prod_type_raw or (product_category and "device" in product_category.lower()):
                product_type = "device"
            else:
                product_type = "accessory"

            # --- Non-critical enrichment defaults ---
            recommended = parse_bool_value(row.get("recommendedaccessory") or row.get("recommendedacccessory"))
            _inv_raw = row.get("inventorylevel")
            _inv_supplied = _inv_raw is not None and str(_inv_raw).strip() != ""
            inventory = parse_int_value(_inv_raw) if _inv_supplied else (0 if is_new_row else None)
            _invt_raw = row.get("inventorythreshold")
            _invt_supplied = _invt_raw is not None and str(_invt_raw).strip() != ""
            inventory_threshold = parse_int_value(_invt_raw) if _invt_supplied else (0 if is_new_row else None)
            warranty = row.get("brandwarranty") or row.get("warranty") or ""
            meta_t = row.get("metatitle") or ""
            meta_d = row.get("metadescription") or ""
            promo_info = row.get("promoinformation") or ""

            # --- State-based validation constraints for existing products ---
            if product is not None:
                is_admin = getattr(request.user, "is_cixci_admin", False)
                is_owner_or_admin = (str(product.vendor_company_reference) == str(vendor_company_id)) or is_admin
                if product.status == "active" and compatibility_update_type == "replace":
                    if not is_admin:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Device Compatibility",
                            "submitted_value": compatibility_update_type,
                            "validation_error": "Replacing device compatibility assertions on active products requires CIXCI Admin approval.",
                            "recommended_correction": "Contact CIXCI Admin or use Additive mode."
                        })

                if not is_owner_or_admin:
                    # 1. Identity & Brand cannot be edited by vendors in any state
                    if brand and brand != product.brand:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Brand",
                            "submitted_value": brand,
                            "validation_error": "Brand cannot be updated by vendors.",
                            "recommended_correction": "Revert Brand to registered value."
                        })
                    
                    # 2. Active & Tied/Sold state restrictions
                    if product.status == "active" and product.is_tied_to_activity:
                        if product_category and product_category != product.product_category:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Product Category", "submitted_value": product_category,
                                "validation_error": "Product Category cannot be updated for active, sold products without CIXCI Admin approval.",
                                "recommended_correction": "Revert category."
                            })
                        if upc_val and upc_val != product.upc:
                            row_errors.append({
                                "row_number": row_num, "column_name": "UPC", "submitted_value": upc_val,
                                "validation_error": "UPC cannot be updated for active, sold products without CIXCI Admin approval.",
                                "recommended_correction": "Revert UPC."
                            })
                        if name and " ".join(name.split()) != product.name:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Product Name", "submitted_value": name,
                                "validation_error": "Product Name cannot be updated for active, sold products without CIXCI Admin approval.",
                                "recommended_correction": "Revert Product Name."
                            })
                        if launch_date and launch_date != product.launch_date:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Launch Date", "submitted_value": str(launch_date),
                                "validation_error": "Launch Date cannot be updated for active, sold products without CIXCI Admin approval.",
                                "recommended_correction": "Revert Launch Date."
                            })
                        if release_date and release_date != product.release_date:
                            if release_date > today_est:
                                row_errors.append({
                                    "row_number": row_num, "column_name": "Release Date", "submitted_value": str(release_date),
                                    "validation_error": "Release Date cannot be changed to a future date for active, sold products without CIXCI Admin approval.",
                                    "recommended_correction": "Revert Release Date."
                                })
                        
                        # Pricing fields
                        pricing_fields = {
                            "vendorwholesaleprice": (wholesale_price, product.vendor_wholesale_price_amount, "Vendor Wholesale Price"),
                            "msrp": (msrp, product.msrp, "MSRP"),
                            "mapprice": (map_price, product.map_price, "MAP Price"),
                            "saleprice": (sale_price, product.sale_price, "Sale Price"),
                        }
                        for col, (sub_val, cur_val, lbl) in pricing_fields.items():
                            if sub_val is not None and sub_val != cur_val:
                                row_errors.append({
                                    "row_number": row_num, "column_name": lbl, "submitted_value": str(sub_val),
                                    "validation_error": f"{lbl} cannot be updated for active, sold products without CIXCI Admin approval.",
                                    "recommended_correction": f"Revert {lbl}."
                                })
                                
                        # Dimensions and weight
                        dim_fields = {
                            "length": (length, product.length, "Length"),
                            "width": (width, product.width, "Width"),
                            "height": (height, product.height, "Height"),
                            "weight": (weight, product.weight, "Weight"),
                        }
                        for col, (sub_val, cur_val, lbl) in dim_fields.items():
                            if sub_val is not None and sub_val != cur_val:
                                row_errors.append({
                                    "row_number": row_num, "column_name": lbl, "submitted_value": str(sub_val),
                                    "validation_error": f"{lbl} cannot be updated for active, sold products without CIXCI Admin approval.",
                                    "recommended_correction": f"Revert {lbl}."
                                })
                                
                        # Status changes from Active to Inactive or EOL
                        if status_str and status_str != product.status and status_str in ["inactive", "eol"]:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Product Status", "submitted_value": status_str,
                                "validation_error": "Status cannot be changed from Active to Inactive or EOL for sold products without CIXCI Admin approval.",
                                "recommended_correction": "Revert status."
                            })

                    # 3. Active & Not Yet Sold state restrictions
                    elif product.status == "active" and not product.is_tied_to_activity:
                        if product_category and product_category != product.product_category:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Product Category", "submitted_value": product_category,
                                "validation_error": "Product Category cannot be updated for active products without CIXCI Admin approval.",
                                "recommended_correction": "Revert category."
                            })
                        if upc_val and upc_val != product.upc:
                            row_errors.append({
                                "row_number": row_num, "column_name": "UPC", "submitted_value": upc_val,
                                "validation_error": "UPC cannot be updated for active products without CIXCI Admin approval.",
                                "recommended_correction": "Revert UPC."
                            })
                        if name and " ".join(name.split()) != product.name:
                            row_errors.append({
                                "row_number": row_num, "column_name": "Product Name", "submitted_value": name,
                                "validation_error": "Product Name cannot be updated for active products without CIXCI Admin approval.",
                                "recommended_correction": "Revert Product Name."
                            })
                        # Pricing fields
                        pricing_fields = {
                            "vendorwholesaleprice": (wholesale_price, product.vendor_wholesale_price_amount, "Vendor Wholesale Price"),
                            "msrp": (msrp, product.msrp, "MSRP"),
                            "mapprice": (map_price, product.map_price, "MAP Price"),
                            "saleprice": (sale_price, product.sale_price, "Sale Price"),
                        }
                        for col, (sub_val, cur_val, lbl) in pricing_fields.items():
                            if sub_val is not None and sub_val != cur_val:
                                row_errors.append({
                                    "row_number": row_num, "column_name": lbl, "submitted_value": str(sub_val),
                                    "validation_error": f"{lbl} cannot be updated for active products without CIXCI Admin approval.",
                                    "recommended_correction": f"Revert {lbl}."
                                })

            # --- Save or stage or fail execution ---
            if row_errors:
                failed_count += 1
                validation_errors.extend(row_errors)
            else:
                if should_stage:
                    staged_count += 1
                else:
                    passed_count += 1

                # Only products with a future launch date are set to "Inactive"
                if launch_date and launch_date > today_est and launch_date.year != 9999:
                    final_status = "inactive"
                else:
                    final_status = status_str or "active"

                # Rule §22/§31: a row with missing/invalid required media is
                # staged and can never import straight to Active.
                if should_stage and final_status == "active":
                    final_status = "inactive"

                # Category Governance: category_validation_status is set separately
                # on the product (not via product lifecycle status field)

                # AI Enrichment Simulation
                # 1. Clean Name
                cleaned_name = " ".join(name.split())
                
                # 2. Clean Product Description
                cleaned_desc = description
                colors_list = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown", "black", "white", "silver", "multi-color"]
                for c in colors_list:
                    cleaned_desc = cleaned_desc.replace(f" {c} ", " ")
                    cleaned_desc = cleaned_desc.replace(f" {c.capitalize()} ", " ")
                
                # 3. Generate Short Description if blank
                cleaned_short_desc = short_desc
                if not cleaned_short_desc:
                    cleaned_short_desc = f"Premium {brand or ''} {product_category or 'accessory'} designed for optimal compatibility."
                for c in colors_list:
                    cleaned_short_desc = cleaned_short_desc.replace(f" {c} ", " ")
                    cleaned_short_desc = cleaned_short_desc.replace(f" {c.capitalize()} ", " ")
                    
                # 4. Generate Meta Title if blank
                cleaned_meta_t = meta_t
                if not cleaned_meta_t:
                    cleaned_meta_t = f"{brand or ''} {cleaned_name} | CIXCI"
                    if len(cleaned_meta_t) > 65:
                        cleaned_meta_t = cleaned_meta_t[:62] + "..."
                        
                # 5. Generate Meta Description if blank
                cleaned_meta_d = meta_d
                if not cleaned_meta_d:
                    cleaned_meta_d = f"Purchase the high-quality {cleaned_name} ({sku}) in our {product_category} section."
                    if len(cleaned_meta_d) > 160:
                        cleaned_meta_d = cleaned_meta_d[:157] + "..."

                # Save or update product
                product = Product.objects.filter(sku=sku, vendor_company_reference=vendor_company_id).first()
                is_new = product is None
                
                if is_new:
                    product = Product(
                        sku=sku,
                        vendor_company_reference=vendor_company_id,
                        company_scope_reference=vendor_company_id
                    )
                
                # Helper: True when the raw CSV cell has a non-blank value.
                # Zero counts as supplied (§7: Zero Is Not Blank).
                def _supplied(*keys):
                    return any(row.get(k) is not None and str(row.get(k)).strip() != "" for k in keys)

                if is_new:
                    # CREATE: set all fields unconditionally
                    product.name = cleaned_name
                    product.series = series
                    product.brand = brand
                    product.brand_reference = brand_reference
                    product.product_type = product_type
                    product.product_category = product_category
                    product.vendor_category = vendor_category
                    product.vendor_category_raw = vendor_category_raw_val
                    product.category_validation_status = category_validation
                    product.description = cleaned_desc
                    product.short_description = cleaned_short_desc
                    product.promo_information = promo_info
                    product.upc = upc_val
                    product.color = color
                    product.system_color = sys_color
                    product.vendor_wholesale_price_amount = wholesale_price
                    product.vendor_wholesale_price_currency = "USD"
                    product.msrp = msrp
                    product.map_price = map_price
                    product.sale_price = sale_price
                    product.launch_date = launch_date
                    product.release_date = release_date
                    product.eol_date = eol_date
                    product.recommended_accessory = recommended
                    product.inventory_level = inventory
                    product.inventory_threshold = inventory_threshold
                    product.length = length
                    product.width = width
                    product.height = height
                    product.weight = weight
                    product.warranty = warranty
                    product.meta_title = cleaned_meta_t
                    product.meta_description = cleaned_meta_d
                    product.media_references = media_refs
                    product.status = final_status
                    product.selling_status = "for_sale" if final_status == "active" else "not_for_sale"
                else:
                    # UPDATE: Blank Field Protection (§5-§8)
                    # Only update fields intentionally supplied (non-blank).
                    # Blank/null/omitted = No Change.
                    if _supplied("productname", "accessoryname", "name"):
                        product.name = cleaned_name
                    if _supplied("series"):
                        product.series = series
                    if _supplied("brand"):
                        product.brand = brand
                        product.brand_reference = brand_reference
                    if _supplied("producttype"):
                        product.product_type = product_type
                    if _supplied("productcategory", "category"):
                        product.product_category = product_category
                        product.vendor_category = vendor_category
                        product.vendor_category_raw = vendor_category_raw_val
                        product.category_validation_status = category_validation
                    if _supplied("productdescription", "description"):
                        product.description = cleaned_desc
                    if _supplied("shortdescription"):
                        product.short_description = cleaned_short_desc
                    if _supplied("promoinformation"):
                        product.promo_information = promo_info
                    if _supplied("upc"):
                        product.upc = upc_val
                    if _supplied("color"):
                        product.color = color
                    if _supplied("systemcolor"):
                        product.system_color = sys_color
                    if _supplied("vendorwholesaleprice", "wholesaleprice", "vendorwholesalepriceamount"):
                        product.vendor_wholesale_price_amount = wholesale_price
                    if _supplied("msrp"):
                        product.msrp = msrp
                    if _supplied("mapprice"):
                        product.map_price = map_price
                    if _supplied("saleprice"):
                        product.sale_price = sale_price
                    if _supplied("launchdate"):
                        product.launch_date = launch_date
                    if _supplied("releasedate"):
                        product.release_date = release_date
                    if _supplied("eoldate"):
                        product.eol_date = eol_date
                    if _supplied("recommendedaccessory", "recommendedacccessory"):
                        product.recommended_accessory = recommended
                    if inventory is not None:
                        product.inventory_level = inventory
                    if inventory_threshold is not None:
                        product.inventory_threshold = inventory_threshold
                    if _supplied("length"):
                        product.length = length
                    if _supplied("width"):
                        product.width = width
                    if _supplied("height"):
                        product.height = height
                    if _supplied("weight"):
                        product.weight = weight
                    if _supplied("brandwarranty", "warranty"):
                        product.warranty = warranty
                    if _supplied("metatitle"):
                        product.meta_title = cleaned_meta_t
                    if _supplied("metadescription"):
                        product.meta_description = cleaned_meta_d
                    if media_refs:
                        product.media_references = media_refs
                    if _supplied("productstatus", "status"):
                        product.status = final_status
                        product.selling_status = "for_sale" if final_status == "active" else "not_for_sale"
                
                try:
                    from apps.catalog.compatibility_import import apply_import_values
                    apply_import_values(product, row_compatibility_values, row_universal_device_types, cat_cfg, compatibility_update_type)
                    product.save(actor_id=request.user.id)
                    if row_device_ids:
                        from apps.catalog.compatibility_commands import update_explicit_selections
                        selections = [{"device_id": identifier, "exclusion_reason": row.get("exclusionreason"), "notes": row.get("exclusionnotes", "")} for identifier in row_device_ids] if compatibility_update_type == "remove" else row_device_ids
                        update_explicit_selections(product, selections, request.user,
                            update_type=compatibility_update_type, basis="imported", change_source="Bulk Import")
                except Exception as ve:
                    from django.core.exceptions import ValidationError as DjangoValidationError
                    if "ValidationError" in ve.__class__.__name__ or isinstance(ve, DjangoValidationError):
                        if should_stage:
                            staged_count -= 1
                        else:
                            passed_count -= 1
                        failed_count += 1
                        
                        err_msg = str(ve)
                        if hasattr(ve, "message_dict"):
                            err_msg = "; ".join(f"{f}: {', '.join(msgs)}" for f, msgs in ve.message_dict.items())
                        elif hasattr(ve, "messages"):
                            err_msg = "; ".join(ve.messages)
                        elif hasattr(ve, "detail"):
                            # Handle rest_framework validation error detail dict/list
                            err_msg = str(ve.detail)
                            
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Product Fields",
                            "submitted_value": "",
                            "validation_error": err_msg,
                            "recommended_correction": "Correct the invalid fields."
                        })
                        validation_errors.extend(row_errors)
                        continue
                    else:
                        raise ve

                # AI Enrichment logging
                log_catalog_audit(
                    event_code="catalog.product.ai_enriched",
                    description="AI agent enriched product metadata, descriptions, and SEO titles during import.",
                    product_id=product.id,
                    actor_id=request.user.id
                )

                # Convert original image URLs to CIXCI MediaAsset records and link primary image reference
                # Rule §11/§22/§23: managed copy downloaded & validated as a
                # true transparent PNG before it can become the primary image.
                if media_refs:
                    from apps.media.models import MediaAsset, AssetType, AssetStatus
                    from apps.media.validation import validate_image_url, validate_image_bytes
                    from django.conf import settings
                    import os as _os
                    import uuid
                    media_url = getattr(settings, "MEDIA_URL", "/media/")
                    first_asset_id = None
                    cixci_media_refs = []
                    for idx, url in enumerate(media_refs):
                        ok, data, filename, errs = validate_image_url(url)
                        if not ok:
                            # Invalid reference — do not create a buyer-facing asset.
                            row_errors.append({
                                "row_number": row_num,
                                "column_name": "Image URL",
                                "submitted_value": url,
                                "validation_error": " | ".join(errs),
                                "recommended_correction": "Provide a reachable transparent PNG (Rule §11).",
                            })
                            continue

                        vres = validate_image_bytes(
                            data=data,
                            filename=filename,
                            asset_type="product_image",
                            mime_hint="image/png",
                            company_id=vendor_company_id,
                        )
                        if not vres.ok:
                            row_errors.append({
                                "row_number": row_num,
                                "column_name": "Image URL",
                                "submitted_value": url,
                                "validation_error": " | ".join(vres.errors),
                                "recommended_correction": "Image must be a transparent PNG within size/dimension limits (Rule §6).",
                            })
                            continue

                        asset_id = uuid.uuid4()
                        storage_key = f"{vendor_company_id}/product_image/{asset_id}/{filename}"
                        full_path = _os.path.join(settings.MEDIA_ROOT, storage_key)
                        _os.makedirs(_os.path.dirname(full_path), exist_ok=True)
                        try:
                            with open(full_path, "wb+") as dest:
                                dest.write(data)
                        except Exception:
                            pass

                        MediaAsset.objects.create(
                            id=asset_id,
                            asset_type=AssetType.PRODUCT_IMAGE,
                            status=AssetStatus.READY,
                            review_status="approved",
                            owner_module="catalog",
                            owner_record_id=product.id,
                            company_scope_reference=uuid.UUID(str(vendor_company_id)),
                            original_filename=filename,
                            file_extension=".png",
                            mime_type="image/png",
                            file_size_bytes=vres.file_size_bytes,
                            content_hash=vres.content_hash,
                            width=vres.width,
                            height=vres.height,
                            has_transparency=vres.has_transparency,
                            storage_key=storage_key,
                            is_public=True,
                            uploaded_by=request.user.id,
                        )
                        if idx == 0 or first_asset_id is None:
                            first_asset_id = asset_id
                        cixci_media_refs.append(media_short_url(asset_id))
                    
                    product.media_references = cixci_media_refs
                    if first_asset_id:
                        product.primary_image_reference = first_asset_id
                    else:
                        # No valid transparent PNG imported — keep the product
                        # out of buyer visibility (Rule §22/§31).
                        if product.status == "active":
                            product.status = "inactive"
                    super(Product, product).save()


                products_created.append(product)
                if is_new:
                    created_count += 1
                else:
                    updated_count += 1


        # 3. Save import details to the audit trail
        # Partial success (§24): valid rows succeed even when others fail.
        # Only rows that passed validation reached the save block.
        transaction.savepoint_commit(sid)

        log_catalog_audit(
            event_code="catalog.product.bulk_import",
            description=f"Bulk upload complete. Total: {len(rows)}, Passed: {passed_count}, Failed: {failed_count}, Staged: {staged_count}",
            product_id=None,
            actor_id=request.user.id
        )

        from django.db.models import Count
        from .compatibility_contract import eligible_devices
        mapping_counts = {str(row["product_id"]): row for row in ProductCompatibilityAssertion.objects.filter(
            product_id__in=[product.id for product in products_created]).values("product_id").annotate(
                matched=Count("id", filter=Q(is_compatible=True, is_excluded=False, device_reference__in=eligible_devices().values_list("id", flat=True))),
                excluded=Count("id", filter=Q(is_excluded=True)), pending=Count("id", filter=Q(match_status="Pending")))}
        compatibility_results = []
        for product in products_created:
            counts = mapping_counts.get(str(product.id), {"matched": 0, "excluded": 0, "pending": 0})
            compatibility_results.append({"product_id": str(product.id), "sku": product.sku,
                **{key: counts[key] for key in ("matched", "excluded", "pending")},
                "status": "complete" if counts["matched"] else "incomplete",
                "warning": "Compatibility Incomplete: no currently eligible devices match." if not counts["matched"] else ""})
        return Response({
            "total_rows_processed": len(rows),
            "rows_passed": passed_count,
            "rows_failed": failed_count,
            "rows_staged": staged_count,
            "rows_created": created_count,
            "rows_updated": updated_count,
            "errors": validation_errors,
            "products": ProductListSerializer(products_created, many=True, context=self.get_serializer_context()).data,
            "compatibility_results": compatibility_results,
        }, status=200 if not validation_errors else 207)

    # ── Batch Revalidation (Normalization Spec §13) ───────────────────────
    @action(detail=False, methods=["post"], url_path="batch-revalidate")
    def batch_revalidate(self, request):
        """
        Batch revalidation of existing products through normalization pipeline.

        Modes:
          - report: Show original→proposed changes without applying (default)
          - preview: Return full diff for admin approval
          - commit: Apply PASS-only changes and audit each modification

        Filters: vendor_company_reference, product_category, status, date_from, date_to
        """
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can run batch revalidation.")

        mode = request.data.get("mode", "report")
        if mode not in ("report", "preview", "commit"):
            return Response({"error": "mode must be report, preview, or commit"}, status=status.HTTP_400_BAD_REQUEST)

        limit = min(int(request.data.get("limit", 500)), 2000)
        qs = Product.objects.all()

        vendor_ref = request.data.get("vendor_company_reference")
        if vendor_ref:
            qs = qs.filter(vendor_company_reference=vendor_ref)
        category = request.data.get("product_category")
        if category:
            qs = qs.filter(product_category=category)
        prod_status = request.data.get("status")
        if prod_status:
            qs = qs.filter(status=prod_status)
        date_from = request.data.get("date_from")
        if date_from:
            qs = qs.filter(updated_at__date__gte=date_from)
        date_to = request.data.get("date_to")
        if date_to:
            qs = qs.filter(updated_at__date__lte=date_to)

        products = qs.order_by("-updated_at")[:limit]

        from apps.catalog.normalization import normalize_product, normalize_short_description, RULE_VERSION, Outcome

        results = []
        summary = {"total": 0, "pass": 0, "warn": 0, "fail": 0, "changed": 0, "applied": 0}
        CONTENT_FIELDS = ["name", "description", "short_description", "meta_title", "meta_description"]

        for product in products:
            summary["total"] += 1
            norm = normalize_product(
                name=product.name or "",
                brand=product.brand or "",
                category=product.product_category or "",
                color=product.color or "",
                short_description=product.short_description,
                description=product.description,
                meta_title=product.meta_title,
                meta_description=product.meta_description,
            )

            changes = {}
            for field in CONTENT_FIELDS:
                original = getattr(product, field, None) or ""
                proposed = norm.changes.get(field)
                if proposed is None:
                    proposed = ""
                if str(original).strip() != str(proposed).strip():
                    changes[field] = {"original": original, "proposed": proposed}

            if norm.outcome == Outcome.PASS:
                summary["pass"] += 1
            elif norm.outcome == Outcome.WARN:
                summary["warn"] += 1
            else:
                summary["fail"] += 1

            if changes:
                summary["changed"] += 1

            entry = {
                "product_id": str(product.id),
                "sku": product.sku,
                "name": product.name,
                "outcome": norm.outcome,
                "rule_version": RULE_VERSION,
                "changes": changes,
                "warnings": norm.warnings,
            }

            if mode == "commit" and changes and norm.outcome == Outcome.PASS:
                update_fields = ["updated_at"]
                for field, diff in changes.items():
                    setattr(product, field, diff["proposed"])
                    update_fields.append(field)
                # §15: Mark for buyer sync when buyer-facing fields changed
                from apps.catalog.normalization import detect_buyer_sync_needed
                original_vals = {f: d["original"] for f, d in changes.items()}
                proposed_vals = {f: d["proposed"] for f, d in changes.items()}
                if detect_buyer_sync_needed(original_vals, proposed_vals):
                    product.needs_buyer_sync = True
                    update_fields.append("needs_buyer_sync")
                product.save(update_fields=update_fields)
                entry["applied"] = True
                summary["applied"] += 1
            else:
                entry["applied"] = False

            results.append(entry)

        if mode == "commit" and summary["applied"] > 0:
            try:
                from apps.catalog.services import log_catalog_audit
                log_catalog_audit(
                    event_code="catalog.batch_revalidation.committed",
                    description=f"Batch revalidation committed: {summary['applied']}/{summary['total']} products updated (rule v{RULE_VERSION})",
                    product_id=None,
                    actor_id=request.user.id,
                    status="success",
                )
            except Exception:
                pass

        return Response({
            "mode": mode,
            "rule_version": RULE_VERSION,
            "summary": summary,
            "results": results if mode in ("preview", "commit") else results[:50],
        })

    @action(detail=False, methods=["get"], url_path="pending-sync")
    def pending_sync(self, request):
        """§15: List products that need buyer sync after normalization changes."""
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can view pending sync.")
        limit = min(int(request.query_params.get("limit", 100)), 1000)
        products = Product.objects.filter(needs_buyer_sync=True).order_by("-updated_at")[:limit]
        return Response({
            "count": Product.objects.filter(needs_buyer_sync=True).count(),
            "products": [
                {"id": str(p.id), "sku": p.sku, "name": p.name, "vendor": str(p.vendor_company_reference), "updated_at": p.updated_at.isoformat()}
                for p in products
            ],
        })

    @action(detail=False, methods=["post"], url_path="clear-sync")
    def clear_sync(self, request):
        """§15: Mark products as synced after buyer integration has processed them."""
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can clear sync flags.")
        product_ids = request.data.get("product_ids", [])
        if not product_ids:
            return Response({"error": "product_ids required"}, status=status.HTTP_400_BAD_REQUEST)
        updated = Product.objects.filter(id__in=product_ids, needs_buyer_sync=True).update(needs_buyer_sync=False)
        return Response({"cleared": updated})


class BuyerCompatibilityProjectionViewSet(BuyerScopedQuerysetMixin, viewsets.GenericViewSet):
    """
    Buyer-Scoped Compatibility Projection — read-only for buyers.
    Product Catalog owns this projection; buyers can read and refresh.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BuyerCompatibilityProjectionSerializer

    def get_queryset(self):
        return BuyerScopedCompatibilityProjection.objects.filter(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
            buyer_entity_reference=self.request.user.entity_id,
        )

    @action(detail=False, methods=["get"])
    def my_projection(self, request):
        """Get the buyer's current compatibility projection."""
        from apps.catalog.services import ensure_buyer_compatibility_projection

        proj = ensure_buyer_compatibility_projection(request.user, trigger="lazy_sync")
        if proj is None:
            return Response(
                {
                    "detail": "No projection yet. Add devices to your portfolio first.",
                    "reason": "no_portfolio_devices",
                },
                status=404,
            )
        return Response(BuyerCompatibilityProjectionSerializer(proj).data)

    @action(detail=False, methods=["post"])
    def refresh(self, request):
        """
        Manually trigger projection recalculation (Workflow 4).
        Uses the buyer's current company portfolio.
        """
        from apps.catalog.services import ensure_buyer_compatibility_projection

        proj = ensure_buyer_compatibility_projection(
            request.user, trigger="manual_refresh", force=True
        )
        if proj is None:
            return Response({"detail": "No portfolio snapshot available."}, status=400)

        return Response(
            {
                "status": proj.status,
                "compatible_count": proj.compatible_product_count,
                "last_recalculated_at": proj.last_recalculated_at,
            }
        )


class BuyerExportJobViewSet(BuyerScopedQuerysetMixin, viewsets.GenericViewSet):
    """Buyer product export jobs."""
    permission_classes = [IsAuthenticated]
    serializer_class = BuyerExportJobSerializer
    throttle_classes = []  # Default: no throttling

    def get_throttles(self):
        """Apply stricter throttling to export job creation."""
        if self.action == 'create_job':
            from config.throttling import ExportThrottle
            return [ExportThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        return BuyerProductExportJob.objects.filter(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
            buyer_entity_reference=self.request.user.entity_id,
        ).order_by("-created_at")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        instance = self.get_object()
        if instance.status != "completed" or not instance.output_file_reference:
            return Response({"error": "Export job is not completed or has no output file."}, status=400)
        from apps.media.models import MediaAsset
        asset = MediaAsset.objects.filter(id=instance.output_file_reference).first()
        if not asset:
            return Response({"error": "Media asset not found."}, status=404)
        
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        if not os.path.exists(full_path):
            return Response({"error": "File not found on disk."}, status=404)
            
        response = FileResponse(open(full_path, "rb"), content_type=asset.mime_type)
        response["Content-Disposition"] = f'attachment; filename="{asset.original_filename}"'
        return response

    @action(detail=False, methods=["get"])
    def list_jobs(self, request):
        return Response(BuyerExportJobSerializer(self.get_queryset()[:20], many=True).data)

    @action(detail=False, methods=["post"])
    def create_job(self, request):
        """Create a new buyer product export job."""
        # Export jobs are a buyer-scoped feature. CIXCI Admins and users without
        # a company entity cannot own export jobs.
        if not request.user.entity or not getattr(request.user.entity, 'company_id', None):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Export jobs require a buyer account linked to a company. "
                "System admins cannot create personal export jobs."
            )

        device_id = request.data.get("device_id", None)
        product_ids = request.data.get("product_ids", [])
        from rest_framework.exceptions import ValidationError, PermissionDenied
        from .compatibility_contract import buyer_portfolio_device_ids
        from .services import ensure_buyer_compatibility_projection
        if request.user.entity.company.company_type != "buyer":
            raise PermissionDenied("Only an authorized buyer entity can create buyer exports.")
        decision = check_access(request.user, "catalog.product.read", company_id=request.user.entity.company_id)
        if not decision.granted:
            raise PermissionDenied("Catalog read access is required.")
        if not isinstance(product_ids, list):
            raise ValidationError({"product_ids": "Supply an array of Product IDs."})
        import uuid
        try:
            product_ids = list(dict.fromkeys(str(uuid.UUID(str(value))) for value in product_ids))
            selected_device = uuid.UUID(str(device_id)) if device_id else None
        except (ValueError, TypeError, AttributeError):
            raise ValidationError({"selection": "Use valid canonical product and device UUIDs."}) from None
        portfolio = buyer_portfolio_device_ids(request.user) or set()
        if selected_device and selected_device not in portfolio:
            raise ValidationError({"device_id": "Select a current eligible device in this Buyer Entity portfolio."})
        projection = ensure_buyer_compatibility_projection(request.user, trigger="export_request", force=True)
        eligible_ids = set(projection.compatible_product_ids if projection else [])
        if selected_device:
            selected_ids = {str(value) for value in ProductCompatibilityAssertion.objects.filter(
                device_reference=selected_device, is_compatible=True, is_excluded=False,
            ).values_list("product_id", flat=True)}
            eligible_ids &= selected_ids
        if any(value not in eligible_ids for value in product_ids):
            raise ValidationError({"product_ids": "Selection contains products outside this entity's current eligible compatible assortment."})
        if product_ids:
            from apps.catalog.models import Product
            from apps.tenant.models import Company
            from apps.pricing.models import MapException
            from apps.catalog.services import log_catalog_audit
            from django.db.models import Q
            from decimal import Decimal
            import pytz
            from django.utils import timezone
            from rest_framework.exceptions import ValidationError

            est = pytz.timezone("US/Eastern")
            today_est = timezone.now().astimezone(est).date()
            buyer_company_id = request.user.entity.company_id if (request.user.entity and request.user.entity.company) else None
            
            # Fetch products in selection
            products = Product.objects.filter(id__in=product_ids)
            
            # Check compatibility incomplete products
            incomplete_products = products.filter(compatibility_status="incomplete")
            if incomplete_products.exists():
                raise ValidationError({"product_ids": [f"Product {p.sku} is Compatibility Incomplete and cannot be exported." for p in incomplete_products]})
            
            # Fetch exceptions
            approved_exceptions = MapException.objects.filter(
                status="approved",
                start_date__lte=today_est,
                end_date__gte=today_est
            )
            if buyer_company_id:
                approved_exceptions = approved_exceptions.filter(
                    Q(buyer_company_reference=buyer_company_id) | Q(buyer_company_reference__isnull=True)
                )
            else:
                approved_exceptions = approved_exceptions.filter(buyer_company_reference__isnull=True)
            except_skus = set(approved_exceptions.values_list("sku", flat=True))
            
            from config.cache_service import company_cache
            vendor_ids = list({p.vendor_company_reference for p in products if p.vendor_company_reference})
            vendors_bulk = company_cache.bulk_get(vendor_ids)
            violations = []
            for p in products:
                vendor = vendors_bulk.get(str(p.vendor_company_reference))
                is_map_enforced = vendor.get("map_pricing_enforced", False) if vendor else False
                
                if is_map_enforced and p.map_price is None:
                    violations.append((p, f"Product {p.sku} is missing a MAP price which is enforced for this vendor."))
                    continue
                    
                if p.map_price is not None:
                    # 1. Buyer wholesale price vs MAP price
                    wholesale = Decimal(str(p.vendor_wholesale_price_amount or "0.00"))
                    msrp_val = Decimal(str(p.msrp or "0.00"))
                    buyer_wholesale_price = wholesale + msrp_val * Decimal("0.14")
                    if buyer_wholesale_price >= p.map_price and p.sku not in except_skus:
                        violations.append((p, f"Product {p.sku} Buyer Wholesale Price ({buyer_wholesale_price}) is not lower than MAP Price ({p.map_price})."))
                        continue
                        
                    # 2. Sale price check
                    if p.sale_price is not None:
                        buyer_exc = approved_exceptions.filter(sku=p.sku, vendor_company_reference=p.vendor_company_reference).order_by("approved_minimum_price").first()
                        eff_map = buyer_exc.approved_minimum_price if buyer_exc else p.map_price
                        if p.sale_price < eff_map:
                            violations.append((p, f"Product {p.sku} Sale Price ({p.sale_price}) is lower than MAP Price ({eff_map})."))
                            continue

            if violations:
                # Log violation to the audit database
                for prod, msg in violations:
                    log_catalog_audit(
                        event_code="catalog.product.map_violation",
                        description=f"MAP violation in export request: {msg}",
                        product_id=prod.id,
                        actor_id=request.user.id,
                        status="failure"
                    )
                raise ValidationError({"product_ids": [msg for prod, msg in violations]})

        # Get portfolio snapshot reference
        from apps.devices.models import BuyerDevicePortfolioReference
        latest_ref = BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
        ).order_by("-last_change_timestamp").first()

        portfolio_snapshot_ref = projection.portfolio_snapshot_reference if projection else None
        if latest_ref and not portfolio_snapshot_ref:
            portfolio_snapshot_ref = latest_ref.current_portfolio_snapshot_reference
        if not portfolio_snapshot_ref:
            import uuid
            portfolio_snapshot_ref = uuid.uuid4()

        # Get role name
        role_name = "Buyer"
        if request.user.is_cixci_admin:
            role_name = "System Admin"
        elif request.user.entity and request.user.entity.company:
            if request.user.entity.company.company_type == "vendor":
                role_name = "Vendor"
            else:
                role_name = "Buyer"

        user_full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        if not user_full_name:
            user_full_name = request.user.email

        # Validate device_id if provided
        device_ref = None
        if device_id:
            from uuid import UUID as _UUID
            try:
                device_ref = _UUID(str(device_id))
            except (ValueError, TypeError):
                device_ref = None

        from apps.integration.storefront_api import request_storefront
        storefront = request_storefront(request, required=True)
        job = BuyerProductExportJob.objects.create(
            storefront=storefront,
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
            requested_by=request.user.id,
            portfolio_snapshot_reference=portfolio_snapshot_ref,
            device_reference=device_ref,
            format="API",
            include_incompatible=False,
            include_media_missing=bool(request.data.get("include_media_missing", False)),
            trigger_type="USER",
            triggered_by_id=request.user.id,
            triggered_by_name=user_full_name,
            triggered_by_role=role_name
        )

        from apps.catalog.models import BuyerProductExportSelectionSnapshot
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=product_ids if product_ids else [],
            portfolio_snapshot_reference=portfolio_snapshot_ref
        )

        # Dispatch Celery task for export.
        # With CELERY_TASK_ALWAYS_EAGER=True the task runs synchronously here.
        # Wrap in try/except so a task-level error does not kill the HTTP response —
        # the job record already exists and will show its status in the UI.
        from apps.catalog.tasks import process_buyer_export_job
        try:
            process_buyer_export_job.delay(job.id)
        except Exception as task_exc:
            import logging
            logger = logging.getLogger("apps.catalog")
            logger.error("Export task failed inline for job %s: %s", job.id, task_exc)

        return Response(BuyerExportJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def added_products(self, request):
        """Return product IDs already added by this buyer for a specific device."""
        device_id = request.query_params.get("device_id")
        if not device_id:
            return Response({"product_ids": []})

        from uuid import UUID as _UUID
        try:
            device_uuid = _UUID(device_id.strip())
        except (ValueError, TypeError):
            return Response({"product_ids": []})

        from apps.catalog.models import BuyerProductExportDate
        added = BuyerProductExportDate.objects.filter(
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
            device_reference=device_uuid,
        ).values_list("product_id", flat=True)

        return Response({"product_ids": [str(pid) for pid in added]})


class DynamicDropdownConfigViewSet(viewsets.ModelViewSet):
    pagination_class = None
    queryset = DynamicDropdownConfig.objects.all()
    serializer_class = DynamicDropdownConfigSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["field_name"]

    _FIELD_TO_PRODUCT_COLUMN = {
        "product_category": "product_category",
        "system_color": "system_color",
        "brand": "brand",
    }

    def check_permissions(self, request):
        super().check_permissions(request)
        from apps.tenant.services import check_access
        from rest_framework.exceptions import PermissionDenied
        modifying = self.action in ("create", "update", "partial_update", "destroy")
        result = check_access(request.user, "catalog.product.update" if modifying else "catalog.product.read")
        if not result.granted or (modifying and result.reason != "cixci_admin"):
            raise PermissionDenied("Only authorized CIXCI System Admins can change compatibility configuration." if modifying else "Catalog configuration access denied.")

    @action(detail=False, methods=["get"], url_path="compatibility-options")
    def compatibility_options(self, request):
        from .compatibility_configuration import public_configuration_options
        return Response(public_configuration_options())

    def perform_create(self, serializer):
        from .compatibility_configuration import save_configuration
        save_configuration(serializer, self.request.user)

    def perform_update(self, serializer):
        from .compatibility_configuration import save_configuration
        save_configuration(serializer, self.request.user)

    def perform_destroy(self, instance):
        from django.db import transaction
        from .compatibility_configuration import audit_configuration, configuration_snapshot
        with transaction.atomic():
            audit_configuration(instance, configuration_snapshot(instance), self.request.user, deleted=True)
            super().perform_destroy(instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from .compatibility_values import MANAGED_FIELDS, WIRELESS_POLICY_FIELD
        if instance.field_name in MANAGED_FIELDS + (WIRELESS_POLICY_FIELD,):
            return Response({"detail": "Deactivate this controlled value or policy to preserve historical references."}, status=status.HTTP_409_CONFLICT)
        product_field = self._FIELD_TO_PRODUCT_COLUMN.get(instance.field_name)
        if product_field:
            count = Product.objects.filter(**{product_field: instance.value}).count()
            if count:
                return Response(
                    {"detail": f"Cannot delete \"{instance.value}\" — it is used by {count} product{'s' if count != 1 else ''}. Remove the association first."},
                    status=status.HTTP_409_CONFLICT,
                )
        return super().destroy(request, *args, **kwargs)


# ─── Vendor Category Mapping (Category Governance) ───────────────────────────

class VendorCategoryMappingSerializer(serializers.ModelSerializer):
    vendor_company_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorCategoryMapping
        fields = [
            "id", "vendor_company_reference", "vendor_company_name",
            "vendor_category", "cixci_category", "cixci_category_reference",
            "status", "mapping_source", "effective_date",
            "created_at", "updated_at",
            "created_by", "created_by_name",
            "updated_by", "updated_by_name",
            "company_scope_reference",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "company_scope_reference", "cixci_category_reference"]

    def validate_cixci_category(self, value):
        """Validate that cixci_category matches an active CIXCI category in DynamicDropdownConfig."""
        cat_cfg = DynamicDropdownConfig.objects.filter(
            field_name="product_category", value=value, status="active"
        ).first()
        if not cat_cfg:
            active_cats = list(DynamicDropdownConfig.objects.filter(
                field_name="product_category", status="active"
            ).values_list("value", flat=True))
            raise serializers.ValidationError(
                f"'{value}' is not a valid CIXCI Category. "
                f"Valid categories: {', '.join(active_cats)}"
            )
        return value

    def get_vendor_company_name(self, obj):
        try:
            from config.cache_service import company_cache
            return company_cache.get_name(obj.vendor_company_reference)
        except Exception:
            return None

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        try:
            from apps.tenant.models import User
            user = User.objects.filter(id=obj.created_by).first()
            return user.full_name if user else None
        except Exception:
            return None

    def get_updated_by_name(self, obj):
        if not obj.updated_by:
            return None
        try:
            from apps.tenant.models import User
            user = User.objects.filter(id=obj.updated_by).first()
            return user.full_name if user else None
        except Exception:
            return None

    def _resolve_category_reference(self, cixci_category):
        """Resolve DynamicDropdownConfig.id for the given CIXCI category name."""
        cat_cfg = DynamicDropdownConfig.objects.filter(
            field_name="product_category", value=cixci_category
        ).first()
        return cat_cfg.id if cat_cfg else None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user.id
            import uuid
            validated_data['company_scope_reference'] = request.user.entity.company_id if request.user.entity else uuid.UUID(int=0)
        # Auto-populate cixci_category_reference
        validated_data['cixci_category_reference'] = self._resolve_category_reference(
            validated_data.get('cixci_category', '')
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['updated_by'] = request.user.id
        # Update cixci_category_reference if cixci_category changed
        if 'cixci_category' in validated_data:
            validated_data['cixci_category_reference'] = self._resolve_category_reference(
                validated_data['cixci_category']
            )
        return super().update(instance, validated_data)


class VendorCategoryMappingViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    """
    Category Governance: Manage vendor category to CIXCI category mappings.

    Only CIXCI Admins can create/update/delete mappings.
    Vendors can view their own mappings (read-only).
    """
    queryset = VendorCategoryMapping.objects.all().order_by('-created_at')
    serializer_class = VendorCategoryMappingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["vendor_company_reference", "status", "cixci_category"]
    search_fields = ["vendor_category", "cixci_category"]

    action_capability_map = {
        "list": None,      # All authenticated
        "retrieve": None,  # All authenticated
        "create": "admin_only",
        "update": "admin_only",
        "partial_update": "admin_only",
        "destroy": "admin_only",
    }

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Vendors can only see their own mappings
        if hasattr(user, 'company') and user.company and user.company.company_type == 'vendor':
            qs = qs.filter(vendor_company_reference=user.company.id)

        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        instance = serializer.save()
        self._reprocess_affected_products(instance)
        self._audit_log("catalog.category_mapping.created", instance,
                        f"Created mapping: '{instance.vendor_category}' → '{instance.cixci_category}'")

    @transaction.atomic
    def perform_update(self, serializer):
        old_category = serializer.instance.cixci_category
        instance = serializer.save()
        self._reprocess_affected_products(instance)
        self._audit_log("catalog.category_mapping.updated", instance,
                        f"Updated mapping: '{instance.vendor_category}' → '{instance.cixci_category}' (was '{old_category}')")

    def perform_destroy(self, instance):
        self._audit_log("catalog.category_mapping.deactivated", instance,
                        f"Deleted mapping: '{instance.vendor_category}' → '{instance.cixci_category}'")
        super().perform_destroy(instance)

    def _reprocess_affected_products(self, mapping):
        """
        Re-resolve category for all products with matching vendor_category.
        Does NOT change product status — only updates category fields.
        Also sets compatibility field defaults for products missing them.
        """
        from apps.catalog.models import CategoryValidationStatus, DynamicDropdownConfig

        affected = Product.objects.filter(
            vendor_company_reference=mapping.vendor_company_reference,
            vendor_category__iexact=mapping.vendor_category.strip()
        ).filter(
            Q(product_category_override__isnull=True) | Q(product_category_override='')
        )

        # Resolve compat defaults from category config
        cat_cfg = DynamicDropdownConfig.objects.filter(
            field_name="product_category", value=mapping.cixci_category
        ).first()
        compat_fields = [
            "headphone_jack_compatibility", "bluetooth_compatibility",
            "compatible_charging_interface", "wireless_charging_compatibility",
            "storage_expansion_compatibility", "memory_capacity",
            "compatible_watch_case_size",
        ]

        def get_default(f, rules):
            rule = rules.get(f, {})
            if rule.get("mode") == "defaulted":
                return rule.get("default_value", rule.get("default", ""))
            return ""

        rules = (cat_cfg.compatibility_rules or {}) if cat_cfg else {}

        reprocessed_count = 0
        for product in affected:
            product.product_category = mapping.cixci_category
            product.category_validation_status = CategoryValidationStatus.RESOLVED
            update_fields = ['product_category', 'category_validation_status', 'updated_at']

            # Set compat defaults only for empty/null fields
            for f in compat_fields:
                current = getattr(product, f, None)
                if not current or (isinstance(current, str) and not current.strip()):
                    setattr(product, f, get_default(f, rules))
                    update_fields.append(f)

            try:
                product.save(update_fields=update_fields, actor_id=self.request.user.id)
            except Exception as error:
                from django.core.exceptions import ValidationError as DjangoValidationError
                if not isinstance(error, DjangoValidationError):
                    raise
                raise serializers.ValidationError({"affected_products": {product.sku: error.messages}}) from error
            reprocessed_count += 1

        if reprocessed_count > 0:
            self._audit_log(
                "catalog.product.category_reprocessed", mapping,
                f"Reprocessed {reprocessed_count} product(s) for mapping "
                f"'{mapping.vendor_category}' → '{mapping.cixci_category}'"
            )

    def _audit_log(self, event_code, mapping, description):
        """Log category governance audit event."""
        try:
            from apps.catalog.services import log_catalog_audit
            log_catalog_audit(
                event_code=event_code,
                description=description,
                product_id=None,
                actor_id=self.request.user.id if self.request.user else None,
                status="success"
            )
        except Exception:
            import logging
            logging.getLogger("apps.catalog").error(
                f"Failed to log audit for {event_code}: {description}"
            )

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create vendor category mappings.
        Admin only.
        """
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can create category mappings.")

        mappings_data = request.data.get('mappings', [])
        if not isinstance(mappings_data, list):
            return Response(
                {"error": "Expected 'mappings' array in request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created = []
        errors = []

        for idx, mapping_data in enumerate(mappings_data):
            serializer = self.get_serializer(data=mapping_data)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    "index": idx,
                    "data": mapping_data,
                    "errors": serializer.errors
                })

        return Response({
            "created": created,
            "errors": errors,
            "summary": {
                "total": len(mappings_data),
                "created": len(created),
                "failed": len(errors)
            }
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)


# ─── Vendor Color Mapping ─────────────────────────────────────────────────────

class VendorColorMappingSerializer(serializers.ModelSerializer):
    vendor_company_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    affected_product_count = serializers.SerializerMethodField()

    class Meta:
        model = VendorColorMapping
        fields = [
            "id", "vendor_company_reference", "vendor_company_name",
            "vendor_color", "system_color", "status",
            "affected_product_count",
            "created_at", "updated_at",
            "created_by", "created_by_name",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_vendor_company_name(self, obj):
        try:
            from config.cache_service import company_cache
            return company_cache.get_name(obj.vendor_company_reference)
        except Exception:
            return None

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        try:
            from apps.tenant.models import User
            user = User.objects.filter(id=obj.created_by).first()
            return user.full_name if user else None
        except Exception:
            return None

    def get_affected_product_count(self, obj):
        return Product.objects.filter(
            vendor_company_reference=obj.vendor_company_reference,
            color__iexact=obj.vendor_color.strip(),
        ).count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user.id
        return super().create(validated_data)


class VendorColorMappingViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorColorMapping.objects.all().order_by('-created_at')
    serializer_class = VendorColorMappingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["vendor_company_reference", "status"]
    search_fields = ["vendor_color", "system_color"]

    action_capability_map = {
        "list": None,
        "retrieve": None,
        "create": "admin_only",
        "update": "admin_only",
        "partial_update": "admin_only",
        "destroy": "admin_only",
    }

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if hasattr(user, 'company') and user.company and user.company.company_type == 'vendor':
            qs = qs.filter(vendor_company_reference=user.company.id)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        instance = serializer.save()
        count = self._apply_color_to_products(instance)
        self._audit_log("catalog.color_mapping.created", instance,
                        f"Created color mapping: '{instance.vendor_color}' → '{instance.system_color}' ({count} products updated)")

    @transaction.atomic
    def perform_update(self, serializer):
        old_color = serializer.instance.system_color
        instance = serializer.save()
        count = self._apply_color_to_products(instance)
        self._audit_log("catalog.color_mapping.updated", instance,
                        f"Updated color mapping: '{instance.vendor_color}' → '{instance.system_color}' (was '{old_color}', {count} products updated)")

    def perform_destroy(self, instance):
        self._audit_log("catalog.color_mapping.deleted", instance,
                        f"Deleted color mapping: '{instance.vendor_color}' → '{instance.system_color}'")
        super().perform_destroy(instance)

    def _apply_color_to_products(self, mapping):
        if mapping.status != VendorColorMappingStatus.ACTIVE:
            return 0
        vendor_id = mapping.vendor_company_reference
        color_mappings = dict(
            VendorColorMapping.objects.filter(
                vendor_company_reference=vendor_id, status=VendorColorMappingStatus.ACTIVE,
            ).values_list('vendor_color', 'system_color')
        )
        color_mappings_lower = {k.strip().casefold(): v for k, v in color_mappings.items()}
        exact = Product.objects.filter(
            vendor_company_reference=vendor_id,
            color__iexact=mapping.vendor_color.strip(),
        )
        count = exact.update(system_color=mapping.system_color, system_colors=[mapping.system_color])
        compound = Product.objects.filter(
            vendor_company_reference=vendor_id,
            color__icontains=mapping.vendor_color.strip(),
        ).exclude(color__iexact=mapping.vendor_color.strip())
        from apps.catalog.normalization import resolve_system_colors
        for product in compound:
            colors_list, primary, _ = resolve_system_colors(product.color, color_mappings_lower)
            if colors_list:
                product.system_color = primary
                product.system_colors = colors_list
                product.save(update_fields=['system_color', 'system_colors', 'updated_at'])
                count += 1
        return count

    def _audit_log(self, event_code, mapping, description):
        try:
            from apps.catalog.services import log_catalog_audit
            log_catalog_audit(
                event_code=event_code,
                description=description,
                product_id=None,
                actor_id=self.request.user.id if self.request.user else None,
                status="success",
            )
        except Exception:
            import logging
            logging.getLogger("apps.catalog").error(
                f"Failed to log audit for {event_code}: {description}")

    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """List vendor colors with no active mapping for a given vendor."""
        vendor_id = request.query_params.get('vendor_company_reference')
        if not vendor_id:
            return Response({"error": "vendor_company_reference required"}, status=status.HTTP_400_BAD_REQUEST)
        mapped = set(
            VendorColorMapping.objects.filter(
                vendor_company_reference=vendor_id,
                status=VendorColorMappingStatus.ACTIVE,
            ).values_list('vendor_color', flat=True)
        )
        mapped_lower = {c.strip().casefold() for c in mapped}
        from django.db.models import Count
        unresolved = (
            Product.objects.filter(vendor_company_reference=vendor_id)
            .exclude(color='').exclude(color__isnull=True)
            .values('color').annotate(count=Count('id')).order_by('-count')
        )
        results = [
            {"vendor_color": row["color"], "product_count": row["count"]}
            for row in unresolved
            if row["color"].strip().casefold() not in mapped_lower
        ]
        return Response({"unresolved": results, "total_unresolved": len(results)})

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only CIXCI Admins can create color mappings.")
        mappings_data = request.data.get('mappings', [])
        if not isinstance(mappings_data, list):
            return Response({"error": "Expected 'mappings' array"}, status=status.HTTP_400_BAD_REQUEST)
        created, errors = [], []
        for idx, data in enumerate(mappings_data):
            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                self.perform_create(serializer)
                created.append(serializer.data)
            else:
                errors.append({"index": idx, "data": data, "errors": serializer.errors})
        return Response({
            "created": created, "errors": errors,
            "summary": {"total": len(mappings_data), "created": len(created), "failed": len(errors)}
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)


# ─── Import Alerts (missing devices + unresolved categories) ─────────────────

class ImportAlertViewSet(viewsets.ViewSet):
    """Admin dashboard for import data quality alerts."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only.")
        try:
            from apps.notification.models import NotificationRequest
        except ImportError:
            return Response({"alerts": []})

        event_types = [
            "catalog.unresolved_category",
            "catalog.unresolved_color",
            "catalog.missing_device_reference",
        ]
        alerts = NotificationRequest.objects.filter(
            event_type__in=event_types,
        ).order_by("-created_at")[:50]

        result = []
        for a in alerts:
            payload = a.safe_payload_summary or {}
            result.append({
                "id": str(a.id),
                "event_type": a.event_type,
                "source_module": a.source_module,
                "source_record_id": str(a.source_record_id) if a.source_record_id else None,
                "message": payload.get("message", ""),
                "items": payload.get("unresolved_categories")
                    or payload.get("unresolved_colors")
                    or payload.get("missing_devices", []),
                "count": payload.get("count", 0),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
        return Response({"alerts": result})

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only.")
        try:
            from apps.notification.models import NotificationRequest
            NotificationRequest.objects.filter(pk=pk).delete()
        except Exception:
            pass
        return Response({"dismissed": True})


# ─── Missing Devices (admin panel to add unmatched vendor devices) ────────────

class MissingDeviceViewSet(viewsets.ViewSet):
    """Admin panel: list vendor device names not in CIXCI Device Catalog
    and add them so cases/screen protectors can get compatibility assertions."""
    permission_classes = [IsAuthenticated]

    def _require_admin(self, request):
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only.")

    def list(self, request):
        """Return aggregated missing device names with product counts."""
        self._require_admin(request)
        try:
            from apps.notification.models import NotificationRequest
        except ImportError:
            return Response({"devices": []})

        alerts = NotificationRequest.objects.filter(
            event_type="catalog.missing_device_reference",
        ).order_by("-created_at")

        device_counts: dict[str, int] = {}
        vendor_ids: set[str] = set()
        for alert in alerts:
            payload = alert.safe_payload_summary or {}
            for name in payload.get("missing_devices", []):
                device_counts[name] = device_counts.get(name, 0) + 1
            vid = payload.get("vendor_company_id")
            if vid:
                vendor_ids.add(vid)

        from apps.devices.models import Device, Manufacturer, DeviceType
        existing_devices = set()
        for d in Device.objects.select_related("manufacturer").all():
            existing_devices.add(f"{d.manufacturer.name} {d.name}".strip().lower())
            existing_devices.add(d.name.strip().lower())

        manufacturers = {m.name.lower(): {"id": str(m.id), "name": m.name}
                         for m in Manufacturer.objects.filter(is_active=True)}
        device_types = {dt.code: {"id": str(dt.id), "code": dt.code, "name": dt.name}
                        for dt in DeviceType.objects.filter(is_active=True)}

        result = []
        for name, alert_count in sorted(device_counts.items(), key=lambda x: -x[1]):
            if name.strip().lower() in existing_devices:
                continue
            suggested_mfr, suggested_type = self._suggest_manufacturer_type(name, manufacturers)
            result.append({
                "vendor_device_name": name,
                "alert_count": alert_count,
                "suggested_manufacturer": suggested_mfr,
                "suggested_device_type": suggested_type,
                "already_exists": False,
            })

        return Response({
            "devices": result,
            "total": len(result),
            "manufacturers": sorted(manufacturers.values(), key=lambda m: m["name"]),
            "device_types": sorted(device_types.values(), key=lambda d: d["name"]),
        })

    def _suggest_manufacturer_type(self, vendor_name, manufacturers):
        vn = vendor_name.lower()
        mfr_map = {
            "iphone": "apple", "ipad": "apple", "airpods": "apple", "apple": "apple",
            "galaxy": "samsung", "samsung": "samsung",
            "pixel": "google", "google": "google",
            "moto": "motorola", "motorola": "motorola",
            "oneplus": "oneplus", "one plus": "oneplus",
            "lg ": "lg", "nokia": "nokia", "tcl": "tcl",
            "kyocera": "kyocera", "zte": "zte", "revvl": "tcl",
            "boost": "samsung", "cricket": "samsung",
        }
        suggested_mfr = None
        for keyword, mfr_key in mfr_map.items():
            if keyword in vn:
                for m_name, m_data in manufacturers.items():
                    if mfr_key in m_name:
                        suggested_mfr = m_data
                        break
                break

        suggested_type = "phone"
        if "ipad" in vn or "tab" in vn:
            suggested_type = "tablet"
        elif "watch" in vn:
            suggested_type = "smartwatch"
        return suggested_mfr, suggested_type

    @action(detail=False, methods=["post"])
    def add_device(self, request):
        """Create a new device in the catalog and auto-match products."""
        self._require_admin(request)
        vendor_device_name = request.data.get("vendor_device_name", "").strip()
        manufacturer_id = request.data.get("manufacturer_id")
        device_name = request.data.get("device_name", "").strip()
        device_type_code = request.data.get("device_type_code", "phone")

        if not vendor_device_name or not manufacturer_id or not device_name:
            return Response(
                {"error": "vendor_device_name, manufacturer_id, and device_name are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.devices.models import Device, Manufacturer, DeviceType

        try:
            manufacturer = Manufacturer.objects.get(pk=manufacturer_id, is_active=True)
        except Manufacturer.DoesNotExist:
            return Response({"error": "Manufacturer not found."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            device_type = DeviceType.objects.get(code=device_type_code, is_active=True)
        except DeviceType.DoesNotExist:
            return Response({"error": f"Device type '{device_type_code}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Device.objects.filter(manufacturer=manufacturer, name__iexact=device_name).first()
        if existing:
            device = existing
            created_device = False
        else:
            device = Device(
                manufacturer=manufacturer,
                device_type=device_type,
                name=device_name,
                lifecycle_status="available",
                imported_by=request.user.id,
            )
            device.save()
            created_device = True

        matched_count = self._auto_match_products(device, vendor_device_name, request.user)

        from apps.audit.models import AuditRecord
        AuditRecord.objects.create(
            event_code="catalog.missing_device.resolved",
            event_description=f"Admin added device '{manufacturer.name} {device_name}' to resolve vendor reference '{vendor_device_name}'. {matched_count} products matched.",
            status="completed",
            actor_reference=request.user.id,
            service_trigger_reference="admin_missing_device_panel",
            source_module="catalog",
            company_scope_reference=request.user.entity.company_id if hasattr(request.user, 'entity') and request.user.entity else request.user.id,
        )

        return Response({
            "device_id": str(device.id),
            "device_name": f"{manufacturer.name} {device_name}",
            "created": created_device,
            "products_matched": matched_count,
        }, status=status.HTTP_201_CREATED if created_device else status.HTTP_200_OK)

    def _auto_match_products(self, device, vendor_device_name, actor):
        """Find products referencing this vendor_device_name and create assertions."""
        import json
        import re
        from apps.integration.models import VendorCatalogItem

        vcis = VendorCatalogItem.objects.filter(
            payload__icontains=vendor_device_name,
        ).select_related("product")[:2000]

        to_create = []
        matched_product_ids = set()
        for vci in vcis:
            if not vci.product_id:
                continue
            payload = json.loads(vci.payload) if isinstance(vci.payload, str) else (vci.payload or {})
            compat = payload.get("compatible_devices", [])
            if not compat:
                continue
            device_names = []
            if isinstance(compat, list):
                for entry in compat:
                    if isinstance(entry, dict):
                        name = entry.get("name", "") or entry.get("device_name", "")
                    else:
                        name = str(entry)
                    if name.strip():
                        device_names.append(name.strip())
            elif isinstance(compat, str):
                device_names = [n.strip() for n in re.split(r"[;,]", compat) if n.strip()]

            for dn in device_names:
                if dn.strip().lower() == vendor_device_name.strip().lower():
                    if vci.product_id not in matched_product_ids:
                        to_create.append(ProductCompatibilityAssertion(
                            product_id=vci.product_id,
                            device_reference=device.id,
                            is_compatible=True,
                            is_excluded=False,
                            compatibility_basis="vendor_declaration",
                            notes=f"Resolved from vendor: {vendor_device_name}",
                        ))
                        matched_product_ids.add(vci.product_id)
                    break

        if to_create:
            ProductCompatibilityAssertion.objects.bulk_create(
                to_create, ignore_conflicts=True, batch_size=500,
            )
        return len(to_create)

    @action(detail=False, methods=["post"])
    def dismiss_device(self, request):
        """Remove a device name from the missing devices list."""
        self._require_admin(request)
        vendor_device_name = request.data.get("vendor_device_name", "").strip()
        if not vendor_device_name:
            return Response({"error": "vendor_device_name required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.notification.models import NotificationRequest
            for alert in NotificationRequest.objects.filter(event_type="catalog.missing_device_reference"):
                payload = alert.safe_payload_summary or {}
                devices = payload.get("missing_devices", [])
                if vendor_device_name in devices:
                    devices = [d for d in devices if d != vendor_device_name]
                    if not devices:
                        alert.delete()
                    else:
                        payload["missing_devices"] = devices
                        payload["count"] = len(devices)
                        alert.safe_payload_summary = payload
                        alert.save(update_fields=["safe_payload_summary"])
        except Exception:
            pass
        return Response({"dismissed": True})


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("my-projection", BuyerCompatibilityProjectionViewSet, basename="buyer-projection")
router.register("export-jobs", BuyerExportJobViewSet, basename="export-job")
router.register("dropdown-configs", DynamicDropdownConfigViewSet, basename="dropdown-config")
router.register("vendor-category-mappings", VendorCategoryMappingViewSet, basename="vendor-category-mapping")
router.register("vendor-color-mappings", VendorColorMappingViewSet, basename="vendor-color-mapping")
router.register("import-alerts", ImportAlertViewSet, basename="import-alert")
router.register("missing-devices", MissingDeviceViewSet, basename="missing-device")

urlpatterns = [path("", include(router.urls))]
