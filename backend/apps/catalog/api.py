"""Product Catalog — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from django.utils import timezone
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin, BuyerScopedQuerysetMixin
from apps.tenant.services import check_access

from .models import (
    Product, ProductCompatibilityAssertion,
    BuyerScopedCompatibilityProjection, BuyerProductExportJob,
    DynamicDropdownConfig, ProductStatus,
)
from .services import recalculate_buyer_compatibility_projection


# ─── Serializers ──────────────────────────────────────────────────────────────

class ProductSerializerBase(serializers.ModelSerializer):
    vendor_map_pricing_enforced = serializers.SerializerMethodField()

    def get_vendor_map_pricing_enforced(self, obj):
        try:
            from apps.tenant.models import Company
            vendor = Company.objects.filter(id=obj.vendor_company_reference).first()
            return vendor.map_pricing_enforced if vendor else False
        except Exception:
            return False

    def create(self, validated_data):
        request = self.context.get("request")
        actor_id = request.user.id if request and request.user and request.user.is_authenticated else None
        instance = self.Meta.model(**validated_data)
        instance.save(actor_id=actor_id)
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        actor_id = request.user.id if request and request.user and request.user.is_authenticated else None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(actor_id=actor_id)
        return instance


class ProductListSerializer(ProductSerializerBase):
    primary_image_url = serializers.SerializerMethodField()
    buyer_wholesale_price = serializers.ReadOnlyField()
    is_tied_to_activity = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "sku", "brand", "product_type", "product_category",
            "status", "selling_status", "primary_image_reference",
            "vendor_company_reference", "created_at",
            "description", "vendor_wholesale_price_amount",
            "vendor_wholesale_price_currency", "primary_image_url",
            "buyer_wholesale_price", "is_tied_to_activity",
            "upc", "launch_date", "release_date", "eol_date", "color", "system_color",
            "msrp", "map_price", "sale_price", "recommended_accessory",
            "inventory_level", "inventory_threshold", "length", "width", "height", "weight",
            "warranty", "short_description", "promo_information",
            "meta_title", "meta_description", "media_references",
            "headphone_jack_compatibility", "bluetooth_compatibility",
            "compatible_charging_interface", "wireless_charging_compatibility",
            "storage_expansion_compatibility", "memory_capacity",
            "compatible_watch_case_size", "compatibility_status",
            "vendor_map_pricing_enforced",
        ]
        read_only_fields = ["id", "created_at"]

    def get_primary_image_url(self, obj):
        if obj.primary_image_reference:
            try:
                from apps.media.models import MediaAsset
                from django.conf import settings
                asset = MediaAsset.objects.get(id=obj.primary_image_reference)
                if asset.status == "ready":
                    media_url = getattr(settings, "MEDIA_URL", "/media/")
                    return f"{media_url}{asset.storage_key}"
            except Exception:
                pass
        # Fallback to external media_references URLs if available
        if isinstance(obj.media_references, list) and len(obj.media_references) > 0:
            return obj.media_references[0]
        return None


class ProductDetailSerializer(ProductSerializerBase):
    primary_image_url = serializers.SerializerMethodField()
    buyer_wholesale_price = serializers.ReadOnlyField()
    is_tied_to_activity = serializers.ReadOnlyField()

    headphone_jack_compatibility = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    bluetooth_compatibility = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    compatible_charging_interface = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    wireless_charging_compatibility = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    storage_expansion_compatibility = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    memory_capacity = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    compatible_watch_case_size = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "company_scope_reference"]

    def validate_upc(self, value):
        if not value:
            raise serializers.ValidationError("UPC is required.")
        val_str = str(value).strip()
        if len(val_str) != 12 or not val_str.isdigit():
            raise serializers.ValidationError("UPC must follow valid UPC-A format (12 numeric characters).")
        
        # Check uniqueness per product, excluding self
        qs = Product.objects.filter(upc=val_str)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("UPC must be unique per product.")
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

    def validate(self, attrs):
        category = attrs.get('product_category') or (self.instance.product_category if self.instance else None)
        if category:
            from apps.catalog.models import DynamicDropdownConfig
            cat_cfg = DynamicDropdownConfig.objects.filter(field_name="product_category", value=category).first()
            if not cat_cfg:
                raise serializers.ValidationError({"product_category": "The selected product category is not recognized."})
            
            # Check status of product category
            if cat_cfg.status != 'active':
                raise serializers.ValidationError({"product_category": f"Product Category '{category}' is '{cat_cfg.status}' and cannot be used for products."})
            
            # Validate accessory compatibility fields according to the category rules
            rules = cat_cfg.compatibility_rules or {}
            compat_fields = [
                "headphone_jack_compatibility",
                "bluetooth_compatibility",
                "compatible_charging_interface",
                "wireless_charging_compatibility",
                "storage_expansion_compatibility",
                "memory_capacity",
                "compatible_watch_case_size"
            ]
            
            def get_default_value(f, r):
                if r and "default_value" in r:
                    return r["default_value"]
                if f == "bluetooth_compatibility":
                    return "Yes"
                return "Not Compatible"

            # Initialize defaults
            for f in compat_fields:
                val = attrs.get(f)
                rule = rules.get(f)
                mode = rule.get("mode", "hidden") if rule else "hidden"
                
                if val is None or (isinstance(val, str) and val.strip() == ""):
                    if self.instance and hasattr(self.instance, f):
                        attrs[f] = getattr(self.instance, f)
                    else:
                        attrs[f] = get_default_value(f, rule)

            # Validate based on mode
            for f in compat_fields:
                val = attrs.get(f)
                rule = rules.get(f)
                mode = rule.get("mode", "hidden") if rule else "hidden"
                
                if mode == "required":
                    if not val or val.strip() == "" or val == "Not Compatible":
                        raise serializers.ValidationError({f: f"{f.replace('_', ' ').title()} is required."})
                elif mode == "hidden":
                    attrs[f] = get_default_value(f, rule)
                elif mode == "conditional":
                    cond_field = rule.get("condition_field")
                    cond_values = rule.get("condition_values", [])
                    cond_val = attrs.get(cond_field)
                    if cond_field and cond_val in cond_values:
                        if not val or val.strip() == "" or val == "Not Compatible":
                            raise serializers.ValidationError({f: f"{f.replace('_', ' ').title()} is required when {cond_field.replace('_', ' ').title()} is {cond_val}."})
                            
                # Controlled value validations
                val = attrs.get(f)
                if val:
                    val = val.strip()
                    attrs[f] = val

                if f == "compatible_charging_interface" or f == "headphone_jack_compatibility":
                    if val not in ["Not Compatible", "Type-C", "Lightning"]:
                        raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                elif f == "bluetooth_compatibility":
                    if val not in ["Yes", "No"]:
                        raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                elif f == "wireless_charging_compatibility":
                    w_vals = [w.strip() for w in val.split('+') if w.strip()]
                    if not w_vals:
                        raise serializers.ValidationError({f: "Wireless Charging Compatibility is required."})
                    if 'Not Compatible' in w_vals and len(w_vals) > 1:
                        raise serializers.ValidationError({f: "Not Compatible cannot be selected with any other value."})
                    for w in w_vals:
                        if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                            raise serializers.ValidationError({f: f"Invalid Wireless Charging value '{w}'."})
                    if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                        raise serializers.ValidationError({f: "Qi cannot be selected with MagSafe or Qi2."})

                elif f == "storage_expansion_compatibility":
                    if val not in ["Not Compatible", "microSDXC", "microSDHC"]:
                        raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

                elif f == "memory_capacity":
                    storage = attrs.get("storage_expansion_compatibility")
                    if storage in ["microSDXC", "microSDHC"]:
                        if storage == "microSDXC":
                            allowed = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                        else:
                            allowed = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                        if val not in allowed:
                            raise serializers.ValidationError({f: f"Memory Capacity must match the allowed list for the selected storage type."})
                    else:
                        attrs[f] = "Not Compatible"

                elif f == "compatible_watch_case_size":
                    if val not in ["Not Compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]:
                        raise serializers.ValidationError({f: f"Invalid value for {f.replace('_', ' ').title()}."})

        for f in [
            "headphone_jack_compatibility",
            "bluetooth_compatibility",
            "compatible_charging_interface",
            "wireless_charging_compatibility",
            "storage_expansion_compatibility",
            "memory_capacity",
            "compatible_watch_case_size"
        ]:
            if f in attrs and attrs[f] is None:
                attrs[f] = ""

        return attrs


    def get_primary_image_url(self, obj):
        if obj.primary_image_reference:
            try:
                from apps.media.models import MediaAsset
                from django.conf import settings
                asset = MediaAsset.objects.get(id=obj.primary_image_reference)
                if asset.status == "ready":
                    media_url = getattr(settings, "MEDIA_URL", "/media/")
                    return f"{media_url}{asset.storage_key}"
            except Exception:
                pass
        # Fallback to external media_references URLs if available
        if isinstance(obj.media_references, list) and len(obj.media_references) > 0:
            return obj.media_references[0]
        return None


class ProductCompatibilityAssertionSerializer(serializers.ModelSerializer):
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
            "created_at", "updated_at"
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
                sensitive_fields = [
                    "notes", "match_reason", "match_source", "match_status",
                    "exclusion_source", "exclusion_reason", "created_by",
                    "updated_by", "reviewed_by", "reviewed_date"
                ]
                for field in sensitive_fields:
                    ret.pop(field, None)
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
    class Meta:
        model = BuyerProductExportJob
        fields = [
            "id", "status", "format", "include_incompatible",
            "portfolio_snapshot_reference", "product_count",
            "output_file_reference", "created_at", "completed_at",
        ]


class DynamicDropdownConfigSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = DynamicDropdownConfig
        fields = [
            "id", "field_name", "value", "display_name", "created_at",
            "status", "compatibility_mode", "eligible_device_types",
            "match_logic", "accessory_fields", "compatibility_rules"
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if not attrs.get("display_name"):
            attrs["display_name"] = attrs.get("value", "")
        return attrs


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class ProductViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    action_capability_map = {
        "list": "catalog.product.list",
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
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product_type", "status", "selling_status", "vendor_company_reference"]
    search_fields = [
        "name",
        "sku",
        "brand",
        "product_category",
        "vendor_wholesale_price_amount",
        "color",
        "status",
        "msrp",
    ]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action in ["retrieve", "create", "update", "partial_update"]:
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return Product.objects.none()
        if user.is_cixci_admin:
            return qs

        company = user.company
        if not company:
            return Product.objects.none()

        if company.company_type == "vendor":
            return qs.filter(vendor_company_reference=company.id)

        from apps.tenant.models import Company, CompanyStatus, CompanyType
        from django.db.models import Q
        import pytz

        # Non-vendor (buyer/retailer) users can only see Active products whose Release Date has arrived
        est = pytz.timezone("US/Eastern")
        today_est = timezone.now().astimezone(est).date()
        qs = qs.filter(status=ProductStatus.ACTIVE).exclude(compatibility_status="incomplete").filter(
            Q(release_date__isnull=True) | Q(release_date__lte=today_est)
        )

        if getattr(self, "action", None) == "list" and company.company_type == "buyer":
            from apps.integration.models import CompanyAPIKey
            is_api_key_auth = isinstance(self.request.auth, CompanyAPIKey)
            if is_api_key_auth:
                from apps.catalog.models import BuyerProductExportSelectionSnapshot
                exported_product_ids = BuyerProductExportSelectionSnapshot.objects.filter(
                    export_job__company_scope_reference=company.id
                ).values_list("product_ids", flat=True)
                
                flat_exported_ids = []
                for pid_list in exported_product_ids:
                    if isinstance(pid_list, list):
                        flat_exported_ids.extend(pid_list)
                
                qs = qs.filter(id__in=flat_exported_ids)

            device_id_param = self.request.query_params.get("device_id")
            from apps.devices.models import BuyerDevicePortfolioReference
            portfolio_device_ids = BuyerDevicePortfolioReference.objects.filter(
                buyer_reference=user.id,
                company_scope_reference=company.id,
                active_flag=True
            ).values_list("device_id", flat=True)

            if not portfolio_device_ids:
                return Product.objects.none()

            if device_id_param:
                from uuid import UUID
                try:
                    dev_uuids = [UUID(x.strip()) for x in device_id_param.split(",") if x.strip()]
                    target_device_ids = [d for d in dev_uuids if d in portfolio_device_ids]
                    if not target_device_ids:
                        return Product.objects.none()
                except ValueError:
                    return Product.objects.none()
            else:
                target_device_ids = portfolio_device_ids

            compatible_product_ids = ProductCompatibilityAssertion.objects.filter(
                device_reference__in=target_device_ids,
                is_compatible=True,
                is_excluded=False
            ).values_list("product_id", flat=True)

            qs = qs.filter(id__in=compatible_product_ids)

        buyer_regions = company.approved_regions or []
        if not isinstance(buyer_regions, list):
            buyer_regions = [buyer_regions]

        region_filter = Q()
        for r in buyer_regions:
            region_filter |= Q(approved_regions__icontains=f'"{r}"')

        # Find existing vendor companies that are NOT active OR NOT in the buyer's approved regions
        invisible_vendor_ids = Company.objects.filter(
            company_type=CompanyType.VENDOR
        ).exclude(
            Q(status=CompanyStatus.ACTIVE) & region_filter
        ).values_list("id", flat=True)

        qs = qs.exclude(vendor_company_reference__in=invisible_vendor_ids)

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
        return super().destroy(request, *args, **kwargs)

    def get_required_capability(self):
        action = getattr(self, "action", None)
        if action == "compatibility" and self.request.method == "POST":
            return "catalog.product.update"
        return super().get_required_capability()

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {}
        if user and user.entity:
            kwargs["company_scope_reference"] = user.entity.company_id
            if user.entity.company and user.entity.company.company_type == "vendor":
                kwargs["brand"] = user.entity.company.name
                kwargs["vendor_company_reference"] = user.entity.company.id
        else:
            vcr = serializer.validated_data.get("vendor_company_reference")
            if vcr:
                kwargs["company_scope_reference"] = vcr
                from apps.tenant.models import Company
                try:
                    comp = Company.objects.get(id=vcr)
                    kwargs["brand"] = comp.name
                except Company.DoesNotExist:
                    pass
            else:
                kwargs["company_scope_reference"] = "00000000-0000-0000-0000-000000000000"
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        kwargs = {}
        user = self.request.user
        if user and user.entity and user.entity.company:
            if user.entity.company.company_type == "vendor":
                kwargs["brand"] = user.entity.company.name
                kwargs["vendor_company_reference"] = user.entity.company.id
        serializer.save(**kwargs)

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
        """List or update device compatibility assertions for this product."""
        product = self.get_object()
        if request.method == "POST":
            action_type = request.data.get("action")
            if action_type:
                device_ref = request.data.get("device_reference")
                if not device_ref:
                    return Response({"error": "device_reference is required"}, status=400)
                is_admin = getattr(request.user, "is_cixci_admin", False)
                
                assertion, _ = ProductCompatibilityAssertion.objects.get_or_create(
                    product=product,
                    device_reference=device_ref,
                    defaults={
                        "is_compatible": True,
                        "compatibility_basis": "manual_assertion",
                    }
                )
                
                from apps.devices.models import Device
                try:
                    device = Device.objects.get(id=device_ref)
                    device_status = device.lifecycle_status
                    device_launch = device.launch_date
                except Exception:
                    device_status = "available"
                    device_launch = None
                
                from apps.catalog.compatibility_engine import log_compatibility_change
                
                if action_type == "exclude":
                    exclusion_reason = request.data.get("exclusion_reason")
                    notes = request.data.get("notes", "")
                    
                    if not exclusion_reason:
                        return Response({"error": "exclusion_reason is required for exclusion"}, status=400)
                    
                    valid_reasons = ["physical_mismatch", "connector_incompatibility", "power_spec_conflict", "firmware_os_limitation", "performance_issue", "regulatory_unsupported", "other"]
                    if exclusion_reason not in valid_reasons:
                        return Response({"error": "invalid exclusion_reason"}, status=400)
                    
                    if exclusion_reason == "other" and not notes.strip():
                        return Response({"error": "descriptive notes are required when exclusion reason is 'other'"}, status=400)
                    
                    prev_status = "Active" if assertion.is_compatible else "Excluded"
                    assertion.is_compatible = False
                    assertion.is_excluded = True
                    assertion.exclusion_type = "admin" if is_admin else "vendor"
                    assertion.exclusion_reason = exclusion_reason
                    assertion.notes = notes
                    assertion.exclusion_source = "admin" if is_admin else "vendor"
                    assertion.device_status_at_mapping = device_status
                    assertion.device_launch_date_at_mapping = device_launch
                    assertion.save()
                    log_compatibility_change(assertion, prev_status, "Excluded", actor_id=request.user.id, change_source="Manual Override", exclusion_reason=exclusion_reason, exclusion_source=assertion.exclusion_source)
                
                elif action_type == "restore":
                    if not is_admin:
                        if assertion.is_locked:
                            return Response({"error": "Cannot restore a locked mapping."}, status=403)
                        if assertion.exclusion_type != "vendor":
                            return Response({"error": "Vendors can only restore vendor exclusions."}, status=403)
                    
                    prev_status = "Excluded"
                    assertion.is_compatible = True
                    assertion.is_excluded = False
                    assertion.exclusion_type = None
                    assertion.exclusion_reason = None
                    assertion.exclusion_source = None
                    assertion.save()
                    log_compatibility_change(assertion, prev_status, "Active", actor_id=request.user.id, change_source="Manual Override")
                
                elif action_type == "lock":
                    if not is_admin:
                        return Response({"error": "Only CIXCI Admins can lock device mappings."}, status=403)
                    prev_status = "Active" if assertion.is_compatible else "Excluded"
                    assertion.is_locked = True
                    assertion.save()
                    log_compatibility_change(assertion, prev_status, "Locked", actor_id=request.user.id, change_source="Manual Override")
                
                elif action_type == "convert_to_admin_exclusion":
                    if not is_admin:
                        return Response({"error": "Only CIXCI Admins can convert exclusions to Admin exclusions."}, status=403)
                    prev_status = "Excluded (Vendor)"
                    assertion.is_compatible = False
                    assertion.is_excluded = True
                    assertion.exclusion_type = "admin"
                    assertion.exclusion_source = "admin"
                    assertion.save()
                    log_compatibility_change(assertion, prev_status, "Excluded (Admin)", actor_id=request.user.id, change_source="Manual Override")
                
                else:
                    return Response({"error": f"Unknown action: {action_type}"}, status=400)
                
                # Recalculate compatibility_status on the product
                cnt = ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True, is_excluded=False).count()
                new_status = "complete" if cnt >= 1 else "incomplete"
                if product.compatibility_status != new_status:
                    product.compatibility_status = new_status
                    Product.objects.filter(id=product.id).update(compatibility_status=new_status)
                
                try:
                    from apps.catalog.services import trigger_catalog_recalculation_for_product
                    trigger_catalog_recalculation_for_product(product.id)
                except Exception:
                    pass
                
                assertions = product.compatibility_assertions.all()
                return Response(ProductCompatibilityAssertionSerializer(assertions, many=True, context={"request": request}).data)

            # Bulk update/save compatibility assertions for this product
            assertions_data = request.data.get("assertions", [])
            update_type = request.data.get("compatibility_update_type", "add")
            
            # If update_type is replace or remove, verify permission:
            # if product is active and user is not admin, block it.
            is_admin = getattr(request.user, "is_cixci_admin", False)
            if update_type in ["replace", "remove"]:
                if product.status == "active" and not is_admin:
                    return Response({"error": "Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval."}, status=400)
            
            created = []
            if update_type == "replace":
                # Remove old assertions first
                ProductCompatibilityAssertion.objects.filter(product=product).delete()
                for item in assertions_data:
                    device_id = item.get("device_id") or item.get("device_reference")
                    is_compatible = item.get("is_compatible", True)
                    notes = item.get("notes", "")
                    if device_id:
                        assertion = ProductCompatibilityAssertion.objects.create(
                            product=product,
                            device_reference=device_id,
                            is_compatible=is_compatible,
                            compatibility_basis="manual_assertion",
                            notes=notes
                        )
                        created.append(assertion)
            elif update_type == "remove":
                for item in assertions_data:
                    device_id = item.get("device_id") or item.get("device_reference")
                    if device_id:
                        ProductCompatibilityAssertion.objects.filter(product=product, device_reference=device_id).delete()
            else: # add
                for item in assertions_data:
                    device_id = item.get("device_id") or item.get("device_reference")
                    is_compatible = item.get("is_compatible", True)
                    notes = item.get("notes", "")
                    if device_id:
                        assertion, created_bool = ProductCompatibilityAssertion.objects.update_or_create(
                            product=product,
                            device_reference=device_id,
                            defaults={
                                "is_compatible": is_compatible,
                                "compatibility_basis": "manual_assertion",
                                "notes": notes
                            }
                        )
                        created.append(assertion)
                        
            try:
                from apps.catalog.services import trigger_catalog_recalculation_for_product
                trigger_catalog_recalculation_for_product(product.id)
            except Exception:
                pass
                
            assertions = product.compatibility_assertions.all()
            return Response(ProductCompatibilityAssertionSerializer(assertions, many=True, context={"request": request}).data)
        
        # GET returns current assertions
        assertions = product.compatibility_assertions.all()
        return Response(ProductCompatibilityAssertionSerializer(assertions, many=True, context={"request": request}).data)

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

    @action(detail=False, methods=["post"])
    def bulk_upload(self, request):
        """Bulk upload products from a CSV or Excel (.xlsx) file with detailed validations."""
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
        
        seen_skus = set()
        seen_upcs = set()
        
        vendor_company_id = request.user.entity.company_id if (request.user.entity and request.user.entity.company) else None
        if not vendor_company_id:
            # Fallback for admin users without a specific vendor company context
            vendor_company_id = "00000000-0000-0000-0000-000000000000"
            
        from apps.tenant.models import Company
        vendor = Company.objects.filter(id=vendor_company_id).first()
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
            elif raw_mode in ["create and update / upsert", "upsert", "create_update"]:
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
            elif sku in seen_skus:
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
                
            # --- Product Name ---
            name = str(row.get("productname") or row.get("accessoryname") or row.get("name") or "").strip()
            if not name:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Name",
                    "submitted_value": "",
                    "validation_error": "Product Name must not be blank.",
                    "recommended_correction": "Provide a readable, customer-facing product name."
                })
                
            # --- Brand ---
            brand = str(row.get("brand") or "").strip()
            if not brand:
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
            status_str = str(row.get("productstatus") or row.get("status") or "").strip().lower()
            if not status_str:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Status",
                    "submitted_value": "",
                    "validation_error": "Product Status must not be blank.",
                    "recommended_correction": "Provide one of: Active, Inactive, EOL, Out of Stock."
                })
            elif status_str not in ["active", "inactive", "eol", "out_of_stock"]:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Status",
                    "submitted_value": status_str,
                    "validation_error": "Invalid Product Status value.",
                    "recommended_correction": "Provide one of: Active, Inactive, EOL, Out of Stock."
                })

            # --- Launch Date ---
            launch_raw = row.get("launchdate")
            launch_date = parse_date_value(launch_raw)
            if not launch_date:
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
                if not release_date:
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
                if not eol_date:
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

            # --- Product Category ---
            category_raw = str(row.get("productcategory") or row.get("category") or "").strip()
            product_category = None
            if not category_raw:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Category",
                    "submitted_value": "",
                    "validation_error": "Product Category must not be blank.",
                    "recommended_correction": "Specify a valid approved category."
                })
            else:
                cat_exists = DynamicDropdownConfig.objects.filter(field_name="product_category", value__iexact=category_raw).first()
                if cat_exists:
                    product_category = cat_exists.value
                else:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Product Category",
                        "submitted_value": category_raw,
                        "validation_error": f"Unknown Product Category '{category_raw}'.",
                        "recommended_correction": "Map to an approved category."
                    })

            # --- UPC ---
            upc_val = str(row.get("upc") or "").strip()
            if upc_val.endswith(".0"):
                upc_val = upc_val[:-2]
            if not upc_val:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": "",
                    "validation_error": "UPC must not be blank.",
                    "recommended_correction": "Provide a 12-digit numeric UPC."
                })
            elif len(upc_val) != 12 or not upc_val.isdigit():
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": upc_val,
                    "validation_error": "UPC must be exactly 12 numeric digits.",
                    "recommended_correction": "Enter exactly 12 digits (e.g. 012345678901)."
                })
            elif upc_val in seen_upcs:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "UPC",
                    "submitted_value": upc_val,
                    "validation_error": "Duplicate UPC within the same import file.",
                    "recommended_correction": "Ensure each UPC in the file is unique."
                })
            else:
                seen_upcs.add(upc_val)
                # Check global uniqueness in database
                qs = Product.objects.filter(upc=upc_val)
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
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Inventory Level",
                        "submitted_value": "",
                        "validation_error": "Inventory Level must not be blank.",
                        "recommended_correction": "Provide a non-negative integer."
                    })
                else:
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
                    sys_color_exists = DynamicDropdownConfig.objects.filter(field_name="system_color", value__iexact=sys_color).exists()
                    if not sys_color_exists:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "System Color",
                            "submitted_value": sys_color,
                            "validation_error": f"System Color '{sys_color}' is not on the approved list.",
                            "recommended_correction": "Choose an approved system color like Red, Blue, etc."
                        })

            # --- Prices ---
            wholesale_price = parse_decimal_value(row.get("vendorwholesaleprice") or row.get("wholesaleprice") or row.get("vendorwholesalepriceamount"))
            msrp = parse_decimal_value(row.get("msrp"))
            map_price = parse_decimal_value(row.get("mapprice"))
            sale_price = parse_decimal_value(row.get("saleprice"))
            
            if wholesale_price is None:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Vendor Wholesale Price",
                    "submitted_value": "",
                    "validation_error": "Vendor Wholesale Price must not be blank.",
                    "recommended_correction": "Provide a numeric wholesale price."
                })
            elif wholesale_price <= 0:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Vendor Wholesale Price",
                    "submitted_value": str(wholesale_price),
                    "validation_error": "Vendor Wholesale Price must be greater than zero.",
                    "recommended_correction": "Provide a positive price value."
                })
                
            if msrp is None:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "MSRP",
                    "submitted_value": "",
                    "validation_error": "MSRP must not be blank.",
                    "recommended_correction": "Provide a numeric MSRP."
                })
            elif msrp <= 0:
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
            
            if length is not None and length <= 0:
                row_errors.append({"row_number": row_num, "column_name": "Length", "submitted_value": str(length), "validation_error": "Length must be greater than zero.", "recommended_correction": "Provide Length > 0."})
            if width is not None and width <= 0:
                row_errors.append({"row_number": row_num, "column_name": "Width", "submitted_value": str(width), "validation_error": "Width must be greater than zero.", "recommended_correction": "Provide Width > 0."})
            if height is not None and height <= 0:
                row_errors.append({"row_number": row_num, "column_name": "Height", "submitted_value": str(height), "validation_error": "Height must be greater than zero.", "recommended_correction": "Provide Height > 0."})
            if weight is not None and weight <= 0:
                row_errors.append({"row_number": row_num, "column_name": "Weight", "submitted_value": str(weight), "validation_error": "Weight must be greater than zero.", "recommended_correction": "Provide Weight > 0."})

            if length is None or width is None or height is None or weight is None:
                should_stage = True

            # --- Descriptions ---
            description = str(row.get("productdescription") or row.get("description") or "").strip()
            short_desc = str(row.get("shortdescription") or "").strip()
            
            if not description:
                row_errors.append({
                    "row_number": row_num,
                    "column_name": "Product Description",
                    "submitted_value": "",
                    "validation_error": "Product Description is required.",
                    "recommended_correction": "Provide a descriptive text for the product."
                })
            else:
                if color and color.lower() in description.lower():
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Product Description",
                        "submitted_value": description,
                        "validation_error": "Product Description must not include the product color.",
                        "recommended_correction": "Remove color reference from description."
                    })
                if color and short_desc and color.lower() in short_desc.lower():
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Short Description",
                        "submitted_value": short_desc,
                        "validation_error": "Short Description must not include the product color.",
                        "recommended_correction": "Remove color reference from short description."
                    })

            # --- Device Compatibility ---
            comp_val = row.get("devicecompatibility") or row.get("compatibility") or ""
            normalized_comp = ""
            
            row_keys = set(row.keys())
            possible_compat_cols = [
                "bluetoothcompatibility", "bluetooth",
                "headphonejackcompatibility", "headphonejack",
                "compatiblecharginginterface", "charginginterface",
                "wirelesschargingcompatibility", "wirelesscharging",
                "storageexpansioncompatibility", "storageexpansion",
                "memorycapacity",
                "compatiblewatchcasesize", "watchcasesize"
            ]
            has_separate_cols = any(k in row_keys for k in possible_compat_cols)
            
            def get_row_value(r_dict, *keys):
                for k in keys:
                    norm_k = "".join(c for c in str(k).lower() if c.isalnum())
                    if norm_k in r_dict:
                        return str(r_dict[norm_k] or "").strip()
                return ""

            row_bluetooth = get_row_value(row, "bluetooth_compatibility", "bluetooth", "bluetoothcompatibility")
            row_jack = get_row_value(row, "headphone_jack_compatibility", "headphonejack", "headphonejackcompatibility")
            row_charging = get_row_value(row, "compatible_charging_interface", "charginginterface", "compatiblecharginginterface")
            row_wireless = get_row_value(row, "wireless_charging_compatibility", "wirelesscharging", "wirelesschargingcompatibility")
            row_storage = get_row_value(row, "storage_expansion_compatibility", "storageexpansion", "storageexpansioncompatibility")
            row_memory = get_row_value(row, "memory_capacity", "memorycapacity")
            row_watch_size = get_row_value(row, "compatible_watch_case_size", "watchcasesize", "compatiblewatchcasesize")

            if comp_val or has_separate_cols:
                comp_str = str(comp_val).strip()
                # Category-specific structural validation
                comp_errors = []
                
                # Parse from compatibility column if separate columns not present
                if not has_separate_cols and comp_str:
                    # Support both comma and semicolon separation
                    unified_comp_str = comp_str.replace(",", ";")
                    groups = [g.strip() for g in unified_comp_str.split(";") if g.strip()]
                    seen_g = set()
                    unique_groups = []
                    for g in groups:
                        gl = g.lower()
                        if gl not in seen_g:
                            seen_g.add(gl)
                            unique_groups.append(g)
                        
                        # Set default variables based on parts for category-specific check below
                        for g in unique_groups:
                            parts = [p.strip() for p in g.split("+") if p.strip()]
                            parts_lower = [p.lower() for p in parts]
                            
                            if product_category == "Headphones":
                                row_bluetooth = "Yes" if "bluetooth" in parts_lower else "No"
                                row_jack = "Not Compatible"
                                if "lightning" in parts_lower:
                                    row_jack = "Lightning"
                                elif "type-c" in parts_lower:
                                    row_jack = "Type-C"
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    if p.lower() not in ["lightning", "type-c", "bluetooth", "not compatible"]:
                                        comp_errors.append(f"Invalid attribute '{p}' for Headphones.")

                            elif product_category == "Speakers":
                                row_bluetooth = "Yes" if "bluetooth" in parts_lower else "No"
                                row_charging = "Not Compatible"
                                if "lightning" in parts_lower:
                                    row_charging = "Lightning"
                                elif "type-c" in parts_lower:
                                    row_charging = "Type-C"
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    if p.lower() not in ["type-c", "lightning", "bluetooth", "not compatible"]:
                                        comp_errors.append(f"Invalid attribute '{p}' for Speakers.")

                            elif product_category == "Chargers and Cables":
                                row_charging = "Not Compatible"
                                if "lightning" in parts_lower:
                                    row_charging = "Lightning"
                                elif "type-c" in parts_lower:
                                    row_charging = "Type-C"
                                w_list = [w for w in ["magsafe", "qi", "qi2"] if w in parts_lower]
                                case_map = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2"}
                                row_wireless = "+".join(case_map[w] for w in w_list) if w_list else "Not Compatible"
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    if p.lower() not in ["iphone", "android", "lightning", "type-c", "magsafe", "qi", "qi2", "not compatible"]:
                                        comp_errors.append(f"Invalid attribute '{p}' for Chargers and Cables.")

                            elif product_category == "Memory":
                                row_storage = "Not Compatible"
                                if "microsdxc" in parts_lower:
                                    row_storage = "microSDXC"
                                elif "microsdhc" in parts_lower:
                                    row_storage = "microSDHC"
                                row_memory = "Not Compatible"
                                valid_sizes = ["16gb", "32gb", "64gb", "128gb", "256gb", "512gb", "1tb", "1.5tb", "2tb"]
                                for p in parts_lower:
                                    if p in valid_sizes:
                                        row_memory = p.upper()
                                        break
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    pl = p.lower()
                                    if pl not in valid_sizes and pl not in ["microsdxc", "microsdhc", "not compatible", "mircosdxc", "mircosdhc", "512bg"]:
                                        comp_errors.append(f"Invalid attribute '{p}' for Memory.")

                            elif product_category == "Wearable Tech":
                                row_charging = "Not Compatible"
                                if "lightning" in parts_lower:
                                    row_charging = "Lightning"
                                elif "type-c" in parts_lower:
                                    row_charging = "Type-C"
                                w_list = [w for w in ["magsafe", "qi", "qi2"] if w in parts_lower]
                                case_map = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2"}
                                row_wireless = "+".join(case_map[w] for w in w_list) if w_list else "Not Compatible"
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    if p.lower() not in ["type-c", "lightning", "magsafe", "qi", "qi2", "not compatible"]:
                                        comp_errors.append(f"Invalid attribute '{p}' for Wearable Tech.")

                            elif product_category == "Watch Accessories":
                                row_watch_size = "Not Compatible"
                                valid_sizes = ["40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]
                                for p in parts_lower:
                                    if p in valid_sizes:
                                        row_watch_size = p
                                        break
                                w_list = [w for w in ["magsafe", "qi", "qi2"] if w in parts_lower]
                                case_map = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2"}
                                row_wireless = "+".join(case_map[w] for w in w_list) if w_list else "Not Compatible"
                                if "not compatible" in parts_lower:
                                    if len(parts_lower) > 1:
                                        comp_errors.append("Not Compatible cannot be combined with other values.")
                                for p in parts:
                                    if p.lower() not in ["magsafe", "qi", "qi2", "not compatible"] and p.lower() not in valid_sizes:
                                        comp_errors.append(f"Invalid attribute '{p}' for Watch Accessories.")
                        
                        normalized_comp = ";".join(unique_groups)
                    else:
                        normalized_comp = comp_str

                # Now perform precise validation on the values of the fields
                if product_category == "Headphones":
                    if not row_jack or not row_bluetooth:
                        comp_errors.append("Headphone Jack Compatibility and Bluetooth Compatibility are required.")
                    if row_jack and row_jack not in ["Not Compatible", "Lightning", "Type-C"]:
                        comp_errors.append(f"Invalid Headphone Jack Compatibility '{row_jack}'.")
                    if row_bluetooth and row_bluetooth not in ["Yes", "No"]:
                        comp_errors.append(f"Invalid Bluetooth Compatibility '{row_bluetooth}'.")
                    if row_jack == "Not Compatible" and row_bluetooth == "No":
                        comp_errors.append("Headphones must support either Bluetooth or a compatible jack (cannot both be Not Compatible/No).")

                elif product_category == "Speakers":
                    if not row_charging or not row_bluetooth:
                        comp_errors.append("Compatible Charging Interface and Bluetooth Compatibility are required.")
                    if row_charging and row_charging not in ["Not Compatible", "Lightning", "Type-C"]:
                        comp_errors.append(f"Invalid Compatible Charging Interface '{row_charging}'.")
                    if row_bluetooth and row_bluetooth not in ["Yes", "No"]:
                        comp_errors.append(f"Invalid Bluetooth Compatibility '{row_bluetooth}'.")

                elif product_category == "Chargers and Cables":
                    if not row_charging or not row_wireless:
                        comp_errors.append("Compatible Charging Interface and Wireless Charging Compatibility are required.")
                    if row_charging and row_charging not in ["Not Compatible", "Lightning", "Type-C"]:
                        comp_errors.append(f"Invalid Compatible Charging Interface '{row_charging}'.")
                    if row_wireless:
                        w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                        if 'Not Compatible' in w_vals and len(w_vals) > 1:
                            comp_errors.append("Not Compatible cannot be combined with other wireless charging values.")
                        for w in w_vals:
                            if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                                comp_errors.append(f"Invalid Wireless Charging value '{w}'.")
                        if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                            comp_errors.append("Qi cannot be selected with MagSafe or Qi2.")

                elif product_category == "Memory":
                    if not row_storage:
                        comp_errors.append("Storage Expansion Compatibility is required.")
                    if row_storage and row_storage not in ["Not Compatible", "microSDXC", "microSDHC"]:
                        # Attempt loose spellings
                        if row_storage.lower() == "microsdxc" or row_storage.lower() == "mircosdxc":
                            row_storage = "microSDXC"
                        elif row_storage.lower() == "microsdhc" or row_storage.lower() == "mircosdhc":
                            row_storage = "microSDHC"
                        else:
                            comp_errors.append(f"Invalid Storage Expansion Compatibility '{row_storage}'.")
                    
                    if row_storage in ["microSDXC", "microSDHC"]:
                        if not row_memory or row_memory == "Not Compatible":
                            comp_errors.append("Memory Capacity is required when storage expansion is enabled.")
                        else:
                            if row_storage == "microSDXC":
                                allowed = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
                            else:
                                allowed = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB']
                            if row_memory.upper() not in [a.upper() for a in allowed]:
                                comp_errors.append(f"Memory Capacity '{row_memory}' must match allowed list for {row_storage}.")
                    else:
                        if row_memory and row_memory.lower() not in ["not compatible", "none", ""]:
                            comp_errors.append("Memory Capacity must be Not Compatible when Storage Expansion is Not Compatible.")

                elif product_category == "Wearable Tech":
                    if not row_charging or not row_wireless:
                        comp_errors.append("Compatible Charging Interface and Wireless Charging Compatibility are required.")
                    if row_charging and row_charging not in ["Not Compatible", "Lightning", "Type-C"]:
                        comp_errors.append(f"Invalid Compatible Charging Interface '{row_charging}'.")
                    if row_wireless:
                        w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                        if 'Not Compatible' in w_vals and len(w_vals) > 1:
                            comp_errors.append("Not Compatible cannot be combined with other wireless charging values.")
                        for w in w_vals:
                            if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                                comp_errors.append(f"Invalid Wireless Charging value '{w}'.")
                        if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                            comp_errors.append("Qi cannot be selected with MagSafe or Qi2.")

                elif product_category == "Watch Accessories":
                    if not row_watch_size or not row_wireless:
                        comp_errors.append("Compatible Watch Case Size and Wireless Charging Compatibility are required.")
                    if row_watch_size and row_watch_size not in ["Not Compatible", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm"]:
                        comp_errors.append(f"Invalid Compatible Watch Case Size '{row_watch_size}'.")
                    if row_wireless:
                        w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                        if 'Not Compatible' in w_vals and len(w_vals) > 1:
                            comp_errors.append("Not Compatible cannot be combined with other wireless charging values.")
                        for w in w_vals:
                            if w not in ['Not Compatible', 'MagSafe', 'Qi', 'Qi2']:
                                comp_errors.append(f"Invalid Wireless Charging value '{w}'.")
                        if 'Qi' in w_vals and ('MagSafe' in w_vals or 'Qi2' in w_vals):
                            comp_errors.append("Qi cannot be selected with MagSafe or Qi2.")

                if comp_errors:
                    row_errors.append({
                        "row_number": row_num,
                        "column_name": "Device Compatibility",
                        "submitted_value": comp_str or f"Bluetooth:{row_bluetooth}, Jack:{row_jack}, Charging:{row_charging}, Wireless:{row_wireless}",
                        "validation_error": " | ".join(comp_errors),
                        "recommended_correction": "Provide correct category-specific compatibility formats."
                    })

            # --- Image URLs ---
            media_refs = []
            for k in ['imageurl1', 'imageurl2', 'imageurl3', 'imageurl4', 'imageurl5']:
                url_val = row.get(k)
                if url_val and str(url_val).strip():
                    media_refs.append(str(url_val).strip())
            
            if not media_refs:
                should_stage = True

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
            inventory = parse_int_value(row.get("inventorylevel")) if row.get("inventorylevel") is not None and str(row.get("inventorylevel")).strip() != "" else 0
            inventory_threshold = parse_int_value(row.get("inventorythreshold")) or 0
            warranty = row.get("brandwarranty") or row.get("warranty") or ""
            meta_t = row.get("metatitle") or ""
            meta_d = row.get("metadescription") or ""
            promo_info = row.get("promoinformation") or ""

            # --- State-based validation constraints for existing products ---
            if product is not None:
                if product.status == "active" and compatibility_update_type in ["replace", "remove"]:
                    is_admin = getattr(request.user, "is_cixci_admin", False)
                    if not is_admin:
                        row_errors.append({
                            "row_number": row_num,
                            "column_name": "Device Compatibility",
                            "submitted_value": compatibility_update_type,
                            "validation_error": "Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval.",
                            "recommended_correction": "Contact CIXCI Admin or use Additive mode."
                        })

                is_admin = getattr(request.user, "is_cixci_admin", False)
                if not is_admin:
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
                final_status = status_str or "active"

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
                
                product.name = cleaned_name
                product.brand = brand
                product.product_type = product_type
                product.product_category = product_category
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
                
                # Parse and set category-specific compatibility attributes
                if product_category in ["Headphones", "Speakers", "Chargers and Cables", "Memory", "Wearable Tech", "Watch Accessories"]:
                    if product_category == "Headphones":
                        product.bluetooth_compatibility = row_bluetooth if row_bluetooth else "No"
                        product.headphone_jack_compatibility = row_jack if row_jack else "Not Compatible"
                        
                    elif product_category == "Speakers":
                        product.bluetooth_compatibility = row_bluetooth if row_bluetooth else "No"
                        product.compatible_charging_interface = row_charging if row_charging else "Not Compatible"
                        
                    elif product_category == "Chargers and Cables":
                        product.compatible_charging_interface = row_charging if row_charging else "Not Compatible"
                        if row_wireless:
                            w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                            case_map_exact = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2", "not compatible": "Not Compatible"}
                            product.wireless_charging_compatibility = "+".join(case_map_exact[w.lower()] for w in w_vals if w.lower() in case_map_exact)
                        else:
                            product.wireless_charging_compatibility = "Not Compatible"
                        
                    elif product_category == "Memory":
                        product.storage_expansion_compatibility = row_storage if row_storage else "Not Compatible"
                        if row_memory and row_memory.lower() not in ["not compatible", "none", ""]:
                            product.memory_capacity = row_memory.upper()
                        else:
                            product.memory_capacity = "Not Compatible"
                        
                    elif product_category == "Wearable Tech":
                        product.compatible_charging_interface = row_charging if row_charging else "Not Compatible"
                        if row_wireless:
                            w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                            case_map_exact = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2", "not compatible": "Not Compatible"}
                            product.wireless_charging_compatibility = "+".join(case_map_exact[w.lower()] for w in w_vals if w.lower() in case_map_exact)
                        else:
                            product.wireless_charging_compatibility = "Not Compatible"
                        
                    elif product_category == "Watch Accessories":
                        product.compatible_watch_case_size = row_watch_size if row_watch_size else "Not Compatible"
                        if row_wireless:
                            w_vals = [w.strip() for w in row_wireless.replace(";", "+").split("+") if w.strip()]
                            case_map_exact = {"magsafe": "MagSafe", "qi": "Qi", "qi2": "Qi2", "not compatible": "Not Compatible"}
                            product.wireless_charging_compatibility = "+".join(case_map_exact[w.lower()] for w in w_vals if w.lower() in case_map_exact)
                        else:
                            product.wireless_charging_compatibility = "Not Compatible"
                
                try:
                    product.save(actor_id=request.user.id)
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
                if media_refs:
                    from apps.media.models import MediaAsset, AssetType, AssetStatus
                    import uuid
                    first_asset_id = None
                    for idx, url in enumerate(media_refs):
                        filename = url.split("/")[-1] or f"image_{idx}.png"
                        if "?" in filename:
                            filename = filename.split("?")[0]
                        ext = filename.split(".")[-1] if "." in filename else "png"
                        mime = "image/png"
                        if ext.lower() in ["jpg", "jpeg"]:
                            mime = "image/jpeg"
                        elif ext.lower() == "gif":
                            mime = "image/gif"
                        
                        asset_id = uuid.uuid4()
                        storage_key = f"{vendor_company_id}/product_image/{asset_id}/{filename}"
                        
                        MediaAsset.objects.create(
                            id=asset_id,
                            asset_type=AssetType.PRODUCT_IMAGE,
                            status=AssetStatus.READY,
                            owner_module="catalog",
                            owner_record_id=product.id,
                            company_scope_reference=uuid.UUID(str(vendor_company_id)),
                            original_filename=filename,
                            file_extension=ext,
                            mime_type=mime,
                            storage_key=storage_key,
                            is_public=True
                        )
                        if idx == 0:
                            first_asset_id = asset_id
                    
                    if first_asset_id:
                        product.primary_image_reference = first_asset_id
                        super(Product, product).save()

                # Parse and Save Device Compatibility
                if normalized_comp:
                    if compatibility_update_type == "replace":
                        ProductCompatibilityAssertion.objects.filter(product=product).delete()
                    
                    dev_names = [d.strip() for d in normalized_comp.split(';') if d.strip()]
                    if compatibility_update_type == "remove":
                        for dev_name in dev_names:
                            device = Device.objects.filter(name__iexact=dev_name).first()
                            if device:
                                ProductCompatibilityAssertion.objects.filter(product=product, device_reference=device.id).delete()
                    else: # add or replace
                        for dev_name in dev_names:
                            device = Device.objects.filter(name__iexact=dev_name).first()
                            if not device:
                                dev_name_lower = dev_name.lower()
                                if "iphone" in dev_name_lower or "ipad" in dev_name_lower:
                                    mfg_name = "Apple"
                                elif "galaxy" in dev_name_lower or "samsung" in dev_name_lower:
                                    mfg_name = "Samsung"
                                elif "pixel" in dev_name_lower or "google" in dev_name_lower:
                                    mfg_name = "Google"
                                else:
                                    words = dev_name.split()
                                    mfg_name = words[0] if words else "Other"
                                    
                                mfg = Manufacturer.objects.filter(name__iexact=mfg_name).first()
                                if not mfg:
                                    mfg = Manufacturer.objects.create(name=mfg_name)
                                    
                                if "ipad" in dev_name_lower or "tablet" in dev_name_lower:
                                    dt_name = "Tablet"
                                    dt_code = "tablet"
                                else:
                                    dt_name = "Smartphone"
                                    dt_code = "smartphone"
                                    
                                dt = DeviceType.objects.filter(name__iexact=dt_name).first()
                                if not dt:
                                    dt = DeviceType.objects.create(name=dt_name, code=dt_code)
                                    
                                device = Device.objects.create(
                                    name=dev_name,
                                    manufacturer=mfg,
                                    device_type=dt,
                                    lifecycle_status="available"
                                )
                                
                            ProductCompatibilityAssertion.objects.update_or_create(
                                product=product,
                                device_reference=device.id,
                                defaults={
                                    "is_compatible": True,
                                    "compatibility_basis": "imported",
                                    "notes": f"Auto-imported compatibility with {dev_name}"
                                }
                            )
                    # Recalculate compatibility status based on imported assertions
                    try:
                        from apps.catalog.compatibility_engine import run_compatibility_automapping
                        run_compatibility_automapping(product)
                    except Exception:
                        pass

                products_created.append(product)
                


        # 3. Save import details to the audit trail
        if validation_errors:
            transaction.savepoint_rollback(sid)
            products_created = []
            passed_count = 0
            staged_count = 0
        else:
            transaction.savepoint_commit(sid)

        log_catalog_audit(
            event_code="catalog.product.bulk_import",
            description=f"Bulk upload complete. Total: {len(rows)}, Passed: {passed_count}, Failed: {failed_count}, Staged: {staged_count}",
            product_id=None,
            actor_id=request.user.id
        )

        return Response({
            "total_rows_processed": len(rows),
            "rows_passed": passed_count,
            "rows_failed": failed_count,
            "rows_staged": staged_count,
            "errors": validation_errors,
            "products": ProductListSerializer(products_created, many=True).data
        }, status=200 if not validation_errors else 207)


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
        )

    @action(detail=False, methods=["get"])
    def my_projection(self, request):
        """Get the buyer's current compatibility projection."""
        try:
            proj = BuyerScopedCompatibilityProjection.objects.get(
                buyer_reference=request.user.id,
                company_scope_reference=request.user.entity.company_id,
                buyer_entity_reference=request.user.entity_id,
            )
            return Response(BuyerCompatibilityProjectionSerializer(proj).data)
        except BuyerScopedCompatibilityProjection.DoesNotExist:
            return Response({"detail": "No projection yet. Add devices to your portfolio first."}, status=404)

    @action(detail=False, methods=["post"])
    def refresh(self, request):
        """
        Manually trigger projection recalculation (Workflow 4).
        Uses the buyer's current portfolio snapshot.
        """
        from apps.devices.models import BuyerDevicePortfolioReference
        latest_ref = BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
        ).order_by("-last_change_timestamp").first()

        if not latest_ref or not latest_ref.current_portfolio_snapshot_reference:
            return Response({"detail": "No portfolio snapshot available."}, status=400)

        result = recalculate_buyer_compatibility_projection(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
            portfolio_snapshot_reference=latest_ref.current_portfolio_snapshot_reference,
            trigger="manual_refresh",
        )
        return Response(result)


class BuyerExportJobViewSet(BuyerScopedQuerysetMixin, viewsets.GenericViewSet):
    """Buyer product export jobs."""
    permission_classes = [IsAuthenticated]
    serializer_class = BuyerExportJobSerializer

    def get_queryset(self):
        return BuyerProductExportJob.objects.filter(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
        ).order_by("-created_at")

    @action(detail=False, methods=["get"])
    def list_jobs(self, request):
        return Response(BuyerExportJobSerializer(self.get_queryset()[:20], many=True).data)

    @action(detail=False, methods=["post"])
    def create_job(self, request):
        """Create a new buyer product export job."""
        product_ids = request.data.get("product_ids", [])
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
            
            violations = []
            for p in products:
                vendor = Company.objects.filter(id=p.vendor_company_reference).first()
                is_map_enforced = vendor.map_pricing_enforced if vendor else False
                
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

        portfolio_snapshot_ref = None
        if latest_ref:
            portfolio_snapshot_ref = latest_ref.current_portfolio_snapshot_reference
        if not portfolio_snapshot_ref:
            import uuid
            portfolio_snapshot_ref = uuid.uuid4()

        job = BuyerProductExportJob.objects.create(
            buyer_reference=request.user.id,
            company_scope_reference=request.user.entity.company_id,
            buyer_entity_reference=request.user.entity_id,
            requested_by=request.user.id,
            portfolio_snapshot_reference=portfolio_snapshot_ref,
            format=request.data.get("format", "csv"),
            include_incompatible=request.data.get("include_incompatible", False),
        )

        from apps.catalog.models import BuyerProductExportSelectionSnapshot
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=product_ids if product_ids else [],
            portfolio_snapshot_reference=portfolio_snapshot_ref
        )

        # TODO: dispatch Celery task for export in Phase 4
        return Response(BuyerExportJobSerializer(job).data, status=status.HTTP_201_CREATED)


class DynamicDropdownConfigViewSet(viewsets.ModelViewSet):
    queryset = DynamicDropdownConfig.objects.all()
    serializer_class = DynamicDropdownConfigSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["field_name"]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action in ["create", "update", "partial_update", "destroy"]:
            if not request.user.is_authenticated or not request.user.is_cixci_admin:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only CIXCI system admins can modify dropdown values.")


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("my-projection", BuyerCompatibilityProjectionViewSet, basename="buyer-projection")
router.register("export-jobs", BuyerExportJobViewSet, basename="export-job")
router.register("dropdown-configs", DynamicDropdownConfigViewSet, basename="dropdown-config")

urlpatterns = [path("", include(router.urls))]
