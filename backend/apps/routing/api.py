"""Order Routing — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin, BuyerScopedQuerysetMixin
from .models import (
    Order, RoutedSuborder,
    VendorExportSchedule, VendorExportWindow,
    VendorExportBatchItem, VendorExportDeliveryEvidence,
    VendorOrderExportLog, VendorOrderReexportAttempt,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_details = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "company_scope_reference", "buyer_reference", "buyer_entity_reference",
            "status", "pricing_snapshot_references", "placed_at", "created_at",
            "buyer_name", "customer_name", "customer_details",
        ]
        read_only_fields = ["id", "created_at", "placed_at"]

    def get_buyer_name(self, obj):
        from apps.tenant.models import Company
        company = Company.objects.filter(id=obj.company_scope_reference).first()
        return company.name if company else "Unknown Buyer"

    def get_customer_name(self, obj):
        request = self.context.get("request")
        suborders = obj.routed_suborders.all()
        if request and request.user and not request.user.is_cixci_admin:
            entity = getattr(request.user, "entity", None)
            company = entity.company if entity else None
            if company and company.company_type == "vendor":
                suborders = suborders.filter(vendor_company_reference=company.id)
        
        sub = suborders.first()
        if sub and "customer_shipping" in sub.routing_snapshot:
            cs = sub.routing_snapshot["customer_shipping"]
            first_name = cs.get("customer_first_name", "") or cs.get("first_name", "")
            last_name = cs.get("customer_last_name", "") or cs.get("last_name", "")
            return f"{first_name} {last_name}".strip() or "N/A"
        return "N/A"

    def get_customer_details(self, obj):
        request = self.context.get("request")
        suborders = obj.routed_suborders.all()
        if request and request.user and not request.user.is_cixci_admin:
            entity = getattr(request.user, "entity", None)
            company = entity.company if entity else None
            if company and company.company_type == "vendor":
                suborders = suborders.filter(vendor_company_reference=company.id)
        
        sub = suborders.first()
        if sub and "customer_shipping" in sub.routing_snapshot:
            cs = sub.routing_snapshot["customer_shipping"]
            return {
                "first_name": cs.get("customer_first_name") or cs.get("first_name") or "",
                "last_name": cs.get("customer_last_name") or cs.get("last_name") or "",
                "address1": cs.get("address_1") or cs.get("address1") or "",
                "address2": cs.get("address_2") or cs.get("address2") or "",
                "city": cs.get("city") or "",
                "state": cs.get("state") or "",
                "zip_code": cs.get("zip") or cs.get("zip_code") or "",
            }
        return None


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["pricing_snapshot_references"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Order.objects.create(
            company_scope_reference=user.entity.company_id,
            buyer_reference=user.id,
            buyer_entity_reference=user.entity_id,
            **validated_data,
        )


class RoutedSuborderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutedSuborder
        fields = [
            "id", "order", "vendor_company_reference",
            "status", "routing_snapshot", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorExportSchedule
        fields = [
            "id", "vendor_company_reference", "status",
            "delivery_method", "schedule_cron", "window_duration_minutes",
            "schedule_timezone", "effective_from", "effective_to", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorExportWindow
        fields = [
            "id", "schedule", "vendor_company_reference",
            "status", "opens_at", "closes_at", "item_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportDeliveryEvidenceSerializer(serializers.ModelSerializer):
    """
    READ-ONLY for Fulfillment/Returns.
    'confirmed' = delivery confirmed for configured method ONLY.
    Does NOT mean vendor acceptance. Fulfillment owns operational decisions.
    """
    class Meta:
        model = VendorExportDeliveryEvidence
        fields = [
            "id", "window", "vendor_company_reference",
            "status", "delivery_method",
            "confirmed_at", "failed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorOrderReexportAttemptSerializer(serializers.ModelSerializer):
    triggered_by_email = serializers.SerializerMethodField()

    class Meta:
        model = VendorOrderReexportAttempt
        fields = [
            "id", "reexport_attempt_id", "original_export_batch", "attempt_number", "trigger_type",
            "triggered_by_user", "triggered_by_user_name_snapshot", "triggered_by_email",
            "triggered_by_company", "triggered_by_company_name_snapshot", "triggered_by_role_snapshot", "reason_code", "reason_notes",
            "requested_at", "processing_started_at", "completed_at", "delivery_method",
            "delivery_destination_snapshot", "file_storage_reference", "file_checksum",
            "delivery_status", "provider_message_id", "error_code", "error_message",
            "correlation_id", "ip_address", "user_agent",
            "system_process_name", "system_process_id", "system_job_id", "system_schedule_desc"
        ]

    def get_triggered_by_email(self, obj):
        return obj.triggered_by_user.email if obj.triggered_by_user else ""


class VendorOrderExportLogSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()
    reexport_attempts = VendorOrderReexportAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = VendorOrderExportLog
        fields = [
            "id", "vendor_company_reference", "buyer_company_reference", "window",
            "filename", "sent_at", "order_count", "suborder_count",
            "sending_method", "recipients", "trigger_type", "triggered_by", "triggered_by_name",
            "status_before", "status_after", "csv_backup", "email_send_result",
            "is_reexport", "original_log", "audit_reference",
            "vendor_name", "buyer_name", "reexport_attempts",
            "reexport_count", "last_reexport_status", "last_reexported_at", "last_reexported_by_name",
            "triggered_by_user_name_snapshot", "triggered_by_company_name_snapshot", "triggered_by_role_snapshot",
            "ip_address", "user_agent", "correlation_id",
            "system_process_name", "system_process_id", "system_job_id", "system_schedule_desc"
        ]

    def get_vendor_name(self, obj):
        from apps.tenant.models import Company
        company = Company.objects.filter(id=obj.vendor_company_reference).first()
        return company.name if company else "Unknown Vendor"

    def get_buyer_name(self, obj):
        from apps.tenant.models import Company
        company = Company.objects.filter(id=obj.buyer_company_reference).first()
        return company.name if company else "Unknown Buyer"

    def get_triggered_by_name(self, obj):
        if obj.triggered_by_user_name_snapshot:
            return obj.triggered_by_user_name_snapshot
        if obj.triggered_by:
            name = f"{obj.triggered_by.first_name} {obj.triggered_by.last_name}".strip()
            return name if name else obj.triggered_by.email
        if obj.trigger_type == "system" and obj.system_process_name:
            return obj.system_process_name
        return "System"


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class OrderViewSet(BuyerScopedQuerysetMixin, viewsets.ModelViewSet):
    action_capability_map = {
        "list": "routing.order.list",
        "retrieve": "routing.order.read",
        "create": "routing.order.create",
        "update": "routing.order.update",
        "partial_update": "routing.order.update",
        "destroy": "routing.order.cancel",
        "suborders": "routing.order.read",
        "lines": "routing.order.read",
        "import_shipping": "routing.order.update",
        "manual_export": "routing.export.manage",
    }
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status"]
    ordering = ["-placed_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company and company.company_type == "vendor":
                qs = qs.filter(routed_suborders__vendor_company_reference=company.id)
            else:
                qs = qs.filter(
                    buyer_reference=user.id,
                    company_scope_reference=company.id,
                )
        return qs

    def get_serializer_class(self):
        return OrderCreateSerializer if self.action == "create" else OrderSerializer

    @action(detail=True, methods=["get"])
    def suborders(self, request, pk=None):
        """List routed suborders for an order."""
        order = self.get_object()
        subs = order.routed_suborders.all()
        return Response(RoutedSuborderSerializer(subs, many=True).data)

    @action(detail=True, methods=["get"])
    def lines(self, request, pk=None):
        """List lines for the original PurchaseOrder corresponding to this Order."""
        order = self.get_object()
        from apps.procurement.models import PurchaseOrderLine
        from apps.catalog.models import Product
        
        lines = PurchaseOrderLine.objects.filter(purchase_order_id=order.id)
        
        user = self.request.user
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                lines = lines.filter(product_reference__in=
                    Product.objects.filter(vendor_company_reference=company.id).values_list("id", flat=True)
                )
                
        data = []
        for line in lines:
            prod_name = "Unknown Product"
            sku = "N/A"
            upc = "N/A"
            color = "N/A"
            primary_image_url = None
            try:
                prod = Product.objects.get(id=line.product_reference)
                prod_name = prod.name
                sku = prod.sku
                upc = prod.upc or "N/A"
                color = prod.color or "N/A"
                
                if prod.primary_image_reference:
                    try:
                        from apps.media.models import MediaAsset
                        from django.conf import settings
                        asset = MediaAsset.objects.get(id=prod.primary_image_reference)
                        if asset.status == "ready":
                            media_url = getattr(settings, "MEDIA_URL", "/media/")
                            primary_image_url = f"{media_url}{asset.storage_key}"
                    except Exception:
                        pass
                if not primary_image_url and isinstance(prod.media_references, list) and len(prod.media_references) > 0:
                    primary_image_url = prod.media_references[0]
            except Product.DoesNotExist:
                pass
                
            data.append({
                "id": str(line.id),
                "purchase_order": str(line.purchase_order_id),
                "product_reference": str(line.product_reference),
                "product_name": prod_name,
                "sku": sku,
                "upc": upc,
                "color": color,
                "primary_image_url": primary_image_url,
                "quantity": line.quantity,
                "unit_price_snapshot": float(line.unit_price_snapshot),
                "line_total": float(line.line_total),
            })
            
        return Response(data)

    @action(detail=False, methods=["post"], url_path="manual-export")
    def manual_export(self, request):
        """
        Manually export selected suborders to their manual vendor.
        """
        suborder_ids = request.data.get("suborder_ids")
        if not suborder_ids:
            return Response({"detail": "No suborder_ids provided"}, status=400)
            
        confirm = request.data.get("confirm", False)
        
        from apps.routing.models import RoutedSuborder
        from apps.tenant.models import Company
        from apps.procurement.models import PurchaseOrderLine
        from apps.catalog.models import Product
        from apps.routing.tasks import validate_line_eligibility, trigger_vendor_export
        
        eligible_suborders = []
        ineligible_suborders = []
        
        suborders_qs = RoutedSuborder.objects.filter(id__in=suborder_ids)
        if not suborders_qs.exists():
            return Response({"detail": "No valid suborders found for the provided IDs"}, status=400)
            
        for sub in suborders_qs:
            try:
                vendor = Company.objects.filter(id=sub.vendor_company_reference).first()
                if not sub.order:
                    ineligible_suborders.append({
                        "id": str(sub.id),
                        "errors": ["Suborder has no associated order"]
                    })
                    continue
                buyer_company = Company.objects.filter(id=sub.order.company_scope_reference).first()
                
                if not vendor or not buyer_company:
                    ineligible_suborders.append({
                        "id": str(sub.id),
                        "errors": ["Vendor or Buyer company not found"]
                    })
                    continue
                    
                lines = PurchaseOrderLine.objects.filter(purchase_order_id=sub.order.id)
                lines = lines.filter(product_reference__in=
                    Product.objects.filter(vendor_company_reference=vendor.id).values_list("id", flat=True)
                )
                
                if not lines.exists():
                    ineligible_suborders.append({
                        "id": str(sub.id),
                        "errors": [f"Suborder has no order lines for vendor {vendor.name}"]
                    })
                    continue
                    
                suborder_eligible = True
                errors = []
                for line in lines:
                    try:
                        product = Product.objects.get(id=line.product_reference)
                    except Product.DoesNotExist:
                        suborder_eligible = False
                        errors.append(f"Product {line.product_reference} not found in catalog")
                        continue
                        
                    is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer_company)
                    if not is_eligible:
                        suborder_eligible = False
                        errors.append(reason)
                        
                if suborder_eligible:
                    eligible_suborders.append(sub)
                else:
                    ineligible_suborders.append({
                        "id": str(sub.id),
                        "errors": errors
                    })
            except Exception as e:
                import traceback
                logger.error("Error evaluating suborder eligibility: %s\n%s", e, traceback.format_exc())
                ineligible_suborders.append({
                    "id": str(sub.id),
                    "errors": [f"Unexpected error: {str(e)}"]
                })
                
        preview_data = {
            "eligible_count": len(eligible_suborders),
            "ineligible_count": len(ineligible_suborders),
            "ineligible_suborders": ineligible_suborders
        }
        
        if not confirm:
            return Response({
                "preview": preview_data
            })
            
        if ineligible_suborders:
            return Response({
                "detail": "Cannot export: some selected suborders are ineligible.",
                "preview": preview_data
            }, status=400)
            
        from collections import defaultdict
        vendor_groups = defaultdict(list)
        for sub in eligible_suborders:
            vendor_groups[sub.vendor_company_reference].append(sub)
            
        # Resolve client IP and User Agent
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        for vendor_id, subs in vendor_groups.items():
            vendor = Company.objects.get(id=vendor_id)
            subs_ids = [s.id for s in subs]
            subs_qs = RoutedSuborder.objects.filter(id__in=subs_ids)
            trigger_vendor_export(
                vendor,
                trigger_type="user",
                triggered_by=request.user,
                suborders_qs=subs_qs,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
        return Response({
            "detail": "Manual export initiated successfully.",
            "preview": preview_data
        })

    @action(detail=False, methods=["post"], url_path="import-shipping")
    def import_shipping(self, request):
        """
        Import shipping CSV file to update shipping tracking and status.
        Supports two-step preview and confirm workflow.
        """
        file_obj = request.FILES.get("file") or request.data.get("file")
        if not file_obj:
            return Response({
                "errors": [
                    {
                        "row": "file",
                        "errors": ["No CSV file provided"]
                    }
                ]
            }, status=400)
            
        try:
            csv_content = file_obj.read()
            if isinstance(csv_content, bytes):
                csv_content = csv_content.decode("utf-8-sig")
        except Exception as e:
            return Response({
                "errors": [
                    {
                        "row": "file",
                        "errors": [f"Failed to read file: {str(e)}"]
                    }
                ]
            }, status=400)
            
        if not csv_content.strip():
            return Response({
                "errors": [
                    {
                        "row": "file",
                        "errors": ["Uploaded file is empty"]
                    }
                ]
            }, status=400)
            
        import csv
        import io
        from datetime import datetime
        import re
        from django.db import transaction
        from django.utils import timezone
        from apps.tenant.models import Company, CompanyStatus
        from apps.fulfillment.models import FulfillmentHandoff, VendorShippingImportLog, BuyerUpdateReadySignal, BuyerUpdateKind, BuyerSignalStatus
        from apps.routing.models import RoutingStatus
        from apps.catalog.models import Product
        from apps.procurement.models import PurchaseOrderLine
        
        user = request.user
        
        # Read lines
        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            return Response({
                "errors": [
                    {
                        "row": "header",
                        "errors": ["No headers found in CSV file"]
                    }
                ]
            }, status=400)
            
        # Clean headers
        headers_cleaned = [h.strip() for h in headers]
        headers_lower = [h.lower() for h in headers_cleaned]
        
        field_aliases = {
            "buyer": ["buyer"],
            "first_name": ["first name", "first_name", "customer first name", "customer_first_name"],
            "last_name": ["last name", "last_name", "customer last name", "customer_last_name"],
            "address_1": ["address 1", "address_1", "address1"],
            "address_2": ["address 2", "address_2", "address2"],
            "city": ["city"],
            "state": ["state"],
            "zip": ["zip code", "zip_code", "zip"],
            "suborder": ["suborder", "suborder id", "suborder_id"],
            "sku": ["sku"],
            "upc": ["upc"],
            "quantity": ["quantity", "qty", "quantity shipped", "quantity_shipped"],
            "vendor_order_number": ["vendor confirmation number", "vendor_confirmation_number", "vendor order number", "vendor_order_number", "vendor confirmation", "vendor_confirmation"],
            "shipping_carrier": ["shipping carrier", "shipping_carrier", "carrier"],
            "tracking_number": ["shipping tracking number", "shipping_tracking_number", "tracking number", "tracking_number", "tracking"],
            "shipped_date": ["shipped date", "shipped_date", "ship date", "ship_date"],
            "delivered_date": ["delivered date", "delivered_date", "delivery date", "delivery_date"],
        }
        
        indices = {}
        for std_field, aliases in field_aliases.items():
            for alias in aliases:
                if alias in headers_lower:
                    indices[std_field] = headers_lower.index(alias)
                    break
                    
        # Check required fields
        required_fields = ["suborder", "sku", "quantity"]
        missing = [f for f in required_fields if f not in indices]
        if missing:
            return Response({
                "errors": [
                    {
                        "row": "header",
                        "errors": [f"Missing required CSV columns: {', '.join(missing)}"]
                    }
                ]
            }, status=400)
            
        def get_val(row, field, default=""):
            if field in indices:
                idx = indices[field]
                if idx < len(row):
                    return row[idx].strip()
            return default
            
        confirm_val = request.data.get("confirm", request.query_params.get("confirm", True))
        if isinstance(confirm_val, str):
            confirm = confirm_val.lower() in ["true", "1", "yes"]
        else:
            confirm = bool(confirm_val)
            
        rows_analysis = []
        has_any_rejections = False
        
        applied_count = 0
        skipped_count = 0
        rejected_count = 0
        review_required_count = 0
        
        ops_to_execute = []
        batch_trackings = {}
        
        for idx, row in enumerate(reader, 1):
            if not row or not any(row):
                continue
                
            row_errors = []
            row_status = "applied"
            issue_type = None
            
            sub = None
            matched_line = None
            
            # 1. Suborder check
            suborder_val = get_val(row, "suborder")
            if not suborder_val:
                row_errors.append("Suborder ID is missing")
                row_status = "rejected"
            else:
                try:
                    sub = RoutedSuborder.objects.get(id=suborder_val)
                except (RoutedSuborder.DoesNotExist, ValueError):
                    row_errors.append(f"Suborder {suborder_val} not found")
                    row_status = "rejected"
                    
            # 2. Permission check
            if row_status != "rejected" and sub:
                if not user.is_cixci_admin:
                    if not hasattr(user, "entity") or not user.entity or not user.entity.company:
                        row_errors.append("permission: User has no associated company")
                        row_status = "rejected"
                    elif str(sub.vendor_company_reference) != str(user.entity.company.id):
                        row_errors.append("permission: Vendor is not authorized to update this suborder")
                        row_status = "rejected"
                        
            # 3. Product & PO Line match
            if row_status != "rejected" and sub:
                sku_val = get_val(row, "sku")
                upc_val = get_val(row, "upc")
                qty_val = get_val(row, "quantity")
                
                try:
                    row_qty = int(qty_val)
                    if row_qty <= 0:
                        row_errors.append("Quantity must be greater than 0")
                        row_status = "rejected"
                except (ValueError, TypeError):
                    row_errors.append("Quantity is not numeric")
                    row_status = "rejected"
                    row_qty = None
                    
                if row_status != "rejected":
                    po_lines = PurchaseOrderLine.objects.filter(purchase_order_id=sub.order_id)
                    for line in po_lines:
                        try:
                            prod = Product.objects.get(id=line.product_reference)
                            if prod.sku.strip() == sku_val.strip() and (prod.upc or "").strip() == (upc_val or "").strip():
                                matched_line = line
                                break
                        except Product.DoesNotExist:
                            continue
                            
                    if not matched_line:
                        row_errors.append(f"SKU/UPC mismatch: No line matching SKU {sku_val} and UPC {upc_val} in order {sub.order_id}")
                        row_status = "rejected"
                    else:
                        if row_qty != matched_line.quantity:
                            row_errors.append(f"mismatch: Quantity {row_qty} does not match ordered quantity {matched_line.quantity}")
                            row_status = "rejected"
                            
            # 4. Locked Fields check
            if row_status != "rejected" and sub:
                buyer_val = get_val(row, "buyer")
                buyer_company = Company.objects.filter(id=sub.order.company_scope_reference).first()
                db_buyer_name = buyer_company.name if buyer_company else ""
                if buyer_val.strip().lower() != db_buyer_name.strip().lower():
                    row_errors.append(f"mismatch: Buyer {buyer_val} does not match original {db_buyer_name}")
                    row_status = "rejected"
                    
                shipping = sub.routing_snapshot.get("customer_shipping") or {}
                db_first_name = shipping.get("customer_first_name") or ""
                db_last_name = shipping.get("customer_last_name") or ""
                db_address_1 = shipping.get("address_1") or ""
                db_address_2 = shipping.get("address_2") or ""
                db_city = shipping.get("city") or ""
                db_state = shipping.get("state") or ""
                db_zip = shipping.get("zip") or ""
                
                first_name_val = get_val(row, "first_name")
                last_name_val = get_val(row, "last_name")
                address_1_val = get_val(row, "address_1")
                address_2_val = get_val(row, "address_2")
                city_val = get_val(row, "city")
                state_val = get_val(row, "state")
                zip_val = get_val(row, "zip")
                
                if first_name_val.strip().lower() != db_first_name.strip().lower():
                    row_errors.append(f"mismatch: First Name {first_name_val} does not match original {db_first_name}")
                    row_status = "rejected"
                if last_name_val.strip().lower() != db_last_name.strip().lower():
                    row_errors.append(f"mismatch: Last Name {last_name_val} does not match original {db_last_name}")
                    row_status = "rejected"
                if address_1_val.strip().lower() != db_address_1.strip().lower():
                    row_errors.append(f"mismatch: Address 1 {address_1_val} does not match original {db_address_1}")
                    row_status = "rejected"
                if address_2_val.strip().lower() != db_address_2.strip().lower():
                    row_errors.append(f"mismatch: Address 2 {address_2_val} does not match original {db_address_2}")
                    row_status = "rejected"
                if city_val.strip().lower() != db_city.strip().lower():
                    row_errors.append(f"mismatch: City {city_val} does not match original {db_city}")
                    row_status = "rejected"
                if state_val.strip().lower() != db_state.strip().lower():
                    row_errors.append(f"mismatch: State {state_val} does not match original {db_state}")
                    row_status = "rejected"
                if zip_val.strip().lower() != db_zip.strip().lower():
                    row_errors.append(f"mismatch: Zip Code {zip_val} does not match original {db_zip}")
                    row_status = "rejected"
                    
            # 5. Extract Shipping Confirmation fields and parse dates
            if row_status != "rejected" and sub:
                row_vendor_order = get_val(row, "vendor_order_number")
                row_carrier = get_val(row, "shipping_carrier")
                row_tracking = get_val(row, "tracking_number")
                row_shipped_date = get_val(row, "shipped_date")
                row_delivered_date = get_val(row, "delivered_date")
                
                try:
                    handoff = FulfillmentHandoff.objects.get(routed_suborder_reference=sub.id)
                    db_carrier = handoff.shipping_carrier or ""
                    db_tracking = handoff.tracking_number or ""
                    db_vendor_order = handoff.vendor_order_number or ""
                    db_shipped = handoff.shipped_date
                    db_delivered = handoff.delivered_date
                    db_status = handoff.status
                except FulfillmentHandoff.DoesNotExist:
                    handoff = None
                    db_carrier = ""
                    db_tracking = ""
                    db_vendor_order = ""
                    db_shipped = None
                    db_delivered = None
                    db_status = "received"
                    
                row_shipped_parsed = None
                if row_shipped_date:
                    try:
                        row_shipped_parsed = datetime.strptime(row_shipped_date, "%Y-%m-%d").date()
                        placed_date = (sub.order.placed_at or sub.order.created_at).date()
                        if row_shipped_parsed < placed_date:
                            row_errors.append(f"Shipped date {row_shipped_date} cannot be before order placed date {placed_date}")
                            row_status = "rejected"
                    except ValueError:
                        row_errors.append(f"Invalid shipped date format: {row_shipped_date}")
                        row_status = "rejected"
                        
                row_delivered_parsed = None
                if row_delivered_date:
                    try:
                        row_delivered_parsed = datetime.strptime(row_delivered_date, "%Y-%m-%d").date()
                    except ValueError:
                        row_errors.append(f"Invalid delivered date format: {row_delivered_date}")
                        row_status = "rejected"
                        
            # 6. Out-of-order check (Skipped status)
            if row_status != "rejected" and sub:
                if db_status == "delivered" or (db_shipped and row_shipped_parsed and row_shipped_parsed < db_shipped):
                    row_status = "skipped"
                    row_errors.append("Skipped: newer or identical shipping evidence already exists")
                    
            # 7. Merge and validate shipping details (Review Required / Applied status)
            if row_status not in ["rejected", "skipped"] and sub:
                merged_carrier = row_carrier if row_carrier else db_carrier
                merged_tracking = row_tracking if row_tracking else db_tracking
                merged_vendor_order = row_vendor_order if row_vendor_order else db_vendor_order
                merged_shipped = row_shipped_parsed if row_shipped_parsed else db_shipped
                merged_delivered = row_delivered_parsed if row_delivered_parsed else db_delivered
                
                # Check 1: Tracking Missing
                if merged_shipped and (not merged_carrier or not merged_tracking):
                    row_status = "review_required"
                    issue_type = "tracking_missing"
                    row_errors.append("Tracking Missing: carrier or tracking number is missing for shipped order")
                    
                # Check 2: Tracking Invalid
                elif merged_carrier or merged_tracking:
                    accepted_carriers = ["fedex", "ups", "usps", "dhl", "ontrac", "amazon", "dhl express"]
                    is_carrier_invalid = merged_carrier.lower().strip() not in accepted_carriers
                    is_tracking_invalid = not re.match(r"^[a-zA-Z0-9\- ]{5,50}$", merged_tracking.strip())
                    
                    tracking_url = request.data.get("tracking_url", "")
                    is_url_invalid = False
                    if tracking_url:
                        if not (tracking_url.lower().startswith("http://") or tracking_url.lower().startswith("https://")):
                            is_url_invalid = True
                            
                    if is_carrier_invalid or is_tracking_invalid or is_url_invalid:
                        row_status = "review_required"
                        issue_type = "tracking_invalid"
                        if is_carrier_invalid:
                            row_errors.append(f"Invalid carrier: {merged_carrier}")
                        if is_tracking_invalid:
                            row_errors.append(f"Invalid tracking number format: {merged_tracking}")
                        if is_url_invalid:
                            row_errors.append(f"Invalid tracking URL: {tracking_url}")
                            
                # Check 3: Duplicate tracking number (within DB or this batch)
                if row_status not in ["review_required"] and merged_tracking:
                    # check DB
                    duplicate_exists = FulfillmentHandoff.objects.filter(
                        tracking_number=merged_tracking.strip()
                    ).exclude(routed_suborder_reference=sub.id).exists()
                    # check batch
                    if merged_tracking.strip() in batch_trackings and batch_trackings[merged_tracking.strip()] != sub.id:
                        duplicate_exists = True
                        
                    if duplicate_exists:
                        row_status = "review_required"
                        issue_type = "review_required"
                        row_errors.append(f"Duplicate tracking number: {merged_tracking} is already used on another order")
                    else:
                        batch_trackings[merged_tracking.strip()] = sub.id
                        
            # Aggregate stats
            if row_status == "rejected":
                rejected_count += 1
                has_any_rejections = True
            elif row_status == "skipped":
                skipped_count += 1
            elif row_status == "review_required":
                review_required_count += 1
                ops_to_execute.append({
                    "sub": sub,
                    "handoff": handoff,
                    "status": "review_required",
                    "issue_type": issue_type,
                    "carrier": merged_carrier,
                    "tracking": merged_tracking,
                    "vendor_order": merged_vendor_order,
                    "shipped": merged_shipped,
                    "delivered": merged_delivered
                })
            else:
                applied_count += 1
                ops_to_execute.append({
                    "sub": sub,
                    "handoff": handoff,
                    "status": "applied",
                    "carrier": merged_carrier,
                    "tracking": merged_tracking,
                    "vendor_order": merged_vendor_order,
                    "shipped": merged_shipped,
                    "delivered": merged_delivered
                })
                
            rows_analysis.append({
                "row_index": idx,
                "suborder_id": suborder_val,
                "status": row_status,
                "errors": row_errors
            })
            
        if has_any_rejections:
            formatted_errors = []
            for r in rows_analysis:
                if r["status"] == "rejected":
                    formatted_errors.append({
                        "row": r["row_index"],
                        "errors": r["errors"]
                    })
            return Response({
                "errors": formatted_errors
            }, status=400)
            
        summary = {
            "applied": applied_count,
            "skipped": skipped_count,
            "rejected": rejected_count,
            "review_required": review_required_count
        }
        
        if not confirm:
            return Response({
                "detail": "Fulfillment CSV import preview generated. Confirm to apply.",
                "confirm_required": True,
                "summary": summary,
                "rows": rows_analysis
            })
            
        # Execute updates atomically
        with transaction.atomic():
            for op in ops_to_execute:
                sub = op["sub"]
                handoff = op["handoff"]
                
                if not handoff:
                    handoff = FulfillmentHandoff.objects.create(
                        routed_suborder_reference=sub.id,
                        vendor_company_reference=sub.vendor_company_reference,
                        company_scope_reference=sub.order.company_scope_reference,
                        status="received"
                    )
                    
                if op["carrier"]:
                    handoff.shipping_carrier = op["carrier"]
                if op["tracking"]:
                    handoff.tracking_number = op["tracking"]
                if op["vendor_order"]:
                    handoff.vendor_order_number = op["vendor_order"]
                if op["shipped"]:
                    handoff.shipped_date = op["shipped"]
                if op["delivered"]:
                    handoff.delivered_date = op["delivered"]
                    
                if op["status"] == "applied":
                    handoff.status = "shipped"
                    handoff.save()
                    
                    sub.status = RoutingStatus.SHIPPED
                    sub.save()
                else: # review_required
                    handoff.status = op["issue_type"]
                    handoff.save()
                    
                    sub.status = RoutingStatus.PROCESSING
                    sub.save()
                    
                # Transition parent Order to SHIPPED if all suborders are shipped or delivered
                order = sub.order
                all_subs_shipped_or_delivered = True
                for s in order.routed_suborders.all():
                    if s.status not in [RoutingStatus.SHIPPED, RoutingStatus.DELIVERED]:
                        all_subs_shipped_or_delivered = False
                        break
                if all_subs_shipped_or_delivered:
                    order.status = RoutingStatus.SHIPPED
                    order.save()
                    
                # Update BuyerUpdateReadySignal
                expected_count = order.routed_suborders.count()
                confirmed_count = order.routed_suborders.filter(
                    status__in=[RoutingStatus.SHIPPED, RoutingStatus.DELIVERED]
                ).count()
                all_confirmed = (confirmed_count == expected_count)
                
                signal, _ = BuyerUpdateReadySignal.objects.get_or_create(
                    order_reference=order.id,
                    update_kind=BuyerUpdateKind.SHIPMENT,
                    defaults={
                        "buyer_reference": order.company_scope_reference,
                        "company_scope_reference": order.company_scope_reference,
                        "status": BuyerSignalStatus.PENDING,
                        "expected_vendor_count": expected_count,
                        "confirmed_vendor_count": confirmed_count,
                        "all_vendors_confirmed": all_confirmed
                    }
                )
                
                signal.expected_vendor_count = expected_count
                signal.confirmed_vendor_count = confirmed_count
                signal.all_vendors_confirmed = all_confirmed
                if all_confirmed:
                    signal.status = BuyerSignalStatus.ELIGIBLE
                else:
                    signal.status = BuyerSignalStatus.HELD
                signal.save()
                
            # Log
            log_vendor_id = None
            log_scope_id = None
            if ops_to_execute:
                log_vendor_id = ops_to_execute[0]["sub"].vendor_company_reference
                log_scope_id = ops_to_execute[0]["sub"].order.company_scope_reference
            else:
                if hasattr(user, "entity") and user.entity and user.entity.company:
                    log_vendor_id = user.entity.company.id
                    log_scope_id = user.entity.company.id
                else:
                    log_vendor_id = user.id
                    log_scope_id = user.id
                    
            VendorShippingImportLog.objects.create(
                vendor_company_reference=log_vendor_id,
                company_scope_reference=log_scope_id,
                uploaded_by=user if user.is_authenticated else None,
                csv_filename=getattr(file_obj, "name", "shipping_import.csv"),
                csv_content=csv_content,
                rows_applied=applied_count,
                rows_skipped=skipped_count,
                rows_rejected=rejected_count,
                rows_review_required=review_required_count,
                results_payload={
                    "rows": rows_analysis,
                    "summary": summary
                }
            )
            
        return Response({
            "success_count": applied_count + review_required_count,
            "applied_count": applied_count,
            "review_required_count": review_required_count,
            "skipped_count": skipped_count
        })


class VendorExportScheduleViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorExportSchedule.objects.all()
    serializer_class = VendorExportScheduleSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
        "create": "routing.export.manage",
        "update": "routing.export.manage",
        "partial_update": "routing.export.manage",
        "destroy": "routing.export.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = VendorExportSchedule.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company:
                if company.company_type == "vendor":
                    qs = qs.filter(vendor_company_reference=company.id)
                else:
                    qs = qs.none()
            else:
                qs = qs.none()
        return qs


class VendorExportWindowViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorExportWindow.objects.select_related("schedule")
    serializer_class = VendorExportWindowSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = VendorExportWindow.objects.select_related("schedule")
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company:
                if company.company_type == "vendor":
                    qs = qs.filter(vendor_company_reference=company.id)
                else:
                    qs = qs.none()
            else:
                qs = qs.none()
        return qs

    @action(detail=True, methods=["get"])
    def delivery_evidence(self, request, pk=None):
        """Delivery evidence for this window (read-only reference for Fulfillment)."""
        window = self.get_object()
        try:
            return Response(VendorExportDeliveryEvidenceSerializer(window.delivery_evidence).data)
        except VendorExportDeliveryEvidence.DoesNotExist:
            return Response({"detail": "No delivery evidence yet."}, status=404)


def create_reexport_audit_and_evidence(
    event_code, description, status, company_id, actor_id,
    reexport_attempt, file_checksum, file_name, correlation_id
):
    from apps.audit.models import AuditRecord, EvidenceRecord, RetentionClass, RedactionClass, AccessClass, EvidenceStatus
    try:
        # 1. Create AuditRecord
        audit_rec = AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status=status,
            actor_reference=actor_id,
            company_scope_reference=company_id,
            source_module="routing",
            source_record_type="VendorOrderReexportAttempt",
            source_record_id=reexport_attempt.id,
            correlation_id=correlation_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
        
        # 2. Create linked EvidenceRecord
        EvidenceRecord.objects.create(
            audit_record=audit_rec,
            evidence_type="file_evidence",
            evidence_status=EvidenceStatus.ACTIVE,
            source_module="routing",
            source_record_type="VendorOrderReexportAttempt",
            source_record_id=reexport_attempt.id,
            company_scope_reference=company_id,
            actor_reference=actor_id,
            evidence_hash_reference=file_checksum,
            evidence_schema_version="1.0",
            correlation_reference=correlation_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to log linked audit and evidence record: {e}")


class VendorOrderExportLogViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorOrderExportLog.objects.all()
    serializer_class = VendorOrderExportLogSerializer
    ordering = ["-sent_at"]
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
        "reexport": "routing.export.manage",
    }

    def get_queryset(self):
        user = self.request.user
        qs = VendorOrderExportLog.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company:
                if company.company_type == "vendor":
                    qs = qs.filter(vendor_company_reference=company.id)
                elif company.company_type == "buyer":
                    qs = qs.filter(buyer_company_reference=company.id)
                else:
                    qs = qs.none()
            else:
                qs = qs.none()
        return qs

    @action(detail=True, methods=["post"])
    def reexport(self, request, pk=None):
        log = self.get_object()
        
        from django.utils import timezone
        import hashlib
        import base64
        import json
        from apps.tenant.models import Company, User
        from apps.notification.models import NotificationRequest, NotificationChannel, NotificationTemplate, TemplateStatus
        from apps.routing.models import ExportWindowStatus, VendorOrderReexportAttempt
        
        reason = request.data.get("reason")
        explanation = request.data.get("explanation")
        
        if not reason:
            return Response({"detail": "Re-export reason is required."}, status=400)
            
        if reason == "Other" and not explanation:
            return Response({"detail": "Explanation is required when reason is 'Other'."}, status=400)
            
        # 1. User is authenticated
        if not request.user.is_authenticated:
            return Response({"detail": "User is not authenticated."}, status=401)
            
        # 2. User has permission to re-export files
        from apps.tenant.services import check_access
        access = check_access(request.user, "routing.export.manage")
        if not access.granted:
            return Response({"detail": f"Access denied: {access.reason} (required: routing.export.manage)"}, status=403)
            
        # 3. User can access the buyer and vendor represented by the batch
        if not request.user.is_cixci_admin:
            entity = getattr(request.user, "entity", None)
            company = entity.company if entity else None
            if not company:
                return Response({"detail": "User is not associated with any company."}, status=403)
            if company.id not in [log.vendor_company_reference, log.buyer_company_reference]:
                return Response({"detail": "User does not have access to the vendor or buyer represented by this batch."}, status=403)
                
        # 4. Original stored CSV still exists
        if not log.csv_backup:
            return Response({"detail": "The original stored CSV does not exist."}, status=400)
            
        # 5. Vendor delivery configuration is valid
        try:
            vendor = Company.objects.get(id=log.vendor_company_reference)
        except Company.DoesNotExist:
            return Response({"detail": "Vendor company not found."}, status=400)
            
        if vendor.status != "active":
            return Response({"detail": "Vendor company is inactive."}, status=400)
            
        integration_mode = "api"
        if vendor.external_id:
            try:
                meta = json.loads(vendor.external_id)
                integration_mode = meta.get("integration_mode", "api")
            except Exception:
                pass
        if integration_mode != "manual":
            return Response({"detail": "Vendor integration mode is not manual."}, status=400)
            
        # 6. Original export batch has not been canceled, revoked, or restricted
        if log.window.status == ExportWindowStatus.CANCELLED:
            return Response({"detail": "The original export window has been cancelled."}, status=400)
        if log.email_send_result in ["revoked", "canceled", "restricted"]:
            return Response({"detail": f"The original export batch is {log.email_send_result}."}, status=400)
            
        # Create a re-export attempt record
        csv_bytes = log.csv_backup.encode("utf-8")
        file_checksum = hashlib.sha256(csv_bytes).hexdigest()
        
        recipient_emails = log.recipients
        if not recipient_emails:
            recipient_users = User.objects.filter(email__in=log.recipients)
            authorized_recipient_ids = []
            for u in recipient_users:
                if u.is_active:
                    if u.is_cixci_admin or (u.entity and u.entity.company_id == log.vendor_company_reference):
                        authorized_recipient_ids.append(str(u.id))
            if not authorized_recipient_ids:
                first_vendor_user = User.objects.filter(entity__company=vendor, is_active=True).first()
                if first_vendor_user:
                    recipient_emails = [first_vendor_user.email]
                else:
                    system_admin = User.objects.filter(is_superuser=True, is_active=True).first()
                    if system_admin:
                        recipient_emails = [system_admin.email]
                    else:
                        recipient_emails = ["admin@cixci.local"]
                        
        recipient_email_str = ", ".join(recipient_emails)
        
        # Get IP address and User Agent
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
            
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Snapshot role
        user = request.user
        if user.is_cixci_admin:
            role_snapshot = "CIXCI Admin"
        elif user.is_staff:
            role_snapshot = "Staff"
        elif user.company:
            role_snapshot = "Vendor Representative" if user.company.company_type == "vendor" else "Buyer Representative"
        else:
            role_snapshot = "User"

        reexport_attempt = VendorOrderReexportAttempt.objects.create(
            original_export_batch=log,
            attempt_number=log.reexport_attempts.count() + 1,
            trigger_type="USER",
            triggered_by_user=user,
            triggered_by_user_name_snapshot=f"{user.first_name} {user.last_name}".strip() or user.email,
            triggered_by_company=user.company,
            triggered_by_company_name_snapshot=user.company.name if user.company else None,
            triggered_by_role_snapshot=role_snapshot,
            reason_code=reason,
            reason_notes=explanation,
            requested_at=timezone.now(),
            delivery_status="QUEUED",
            delivery_destination_snapshot=recipient_email_str,
            delivery_method=log.sending_method or "email",
            file_checksum=file_checksum,
            file_storage_reference=log.filename,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Log requested event
        create_reexport_audit_and_evidence(
            event_code="order_export.reexport_requested",
            description=f"Manual re-export requested for export log {log.id}",
            status="success",
            company_id=log.vendor_company_reference,
            actor_id=user.id,
            reexport_attempt=reexport_attempt,
            file_checksum=file_checksum,
            file_name=log.filename,
            correlation_id=reexport_attempt.correlation_id
        )
        
        # Transition attempt status to PROCESSING
        reexport_attempt.delivery_status = "PROCESSING"
        reexport_attempt.processing_started_at = timezone.now()
        reexport_attempt.save(update_fields=["delivery_status", "processing_started_at"])
        
        # Deliver email using NotificationRequest
        filename = log.filename
        if not filename.endswith("_REEXPORT.csv"):
            filename = filename.replace(".csv", "_REEXPORT.csv")
            
        csv_base64 = base64.b64encode(csv_bytes).decode("utf-8")
        attachments = [{
            "filename": filename,
            "content": csv_base64,
            "mime_type": "text/csv"
        }]
        
        buyer_company = Company.objects.filter(id=log.buyer_company_reference).first()
        buyer_name = buyer_company.name if buyer_company else "Unknown Buyer"
        
        recipient_users = User.objects.filter(email__in=recipient_emails)
        authorized_recipient_ids = []
        for u in recipient_users:
            if u.is_active:
                if u.is_cixci_admin or (u.entity and u.entity.company_id == log.vendor_company_reference):
                    authorized_recipient_ids.append(str(u.id))
        if not authorized_recipient_ids:
            first_vendor_user = User.objects.filter(entity__company=vendor, is_active=True).first()
            if first_vendor_user:
                authorized_recipient_ids = [str(first_vendor_user.id)]
            else:
                system_admin = User.objects.filter(is_superuser=True, is_active=True).first()
                if system_admin:
                    authorized_recipient_ids = [str(system_admin.id)]
                    
        template = NotificationTemplate.objects.filter(
            event_type="vendor.order_export",
            channel=NotificationChannel.EMAIL,
            status=TemplateStatus.APPROVED
        ).first()
        
        email_send_result = "success"
        email_message_id = None
        error_code = None
        error_message = None
        
        if template:
            try:
                notif = NotificationRequest.objects.create(
                    event_type="vendor.order_export",
                    source_module="routing",
                    source_record_id=log.window.id,
                    safe_payload_summary={
                        "buyer_name": buyer_name,
                        "vendor_name": vendor.name,
                        "export_date": timezone.now().strftime('%Y-%m-%d'),
                        "export_time": timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
                        "order_count": log.order_count,
                        "suborder_count": log.suborder_count,
                    },
                    attachments=attachments,
                    requested_recipient_ids=authorized_recipient_ids,
                    company_scope_reference=log.vendor_company_reference,
                    template_code=template.template_code,
                    channel=NotificationChannel.EMAIL,
                    idempotency_key=f"reexport_attempt_{reexport_attempt.id}"
                )
                email_message_id = f"msg_{notif.id}"
            except Exception as e:
                email_send_result = "failed"
                error_code = "NOTIFICATION_REQUEST_FAILED"
                error_message = str(e)
        else:
            email_send_result = "no_recipients_configured"
            error_code = "NO_TEMPLATE"
            error_message = "No approved notification template found for vendor.order_export"
            
        reexport_attempt.delivery_status = "SENT" if email_send_result in ["success", "no_recipients_configured"] else "DELIVERY_FAILED"
        reexport_attempt.provider_message_id = email_message_id
        reexport_attempt.completed_at = timezone.now()
        reexport_attempt.error_code = error_code
        reexport_attempt.error_message = error_message
        reexport_attempt.save()
        
        # Update parent export summary
        log.reexport_count = log.reexport_attempts.count()
        log.last_reexport_status = reexport_attempt.delivery_status
        log.last_reexported_at = reexport_attempt.requested_at
        log.last_reexported_by_name = reexport_attempt.triggered_by_user_name_snapshot
        log.save(update_fields=[
            "reexport_count", "last_reexport_status", "last_reexported_at", "last_reexported_by_name"
        ])

        # Log completion event (sent or failed)
        if reexport_attempt.delivery_status == "SENT":
            create_reexport_audit_and_evidence(
                event_code="order_export.reexport_sent",
                description=f"Manual re-export sent successfully for export log {log.id}",
                status="success",
                company_id=log.vendor_company_reference,
                actor_id=user.id,
                reexport_attempt=reexport_attempt,
                file_checksum=file_checksum,
                file_name=log.filename,
                correlation_id=reexport_attempt.correlation_id
            )
        else:
            create_reexport_audit_and_evidence(
                event_code="order_export.reexport_failed",
                description=f"Manual re-export failed for export log {log.id}: {error_message}",
                status="failed",
                company_id=log.vendor_company_reference,
                actor_id=user.id,
                reexport_attempt=reexport_attempt,
                file_checksum=file_checksum,
                file_name=log.filename,
                correlation_id=reexport_attempt.correlation_id
            )
        
        return Response(VendorOrderExportLogSerializer(log).data, status=201)


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("export-schedules", VendorExportScheduleViewSet, basename="export-schedule")
router.register("export-windows", VendorExportWindowViewSet, basename="export-window")
router.register("export-logs", VendorOrderExportLogViewSet, basename="export-log")

urlpatterns = [path("", include(router.urls))]
