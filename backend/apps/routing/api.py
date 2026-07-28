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
    VendorOrderExportLog,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id", "company_scope_reference", "buyer_reference", "buyer_entity_reference",
            "status", "pricing_snapshot_references", "placed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "placed_at"]


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


class VendorOrderExportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorOrderExportLog
        fields = [
            "id", "vendor_company_reference", "buyer_company_reference", "window",
            "filename", "sent_at", "order_count", "suborder_count",
            "sending_method", "recipients", "trigger_type", "triggered_by",
            "status_before", "status_after", "csv_backup", "email_send_result",
            "is_reexport", "original_log", "audit_reference",
        ]


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
            try:
                prod = Product.objects.get(id=line.product_reference)
                prod_name = prod.name
                sku = prod.sku
            except Product.DoesNotExist:
                pass
                
            data.append({
                "id": str(line.id),
                "purchase_order": str(line.purchase_order_id),
                "product_reference": str(line.product_reference),
                "product_name": prod_name,
                "sku": sku,
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
            vendor = Company.objects.filter(id=sub.vendor_company_reference).first()
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
            
        for vendor_id, subs in vendor_groups.items():
            vendor = Company.objects.get(id=vendor_id)
            subs_ids = [s.id for s in subs]
            subs_qs = RoutedSuborder.objects.filter(id__in=subs_ids)
            trigger_vendor_export(vendor, trigger_type="user", triggered_by=request.user, suborders_qs=subs_qs)
            
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


class VendorExportWindowViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorExportWindow.objects.select_related("schedule")
    serializer_class = VendorExportWindowSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    @action(detail=True, methods=["get"])
    def delivery_evidence(self, request, pk=None):
        """Delivery evidence for this window (read-only reference for Fulfillment)."""
        window = self.get_object()
        try:
            return Response(VendorExportDeliveryEvidenceSerializer(window.delivery_evidence).data)
        except VendorExportDeliveryEvidence.DoesNotExist:
            return Response({"detail": "No delivery evidence yet."}, status=404)


class VendorOrderExportLogViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorOrderExportLog.objects.all()
    serializer_class = VendorOrderExportLogSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
        "reexport": "routing.export.manage",
    }

    @action(detail=True, methods=["post"])
    def reexport(self, request, pk=None):
        log = self.get_object()
        
        from django.utils import timezone
        import base64
        from apps.tenant.models import Company, User
        from apps.notification.models import NotificationRequest, NotificationChannel, NotificationTemplate, TemplateStatus
        
        filename = log.filename.replace(".csv", "_REEXPORT.csv")
        
        reexport_log = VendorOrderExportLog.objects.create(
            vendor_company_reference=log.vendor_company_reference,
            buyer_company_reference=log.buyer_company_reference,
            window=log.window,
            filename=filename,
            sent_at=timezone.now(),
            order_count=log.order_count,
            suborder_count=log.suborder_count,
            sending_method=log.sending_method,
            recipients=log.recipients,
            trigger_type="user",
            triggered_by=request.user,
            status_before=log.status_before,
            status_after=log.status_after,
            csv_backup=log.csv_backup,
            is_reexport=True,
            original_log=log,
            email_send_result="success"
        )
        
        vendor = Company.objects.get(id=log.vendor_company_reference)
        buyer_company = Company.objects.filter(id=log.buyer_company_reference).first()
        buyer_name = buyer_company.name if buyer_company else "Unknown Buyer"
        
        recipient_users = User.objects.filter(email__in=log.recipients)
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
                    
        csv_bytes = log.csv_backup.encode("utf-8")
        csv_base64 = base64.b64encode(csv_bytes).decode("utf-8")
        
        attachments = [{
            "filename": filename,
            "content": csv_base64,
            "mime_type": "text/csv"
        }]
        
        template = NotificationTemplate.objects.filter(
            event_type="vendor.order_export",
            channel=NotificationChannel.EMAIL,
            status=TemplateStatus.APPROVED
        ).first()
        
        if template:
            NotificationRequest.objects.create(
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
                idempotency_key=f"reexport_{reexport_log.id}"
            )
            
        return Response(VendorOrderExportLogSerializer(reexport_log).data, status=201)


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("export-schedules", VendorExportScheduleViewSet, basename="export-schedule")
router.register("export-windows", VendorExportWindowViewSet, basename="export-window")
router.register("export-logs", VendorOrderExportLogViewSet, basename="export-log")

urlpatterns = [path("", include(router.urls))]
