"""Product Catalog — vendor category/colour mappings, import alerts and missing devices.

Moved out of api.py unchanged; api.py registers these viewsets on the catalog router.
"""
from rest_framework import serializers, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.tenant.mixins import CheckAccessMixin

from .models import (
    Product, DynamicDropdownConfig, VendorCategoryMapping, VendorColorMapping, VendorColorMappingStatus,
)


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
    """Admin panel: vendor device names that are not in the Device Catalog.

    An admin adds the device (with its real type), links the name to an existing
    device, or dismisses text that is not a device. Every choice is stored per
    vendor and is honoured by later vendor syncs.
    """
    permission_classes = [IsAuthenticated]
    STATUSES = ("missing", "mapped", "dismissed")

    def _require_admin(self, request):
        if not request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only.")

    def _mapping(self, request):
        """The row a request refers to, by id or (legacy) by vendor name."""
        from .missing_devices import name_key
        from .models import VendorDeviceMapping
        identifier = request.data.get("mapping_id")
        if identifier:
            try:
                return VendorDeviceMapping.objects.filter(pk=identifier).first()
            except (ValueError, DjangoValidationErrorForIds):
                return None
        name = str(request.data.get("vendor_device_name") or "").strip()
        rows = VendorDeviceMapping.objects.filter(name_key=name_key(name)) if name else VendorDeviceMapping.objects.none()
        vendor = request.data.get("vendor_company_id")
        if vendor:
            rows = rows.filter(vendor_company_reference=vendor)
        return rows.order_by("-last_seen_at").first()

    def list(self, request):
        self._require_admin(request)
        import difflib
        from django.db.models import Count
        from apps.devices.models import Device, DeviceType, Manufacturer
        from .missing_devices import import_legacy_alerts, name_key
        from apps.tenant.models import Company
        from .models import VendorDeviceMapping
        try:
            import_legacy_alerts()
        except Exception:
            pass

        status_filter = request.query_params.get("status", "missing")
        if status_filter not in self.STATUSES:
            status_filter = "missing"
        rows = VendorDeviceMapping.objects.filter(status=status_filter).select_related("device__manufacturer", "device__device_type")
        vendor = request.query_params.get("vendor")
        if vendor:
            rows = rows.filter(vendor_company_reference=vendor)
        search = (request.query_params.get("search") or "").strip()
        if search:
            rows = rows.filter(vendor_device_name__icontains=search[:100])
        rows = list(rows.order_by("-last_seen_at", "vendor_device_name")[:500])

        vendors = dict(Company.objects.filter(id__in={row.vendor_company_reference for row in rows}).values_list("id", "name"))
        manufacturers = {m.name.lower(): {"id": str(m.id), "name": m.name} for m in Manufacturer.objects.filter(is_active=True)}
        # Only types an admin has activated: a device of another type would not map.
        device_types = {dt.code: {"id": str(dt.id), "code": dt.code, "name": dt.name}
                        for dt in DeviceType.objects.filter(is_active=True, status="active")}
        catalog = {}
        if status_filter == "missing" and rows:
            for device in Device.objects.select_related("manufacturer").iterator():
                # Vendors write a model with or without its manufacturer.
                catalog[name_key(device.name)] = device
                catalog[name_key(f"{device.manufacturer.name} {device.name}")] = device
        catalog_keys = list(catalog)

        result = []
        for row in rows:
            item = {
                "id": str(row.pk), "vendor_device_name": row.vendor_device_name, "status": row.status,
                "vendor_company_id": str(row.vendor_company_reference), "vendor_name": vendors.get(row.vendor_company_reference, ""),
                "product_count": len(row.product_ids or []), "alert_count": len(row.product_ids or []),
                "first_seen_at": row.first_seen_at, "last_seen_at": row.last_seen_at, "resolved_at": row.resolved_at,
                "device": {"id": str(row.device_id), "name": str(row.device), "device_type": row.device.device_type.name} if row.device_id else None,
                "already_exists": False,
            }
            if status_filter == "missing":
                suggested_mfr, suggested_type = self._suggest_manufacturer_type(row.vendor_device_name, manufacturers)
                if any(word in row.vendor_device_name.lower() for word in ("laptop", "macbook", "notebook", "chromebook")) and "laptop" in device_types:
                    suggested_type = "laptop"
                if suggested_type not in device_types:
                    suggested_type = "phone" if "phone" in device_types else ""
                item["suggested_manufacturer"] = suggested_mfr
                item["suggested_device_type"] = suggested_type
                # Likely the same model under a slightly different spelling.
                close = difflib.get_close_matches(row.name_key, catalog_keys, n=3, cutoff=0.82)
                similar = {str(catalog[key].pk): str(catalog[key]) for key in close}
                item["similar_devices"] = [{"id": identifier, "name": label} for identifier, label in similar.items()]
            result.append(item)

        counts = {row["status"]: row["total"] for row in VendorDeviceMapping.objects.values("status").annotate(total=Count("id"))}
        return Response({
            "devices": result, "total": len(result),
            "counts": {name: counts.get(name, 0) for name in self.STATUSES},
            "affected_products": len({pid for row in rows for pid in (row.product_ids or [])}) if status_filter == "missing" else 0,
            "manufacturers": sorted(manufacturers.values(), key=lambda m: m["name"]),
            "device_types": sorted(device_types.values(), key=lambda d: d["name"]),
        })

    def _suggest_manufacturer_type(self, vendor_name, manufacturers):
        vn = vendor_name.lower()
        mfr_map = {
            "iphone": "apple", "ipad": "apple", "airpods": "apple", "macbook": "apple", "apple": "apple",
            "galaxy": "samsung", "samsung": "samsung",
            "pixel": "google", "google": "google",
            "moto": "motorola", "motorola": "motorola",
            "oneplus": "oneplus", "one plus": "oneplus",
            "lg ": "lg", "nokia": "nokia", "tcl": "tcl",
            "kyocera": "kyocera", "zte": "zte", "revvl": "tcl",
        }
        suggested_mfr = None
        # A manufacturer the catalog already has, named at the start of the text, is the best hint.
        for m_name, m_data in manufacturers.items():
            if vn.startswith(m_name + " "):
                suggested_mfr = m_data
                break
        if suggested_mfr is None:
            for keyword, mfr_key in mfr_map.items():
                if keyword in vn:
                    suggested_mfr = next((data for name, data in manufacturers.items() if mfr_key in name), None)
                    break

        suggested_type = "phone"
        if "ipad" in vn or "tab" in vn:
            suggested_type = "tablet"
        elif "watch" in vn:
            suggested_type = "smartwatch"
        return suggested_mfr, suggested_type

    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """Products whose vendor source declares this name (live, bounded)."""
        self._require_admin(request)
        from .missing_devices import affected_sources
        from .models import VendorDeviceMapping
        mapping = VendorDeviceMapping.objects.filter(pk=pk).first()
        if mapping is None:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        seen, rows = set(), []
        for source, _raw in affected_sources(mapping):
            product = source.product
            if product.pk in seen:
                continue
            seen.add(product.pk)
            if len(rows) < 50:
                rows.append({"id": str(product.pk), "sku": product.sku, "name": product.name,
                    "product_category": product.product_category, "status": product.status,
                    "compatibility_status": product.compatibility_status})
        return Response({"count": len(seen), "products": rows})

    def _resolve(self, request, mapping, device, created):
        from .missing_devices import resolve_mapping
        outcome = resolve_mapping(mapping, device, request.user)
        return Response({"device_id": str(device.id), "device_name": str(device), "device_type": device.device_type.name,
            "created": created, **outcome}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def add_device(self, request):
        """Create the device with its real type, then map every product that declared the name."""
        self._require_admin(request)
        from apps.devices.models import Device, Manufacturer, DeviceType
        from .missing_devices import record_missing
        vendor_device_name = str(request.data.get("vendor_device_name") or "").strip()
        manufacturer_id = request.data.get("manufacturer_id")
        manufacturer_name = " ".join(str(request.data.get("manufacturer_name") or "").split())
        device_name = str(request.data.get("device_name") or "").strip()
        device_type_code = request.data.get("device_type_code", "phone")
        mapping = self._mapping(request)
        if mapping is None and vendor_device_name and request.data.get("vendor_company_id"):
            record_missing(request.data["vendor_company_id"], {vendor_device_name: set()})
            mapping = self._mapping(request)
        if mapping is None or not (manufacturer_id or manufacturer_name) or not device_name:
            return Response({"error": "A missing device, a manufacturer and a device name are required."},
                status=status.HTTP_400_BAD_REQUEST)
        if len(device_name) > 150 or len(manufacturer_name) > 200:
            return Response({"error": "The device or manufacturer name is too long."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            device_type = DeviceType.objects.get(code=device_type_code, is_active=True, status="active")
        except DeviceType.DoesNotExist:
            return Response({"error": f"Device type '{device_type_code}' is not an active Device Type."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if manufacturer_id:
                try:
                    manufacturer = Manufacturer.objects.filter(pk=manufacturer_id, is_active=True).first()
                except (ValueError, DjangoValidationErrorForIds):
                    manufacturer = None
                if manufacturer is None:
                    return Response({"error": "Manufacturer not found."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                manufacturer = Manufacturer.objects.filter(name__iexact=manufacturer_name).first()
                if manufacturer is None:
                    manufacturer = Manufacturer.objects.create(name=manufacturer_name, is_active=True)
                elif not manufacturer.is_active:
                    return Response({"error": f"Manufacturer '{manufacturer.name}' is inactive."}, status=status.HTTP_400_BAD_REQUEST)
            device = Device.objects.filter(manufacturer=manufacturer, name__iexact=device_name).first()
            created = device is None
            if created:
                device = Device(manufacturer=manufacturer, device_type=device_type, name=device_name,
                    lifecycle_status="available", imported_by=request.user.id)
                device.save()
            return self._resolve(request, mapping, device, created)

    @action(detail=False, methods=["post"])
    def link_device(self, request):
        """The vendor's name is another spelling of a device that already exists."""
        self._require_admin(request)
        from apps.devices.models import Device
        mapping = self._mapping(request)
        try:
            device = Device.objects.select_related("device_type", "manufacturer").filter(pk=request.data.get("device_id")).first()
        except (ValueError, DjangoValidationErrorForIds):
            device = None
        if mapping is None or device is None:
            return Response({"error": "Choose a missing device and an existing catalog device."}, status=status.HTTP_400_BAD_REQUEST)
        return self._resolve(request, mapping, device, False)

    @action(detail=False, methods=["post"])
    def dismiss_device(self, request):
        """The text is not a device: stop listing it and let the sync ignore it."""
        self._require_admin(request)
        from .missing_devices import _forget_in_alerts
        mapping = self._mapping(request)
        name = str(request.data.get("vendor_device_name") or "").strip()
        if mapping is None and not name:
            return Response({"error": "vendor_device_name required."}, status=status.HTTP_400_BAD_REQUEST)
        if mapping is not None:
            mapping.status, mapping.resolved_by, mapping.resolved_at = "dismissed", request.user.pk, timezone.now()
            mapping.save(update_fields=["status", "resolved_by", "resolved_at"])
            name = mapping.vendor_device_name
            log_catalog_missing_device(request.user, mapping, "dismissed")
        _forget_in_alerts(name)
        return Response({"dismissed": True})

    @action(detail=False, methods=["post"])
    def restore_device(self, request):
        """Undo a dismissal, or detach a wrong link so the name is listed again."""
        self._require_admin(request)
        mapping = self._mapping(request)
        if mapping is None or mapping.status == "missing":
            return Response({"error": "Nothing to restore."}, status=status.HTTP_400_BAD_REQUEST)
        mapping.status, mapping.device, mapping.resolved_by, mapping.resolved_at = "missing", None, None, None
        mapping.save(update_fields=["status", "device", "resolved_by", "resolved_at"])
        log_catalog_missing_device(request.user, mapping, "restored")
        return Response({"restored": True})


from django.core.exceptions import ValidationError as DjangoValidationErrorForIds  # noqa: E402


def log_catalog_missing_device(actor, mapping, action_name):
    import json as _json
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code="catalog.missing_device." + action_name, status="completed",
        event_description=_json.dumps({"vendor_device_name": mapping.vendor_device_name}),
        actor_reference=actor.pk, service_trigger_reference="admin_missing_device_panel", source_module="catalog",
        company_scope_reference=mapping.vendor_company_reference, source_record_type="VendorDeviceMapping", source_record_id=mapping.pk)
