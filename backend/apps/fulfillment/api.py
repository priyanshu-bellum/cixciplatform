"""Fulfillment & Returns — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin
from .models import (
    FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy, SLAEvaluationRecord,
    LateFulfillmentImportException, MissingFulfillmentImportException,
    SLAOverrideExcuseEvidence, DeliveryDateEvidence, BuyerUpdateReadySignal,
    ReturnRequest, VendorReturnImportLog, ReturnStatus, VendorShippingImportLog,
)
import re

def upc_matches(db_upc, csv_upc):
    db_upc = (db_upc or "").strip()
    csv_upc = (csv_upc or "").strip()
    if not db_upc or not csv_upc:
        return False
    
    db_clean = re.sub(r'\D', '', db_upc).lstrip('0')
    if not db_clean:
        return False
        
    csv_clean_exact = re.sub(r'\D', '', csv_upc).lstrip('0')
    if db_clean == csv_clean_exact:
        return True
        
    if re.match(r'^\d+(\.\d+)?[eE][+-]?\d+$', csv_upc):
        try:
            parts = re.split(r'[eE]', csv_upc)
            significand = parts[0]
            exponent = int(parts[1])
            
            if '.' in significand:
                left, right = significand.split('.')
                significant_digits = left + right
            else:
                significant_digits = significand
                
            csv_clean = significant_digits.lstrip('0')
            if csv_clean and db_clean.startswith(csv_clean):
                return True
        except Exception:
            pass
            
    return False

# ─── Serializers ──────────────────────────────────────────────────────────────

class FulfillmentHandoffSerializer(serializers.ModelSerializer):
    class Meta:
        model = FulfillmentHandoff
        fields = [
            "id", "routed_suborder_reference", "vendor_company_reference",
            "company_scope_reference", "status", "delivery_evidence_reference",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorFulfillmentResponseSLAPolicy
        fields = [
            "id", "vendor_company_reference", "status",
            "response_window_hours", "partial_threshold_percent",
            "effective_from", "effective_to", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAEvaluationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAEvaluationRecord
        fields = [
            "id", "handoff", "sla_policy",
            "delivery_evidence_reference", "expected_response_by",
            "fulfillment_import_received_timestamp",
            "outcome", "evaluated_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable after creation


class LateFulfillmentExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LateFulfillmentImportException
        fields = [
            "id", "sla_evaluation", "status",
            "actual_import_received_at", "delay_hours", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MissingFulfillmentExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MissingFulfillmentImportException
        fields = [
            "id", "sla_evaluation", "status",
            "late_arrival_reference", "closed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAOverrideEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAOverrideExcuseEvidence
        fields = [
            "id", "sla_evaluation", "exception_type", "exception_reference",
            "override_reason", "override_category",
            "actor_reference", "reversal_reference", "is_reversal", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable


class DeliveryDateEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryDateEvidence
        fields = [
            "id", "handoff", "shipment_line_reference",
            "vendor_reported_delivery_date", "validation_outcome",
            "triggers_delivered_state", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BuyerUpdateSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerUpdateReadySignal
        fields = [
            "id", "order_reference", "buyer_reference",
            "update_kind", "status",
            "expected_vendor_count", "confirmed_vendor_count",
            "all_vendors_confirmed", "dispatched_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReturnRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = "__all__"


class VendorReturnImportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorReturnImportLog
        fields = "__all__"


class VendorShippingImportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorShippingImportLog
        fields = "__all__"


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class FulfillmentHandoffViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    serializer_class = FulfillmentHandoffSerializer
    action_capability_map = {
        "list": "fulfillment.handoff.list",
        "retrieve": "fulfillment.handoff.read",
        "create": "fulfillment.handoff.create",
        "update": "fulfillment.handoff.update",
        "partial_update": "fulfillment.handoff.update",
        "destroy": "fulfillment.handoff.manage",
        "sla_evaluations": "fulfillment.sla.read",
        "delivery_dates": "fulfillment.handoff.read",
        "debug_order": "fulfillment.handoff.list",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = FulfillmentHandoff.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                qs = qs.filter(vendor_company_reference=company.id)
            elif company.company_type == "buyer":
                qs = qs.filter(company_scope_reference=company.id)
        return qs

    @action(detail=False, methods=["get"], url_path="debug-order")
    def debug_order(self, request):
        from apps.procurement.models import PurchaseOrderLine
        from apps.catalog.models import Product
        
        order_id = request.query_params.get("order_id", "")
        po_lines = PurchaseOrderLine.objects.filter(purchase_order_id=order_id)
        
        lines_data = []
        for line in po_lines:
            prod_info = None
            try:
                prod = Product.objects.get(id=line.product_reference)
                prod_info = {
                    "id": str(prod.id),
                    "name": prod.name,
                    "sku": prod.sku,
                    "upc": prod.upc,
                }
            except Product.DoesNotExist:
                prod_info = "Product Not Found"
                
            lines_data.append({
                "line_id": str(line.id),
                "product_reference": str(line.product_reference),
                "quantity": line.quantity,
                "product": prod_info,
            })
            
        return Response({
            "order_id": order_id,
            "lines": lines_data
        })

    @action(detail=True, methods=["get"])
    def sla_evaluations(self, request, pk=None):
        """SLA evaluation records for this handoff."""
        handoff = self.get_object()
        evals = handoff.sla_evaluations.select_related("sla_policy").all()
        return Response(SLAEvaluationRecordSerializer(evals, many=True).data)

    @action(detail=True, methods=["get"])
    def delivery_dates(self, request, pk=None):
        """Delivery date evidence for this handoff."""
        handoff = self.get_object()
        evidence = handoff.delivery_date_evidence.all()
        return Response(DeliveryDateEvidenceSerializer(evidence, many=True).data)

    @action(detail=False, methods=["post"], url_path="import-shipping")
    def import_shipping(self, request):
        """
        Import buyer shipping update CSV.

        Expected columns (from the standard exported orders CSV):
          Buyer, First Name, Last Name, Address 1, Address 2, City, State, Zip Code,
          Suborder, SKU, UPC, Quantity, Vendor Confirmation Number,
          Shipping Carrier, Shipping Tracking Number, Shipped Date, Delivered Date

        Updatable fields per row: Vendor Confirmation Number, Shipping Carrier,
        Shipping Tracking Number, Shipped Date, Delivered Date.
        Status is auto-transitioned: shipped_date → 'shipped', delivered_date → 'delivered'.
        """
        import csv
        import io
        from datetime import datetime
        from django.db import transaction
        from django.utils import timezone

        user = request.user
        file_obj = request.FILES.get("file") or request.data.get("file")
        if not file_obj:
            return Response({"errors": [{"row": "file", "errors": ["No CSV file provided"]}]}, status=400)

        try:
            csv_content = file_obj.read()
            if isinstance(csv_content, bytes):
                csv_content = csv_content.decode("utf-8-sig")
        except Exception as e:
            return Response({"errors": [{"row": "file", "errors": [f"Failed to read file: {e}"]}]}, status=400)

        if not csv_content.strip():
            return Response({"errors": [{"row": "file", "errors": ["Uploaded file is empty"]}]}, status=400)

        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        try:
            raw_headers = next(reader)
        except StopIteration:
            return Response({"errors": [{"row": "header", "errors": ["No headers found"]}]}, status=400)

        headers_lower = [h.strip().lower() for h in raw_headers]

        def col(name_variants):
            for v in name_variants:
                if v in headers_lower:
                    return headers_lower.index(v)
            return None

        idx_suborder       = col(["suborder", "suborder id", "suborder_id"])
        idx_sku            = col(["sku"])
        idx_upc            = col(["upc"])
        idx_quantity       = col(["quantity", "qty", "quantity shipped", "quantity_shipped"])
        idx_buyer          = col(["buyer"])
        idx_first_name     = col(["first name", "first_name", "customer first name", "customer_first_name"])
        idx_last_name      = col(["last name", "last_name", "customer last name", "customer_last_name"])
        idx_address_1      = col(["address 1", "address_1", "address1"])
        idx_address_2      = col(["address 2", "address_2", "address2"])
        idx_city           = col(["city"])
        idx_state          = col(["state"])
        idx_zip            = col(["zip code", "zip_code", "zip"])
        idx_vendor_confirm = col(["vendor confirmation number", "vendor_confirmation_number", "vendor order number", "vendor_order_number", "vendor confirmation"])
        idx_carrier        = col(["shipping carrier", "shipping_carrier", "carrier"])
        idx_tracking       = col(["shipping tracking number", "shipping_tracking_number", "tracking number", "tracking_number", "tracking"])
        idx_shipped        = col(["shipped date", "shipped_date"])
        idx_delivered      = col(["delivered date", "delivered_date"])

        if idx_suborder is None:
            return Response({"errors": [{"row": "header", "errors": ["Missing required column: 'Suborder'"]}]}, status=400)
        if idx_sku is None:
            return Response({"errors": [{"row": "header", "errors": ["Missing required column: 'SKU'"]}]}, status=400)
        if idx_quantity is None:
            return Response({"errors": [{"row": "header", "errors": ["Missing required column: 'Quantity'"]}]}, status=400)

        def cell(row, idx, default=""):
            if idx is None or idx >= len(row):
                return default
            return row[idx].strip()

        def parse_date(val):
            if not val:
                return None
            for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"):
                try:
                    return datetime.strptime(val.strip(), fmt).date()
                except ValueError:
                    continue
            return None

        # Determine company scope
        company = None
        is_admin = user.is_cixci_admin
        if not is_admin:
            company = user.company
            if not company:
                return Response({"detail": "User has no company scope."}, status=403)

        rows_analysis = []
        ops_to_execute = []
        applied = skipped = rejected = 0
        has_rejections = False
        seen_suborders = {}

        for row_idx, row in enumerate(reader, 1):
            if not row or not any(cell(row, idx).strip() for idx in range(len(row)) if cell(row, idx)):
                continue

            suborder_val = cell(row, idx_suborder)
            row_errors = []
            row_status = "applied"

            if not suborder_val:
                row_errors.append("Suborder ID is missing")
                row_status = "rejected"

            sku_val = cell(row, idx_sku)
            upc_val = cell(row, idx_upc)
            seen_key = (suborder_val, sku_val, upc_val)

            # Duplicate within batch
            if row_status != "rejected" and seen_key in seen_suborders:
                row_errors.append(f"Duplicate row for Suborder {suborder_val} and SKU/UPC '{sku_val}/{upc_val}' in import (first at row {seen_suborders[seen_key]})")
                row_status = "review_required"
            elif row_status != "rejected":
                seen_suborders[seen_key] = row_idx

            sub = None
            if row_status == "applied":
                try:
                    import uuid as _uuid
                    suborder_uuid = _uuid.UUID(suborder_val)
                    from apps.routing.models import RoutedSuborder
                    sub = RoutedSuborder.objects.filter(id=suborder_uuid).first()
                    if sub is None:
                        row_errors.append(f"No suborder found for Suborder {suborder_val}")
                        row_status = "rejected"
                    elif not is_admin and company:
                        if company.company_type == "buyer":
                            if str(sub.order.company_scope_reference) != str(company.id):
                                row_errors.append("Permission denied: suborder belongs to a different company")
                                row_status = "rejected"
                        elif company.company_type == "vendor":
                            if str(sub.vendor_company_reference) != str(company.id):
                                row_errors.append("Permission denied: suborder belongs to a different company")
                                row_status = "rejected"
                        else:
                            row_errors.append("Permission denied: invalid company type")
                            row_status = "rejected"
                except ValueError:
                    row_errors.append(f"Invalid Suborder UUID format: {suborder_val}")
                    row_status = "rejected"

            # Validate Product & PO Line match (verifies quantity, SKU, and UPC against the PO lines for that suborder's order)
            if row_status == "applied" and sub:
                sku_val = cell(row, idx_sku)
                upc_val = cell(row, idx_upc)
                qty_val = cell(row, idx_quantity)
                
                try:
                    row_qty = int(qty_val) if qty_val else None
                    if row_qty is not None and row_qty <= 0:
                        row_errors.append("Quantity must be greater than 0")
                        row_status = "rejected"
                except (ValueError, TypeError):
                    row_errors.append("Quantity is not numeric")
                    row_status = "rejected"
                    row_qty = None
                
                if row_status == "applied":
                    from apps.procurement.models import PurchaseOrderLine
                    from apps.catalog.models import Product
                    
                    po_lines = PurchaseOrderLine.objects.filter(purchase_order_id=sub.order_id)
                    matched_line = None
                    for line in po_lines:
                        try:
                            prod = Product.objects.get(id=line.product_reference)
                            if prod.sku.strip() == sku_val.strip() and upc_matches(prod.upc or "", upc_val):
                                matched_line = line
                                break
                        except Product.DoesNotExist:
                            continue
                            
                    if not matched_line:
                        row_errors.append(f"SKU/UPC mismatch: No line matching SKU '{sku_val}' and UPC '{upc_val}' in order {sub.order_id}")
                        row_status = "rejected"
                    elif row_qty != matched_line.quantity:
                        row_errors.append(f"mismatch: Quantity {row_qty} does not match ordered quantity {matched_line.quantity}")
                        row_status = "rejected"

            # Validate Locked Fields
            if row_status == "applied" and sub:
                buyer_val = cell(row, idx_buyer)
                from apps.tenant.models import Company
                buyer_company = Company.objects.filter(id=sub.order.company_scope_reference).first()
                db_buyer_name = buyer_company.name if buyer_company else ""
                if buyer_val and buyer_val.strip().lower() != db_buyer_name.strip().lower():
                    row_errors.append(f"mismatch: Buyer '{buyer_val}' does not match original '{db_buyer_name}'")
                    row_status = "rejected"

                shipping = sub.routing_snapshot.get("customer_shipping") or {}
                db_first_name = shipping.get("customer_first_name") or ""
                db_last_name = shipping.get("customer_last_name") or ""
                db_address_1 = shipping.get("address_1") or ""
                db_address_2 = shipping.get("address_2") or ""
                db_city = shipping.get("city") or ""
                db_state = shipping.get("state") or ""
                db_zip = shipping.get("zip") or ""
                
                first_name_val = cell(row, idx_first_name)
                last_name_val = cell(row, idx_last_name)
                address_1_val = cell(row, idx_address_1)
                address_2_val = cell(row, idx_address_2)
                city_val = cell(row, idx_city)
                state_val = cell(row, idx_state)
                zip_val = cell(row, idx_zip)
                
                if first_name_val and first_name_val.strip().lower() != db_first_name.strip().lower():
                    row_errors.append(f"mismatch: First Name '{first_name_val}' does not match original '{db_first_name}'")
                    row_status = "rejected"
                if last_name_val and last_name_val.strip().lower() != db_last_name.strip().lower():
                    row_errors.append(f"mismatch: Last Name '{last_name_val}' does not match original '{db_last_name}'")
                    row_status = "rejected"
                if address_1_val and address_1_val.strip().lower() != db_address_1.strip().lower():
                    row_errors.append(f"mismatch: Address 1 '{address_1_val}' does not match original '{db_address_1}'")
                    row_status = "rejected"
                if address_2_val and address_2_val.strip().lower() != db_address_2.strip().lower():
                    row_errors.append(f"mismatch: Address 2 '{address_2_val}' does not match original '{db_address_2}'")
                    row_status = "rejected"
                if city_val and city_val.strip().lower() != db_city.strip().lower():
                    row_errors.append(f"mismatch: City '{city_val}' does not match original '{db_city}'")
                    row_status = "rejected"
                if state_val and state_val.strip().lower() != db_state.strip().lower():
                    row_errors.append(f"mismatch: State '{state_val}' does not match original '{db_state}'")
                    row_status = "rejected"
                if zip_val and zip_val.strip().lower() != db_zip.strip().lower():
                    row_errors.append(f"mismatch: Zip Code '{zip_val}' does not match original '{db_zip}'")
                    row_status = "rejected"

            handoff = None
            if row_status == "applied" and sub:
                handoff = FulfillmentHandoff.objects.filter(
                    routed_suborder_reference=sub.id
                ).first()
                if handoff and handoff.status in ("delivered", "closed"):
                    row_status = "skipped"
                    row_errors.append(f"Handoff is already in terminal status '{handoff.status}'")

            if row_status == "applied":
                vendor_confirm = cell(row, idx_vendor_confirm)
                carrier        = cell(row, idx_carrier)
                tracking       = cell(row, idx_tracking)
                shipped_raw    = cell(row, idx_shipped)
                delivered_raw  = cell(row, idx_delivered)

                shipped_date   = parse_date(shipped_raw)   if shipped_raw   else None
                delivered_date = parse_date(delivered_raw) if delivered_raw else None

                if shipped_raw and shipped_date is None:
                    row_errors.append(f"Invalid Shipped Date format: '{shipped_raw}' (use MM/DD/YYYY)")
                    row_status = "rejected"

                if delivered_raw and delivered_date is None:
                    row_errors.append(f"Invalid Delivered Date format: '{delivered_raw}' (use MM/DD/YYYY)")
                    row_status = "rejected"

                if row_status == "applied":
                    # Check if there's anything to update
                    updates = {}
                    if vendor_confirm:
                        updates["vendor_order_number"] = vendor_confirm
                    if carrier:
                        updates["shipping_carrier"] = carrier
                    if tracking:
                        updates["tracking_number"] = tracking
                    if shipped_date:
                        updates["shipped_date"] = shipped_date
                    if delivered_date:
                        updates["delivered_date"] = delivered_date

                    if not updates:
                        row_status = "skipped"
                        row_errors.append("No shipping fields provided — nothing to update")
                    else:
                        # Determine new status
                        current_status = handoff.status if handoff else "received"
                        new_status = current_status
                        if delivered_date:
                            new_status = "delivered"
                        elif shipped_date or carrier or tracking:
                            if current_status not in ("shipped", "delivered"):
                                new_status = "shipped"

                        # Check idempotency — skip if data already matches
                        is_same = False
                        if handoff:
                            is_same = all(
                                str(getattr(handoff, k) or "") == str(v or "")
                                for k, v in updates.items()
                            ) and new_status == handoff.status
                            
                        if is_same:
                            row_status = "skipped"
                        else:
                            ops_to_execute.append({
                                "sub": sub,
                                "handoff": handoff,
                                "updates": updates,
                                "new_status": new_status,
                            })
                            applied += 1

            if row_status == "skipped":
                skipped += 1
            elif row_status == "rejected":
                rejected += 1
                has_rejections = True
            elif row_status == "review_required":
                rejected += 1
                has_rejections = True

            rows_analysis.append({
                "row_index": row_idx,
                "suborder": suborder_val,
                "status": row_status,
                "errors": row_errors,
            })

        if has_rejections:
            return Response({
                "errors": [
                    {"row": r["row_index"], "errors": r["errors"]}
                    for r in rows_analysis if r["status"] in ("rejected", "review_required")
                ]
            }, status=400)

        summary = {"applied": applied, "skipped": skipped, "rejected": rejected}

        confirm_val = request.data.get("confirm", request.query_params.get("confirm", True))
        if isinstance(confirm_val, str):
            confirm = confirm_val.lower() in ("true", "1", "yes")
        else:
            confirm = bool(confirm_val)

        if not confirm:
            return Response({
                "detail": "Shipping import preview generated. Set confirm=true to apply.",
                "confirm_required": True,
                "summary": summary,
                "rows": rows_analysis,
            })

        with transaction.atomic():
            from apps.routing.models import RoutingStatus
            from apps.fulfillment.models import BuyerUpdateReadySignal, BuyerUpdateKind, BuyerSignalStatus
            
            for op in ops_to_execute:
                sub = op["sub"]
                h = op["handoff"]
                if not h:
                    h = FulfillmentHandoff.objects.create(
                        routed_suborder_reference=sub.id,
                        vendor_company_reference=sub.vendor_company_reference,
                        company_scope_reference=sub.order.company_scope_reference,
                        status="received"
                    )
                for k, v in op["updates"].items():
                    setattr(h, k, v)
                h.status = op["new_status"]
                h.save()

                # Also update RoutedSuborder status
                if h.status == "delivered":
                    sub.status = RoutingStatus.DELIVERED
                elif h.status == "shipped":
                    sub.status = RoutingStatus.SHIPPED
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

            log_company = company.id if company else user.id
            VendorShippingImportLog.objects.create(
                vendor_company_reference=log_company,
                company_scope_reference=log_company,
                uploaded_by=user if user.is_authenticated else None,
                csv_filename=getattr(file_obj, "name", "shipping_import.csv"),
                csv_content=csv_content,
                rows_applied=applied,
                rows_skipped=skipped,
                rows_rejected=rejected,
                results_payload={"rows": rows_analysis, "summary": summary},
            )

        return Response({
            "success_count": applied,
            "skipped_count": skipped,
            "rejected_count": rejected,
            "detail": "Shipping import applied successfully.",
        })


class SLAEvaluationRecordViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = SLAEvaluationRecordSerializer
    action_capability_map = {
        "list": "fulfillment.sla.list",
        "retrieve": "fulfillment.sla.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["handoff", "outcome"]

    def get_queryset(self):
        user = self.request.user
        qs = SLAEvaluationRecord.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                qs = qs.filter(handoff__vendor_company_reference=company.id)
            elif company.company_type == "buyer":
                qs = qs.filter(handoff__company_scope_reference=company.id)
        return qs


class SLAPolicyViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorFulfillmentResponseSLAPolicy.objects.all()
    serializer_class = SLAPolicySerializer
    action_capability_map = {
        "list": "fulfillment.sla.list",
        "retrieve": "fulfillment.sla.read",
        "create": "fulfillment.sla.manage",
        "update": "fulfillment.sla.manage",
        "partial_update": "fulfillment.sla.manage",
        "destroy": "fulfillment.sla.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]


class SLAOverrideViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    """
    Immutable SLA override records.
    Reversal = new record with is_reversal=True.
    Never mutate an existing record.
    """
    queryset = SLAOverrideExcuseEvidence.objects.all()
    serializer_class = SLAOverrideEvidenceSerializer
    action_capability_map = {
        "list": "fulfillment.sla.list",
        "retrieve": "fulfillment.sla.read",
        "create": "fulfillment.sla.override",
    }
    http_method_names = ["get", "post", "head", "options"]  # No PUT/PATCH/DELETE


class BuyerUpdateSignalViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = BuyerUpdateReadySignal.objects.all()
    serializer_class = BuyerUpdateSignalSerializer
    action_capability_map = {
        "list": "fulfillment.buyer_signal.list",
        "retrieve": "fulfillment.buyer_signal.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["order_reference", "update_kind", "status"]

class VendorShippingImportLogViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorShippingImportLog.objects.all().order_by("-uploaded_at")
    serializer_class = VendorShippingImportLogSerializer
    action_capability_map = {
        "list": "fulfillment.handoff.list",
        "retrieve": "fulfillment.handoff.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "company_scope_reference"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_cixci_admin and user.entity and user.entity.company:
            qs = qs.filter(company_scope_reference=user.entity.company.id)
        return qs


class VendorReturnImportLogViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorReturnImportLog.objects.all()
    serializer_class = VendorReturnImportLogSerializer
    action_capability_map = {
        "list": "fulfillment.return.list",
        "retrieve": "fulfillment.return.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "company_scope_reference"]

    def get_queryset(self):
        user = self.request.user
        qs = VendorReturnImportLog.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                qs = qs.filter(vendor_company_reference=company.id)
            elif company.company_type == "buyer":
                qs = qs.filter(company_scope_reference=company.id)
        return qs


class ReturnRequestViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = ReturnRequest.objects.all()
    serializer_class = ReturnRequestSerializer
    action_capability_map = {
        "list": "fulfillment.return.list",
        "retrieve": "fulfillment.return.read",
        "create": "fulfillment.return.create",
        "update": "fulfillment.return.update",
        "partial_update": "fulfillment.return.update",
        "destroy": "fulfillment.return.manage",
        "import_returns": "fulfillment.return.update",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "suborder_reference", "buyer_reference"]

    def get_queryset(self):
        user = self.request.user
        qs = ReturnRequest.objects.all()
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                from apps.routing.models import RoutedSuborder
                vendor_suborders = RoutedSuborder.objects.filter(vendor_company_reference=company.id).values_list("id", flat=True)
                qs = qs.filter(suborder_reference__in=vendor_suborders)
            elif company.company_type == "buyer":
                qs = qs.filter(buyer_reference=company.id)
        return qs

    @action(detail=False, methods=["post"], url_path="import-returns")
    def import_returns(self, request):
        """
        Import vendor return outcome CSV file.
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
        from decimal import Decimal
        from datetime import datetime
        from django.db import transaction
        from django.utils import timezone
        from apps.tenant.models import Company
        
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
            
        headers_cleaned = [h.strip() for h in headers]
        headers_lower = [h.lower() for h in headers_cleaned]
        
        field_aliases = {
            "buyer": ["buyer"],
            "suborder": ["suborder", "suborder id", "suborder_id"],
            "ran": ["ran", "return authorization number", "return_authorization_number"],
            "reason": ["reason", "return reason", "return_reason"],
            "return_initiation_date": ["return initiation date", "return_initiation_date", "initiation date", "initiation_date"],
            "return_quantity": ["return quantity", "return_quantity", "quantity", "qty"],
            "price_reference": ["vendor wholesale price or pricing snapshot reference", "vendor_wholesale_price_or_pricing_snapshot_reference", "vendor wholesale price", "pricing snapshot reference", "wholesale price", "price reference"],
            "sku": ["sku"],
            "upc": ["upc"],
            "return_received_date": ["return received date", "return_received_date", "received date", "received_date"],
            "return_refunded_amount": ["return refunded amount", "return_refunded_amount", "refunded amount", "refunded_amount", "refund amount", "refund_amount"],
            "rejected_reason": ["rejected reason", "rejected_reason", "rejection reason", "rejection_reason", "reject reason", "reject_reason"],
        }
        
        indices = {}
        for std_field, aliases in field_aliases.items():
            for alias in aliases:
                if alias in headers_lower:
                    indices[std_field] = headers_lower.index(alias)
                    break
                    
        # Check required field RAN
        if "ran" not in indices:
            return Response({
                "errors": [
                    {
                        "row": "header",
                        "errors": ["Missing required CSV column: RAN"]
                    }
                ]
            }, status=400)
            
        def get_val(row, field, default=""):
            if field in indices:
                idx = indices[field]
                if idx < len(row):
                    return row[idx].strip()
            return default
            
        def parse_date_flexible(val):
            if not val:
                return None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
                try:
                    return datetime.strptime(val.strip(), fmt).date()
                except ValueError:
                    continue
            from django.utils.dateparse import parse_date
            try:
                d = parse_date(val)
                if d:
                    return d
            except Exception:
                pass
            return None
            
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
        seen_rans = {}
        
        for idx, row in enumerate(reader, 1):
            if not row or not any(row):
                continue
                
            row_errors = []
            row_status = "applied"
            
            ran_val = get_val(row, "ran")
            if not ran_val:
                row_errors.append("RAN is missing")
                row_status = "rejected"
                
            # Duplicate RAN within batch
            if row_status != "rejected" and ran_val:
                if ran_val in seen_rans:
                    row_errors.append(f"Duplicate RAN {ran_val} in import batch (first seen at row {seen_rans[ran_val]})")
                    row_status = "review_required"
                else:
                    seen_rans[ran_val] = idx
                
            return_req = None
            if row_status not in ["rejected", "review_required"]:
                try:
                    return_req = ReturnRequest.objects.get(ran=ran_val)
                except ReturnRequest.DoesNotExist:
                    row_errors.append(f"Return Request with RAN {ran_val} not found")
                    row_status = "rejected"
                    
            if row_status not in ["rejected", "review_required"] and return_req:
                from apps.routing.models import RoutedSuborder
                try:
                    suborder = RoutedSuborder.objects.get(id=return_req.suborder_reference)
                except RoutedSuborder.DoesNotExist:
                    suborder = None
                    
                if not user.is_cixci_admin:
                    if not hasattr(user, "entity") or not user.entity or not user.entity.company:
                        row_errors.append("permission: User has no associated company")
                        row_status = "rejected"
                    elif suborder and str(suborder.vendor_company_reference) != str(user.entity.company.id):
                        row_errors.append("permission: Vendor is not authorized to update this return request")
                        row_status = "rejected"
                        
            # Locked Field Verification
            if row_status not in ["rejected", "review_required"] and return_req:
                buyer_val = get_val(row, "buyer")
                buyer_company = Company.objects.filter(id=return_req.buyer_reference).first()
                db_buyer_name = buyer_company.name if buyer_company else ""
                if buyer_val.strip().lower() != db_buyer_name.strip().lower():
                    row_errors.append(f"mismatch: Buyer {buyer_val} does not match original {db_buyer_name}")
                    row_status = "rejected"
                    
                suborder_val = get_val(row, "suborder")
                if suborder_val.strip().lower() != str(return_req.suborder_reference).lower():
                    row_errors.append(f"mismatch: Suborder {suborder_val} does not match original {return_req.suborder_reference}")
                    row_status = "rejected"
                    
                reason_val = get_val(row, "reason")
                if reason_val.strip().lower() != (return_req.reason or "").strip().lower():
                    row_errors.append(f"mismatch: Reason {reason_val} does not match original {return_req.reason}")
                    row_status = "rejected"
                    
                init_date_val = get_val(row, "return_initiation_date")
                csv_init_date = parse_date_flexible(init_date_val)
                db_init_date = return_req.return_initiation_date.date() if return_req.return_initiation_date else None
                if csv_init_date != db_init_date:
                    row_errors.append(f"mismatch: Return Initiation Date {init_date_val} does not match original {db_init_date}")
                    row_status = "rejected"
                    
                qty_val = get_val(row, "return_quantity")
                try:
                    csv_qty = int(qty_val)
                except (ValueError, TypeError):
                    csv_qty = None
                if csv_qty != return_req.return_quantity:
                    row_errors.append(f"mismatch: Return Quantity {qty_val} does not match original {return_req.return_quantity}")
                    row_status = "rejected"
                    
                price_ref_val = get_val(row, "price_reference").strip()
                matched_price = False
                if return_req.vendor_wholesale_price is not None:
                    try:
                        csv_price = Decimal(price_ref_val)
                        if csv_price == return_req.vendor_wholesale_price:
                            matched_price = True
                    except Exception:
                        pass
                if return_req.pricing_snapshot_reference is not None:
                    if price_ref_val.lower() == str(return_req.pricing_snapshot_reference).lower():
                        matched_price = True
                if price_ref_val == str(return_req.vendor_wholesale_price) or price_ref_val == str(return_req.pricing_snapshot_reference):
                    matched_price = True
                if not matched_price:
                    row_errors.append(f"mismatch: Price Reference {price_ref_val} does not match original price/snapshot")
                    row_status = "rejected"
                    
                sku_val = get_val(row, "sku")
                if sku_val.strip().lower() != (return_req.sku or "").strip().lower():
                    row_errors.append(f"mismatch: SKU {sku_val} does not match original {return_req.sku}")
                    row_status = "rejected"
                    
                upc_val = get_val(row, "upc")
                if not upc_matches(return_req.upc or "", upc_val):
                    row_errors.append(f"mismatch: UPC {upc_val} does not match original {return_req.upc}")
                    row_status = "rejected"
                    
            # Outcome Fields parsing
            if row_status not in ["rejected", "review_required"] and return_req:
                received_date_val = get_val(row, "return_received_date")
                refund_amount_val = get_val(row, "return_refunded_amount")
                rejected_reason_val = get_val(row, "rejected_reason")
                
                target_status = None
                target_updates = {}
                
                # Mutual exclusivity: refund amount and rejected reason cannot both be present
                if refund_amount_val and rejected_reason_val:
                    row_errors.append("Return Refunded Amount and Rejected Reason cannot both be present on the same row")
                    row_status = "rejected"
                elif rejected_reason_val:
                    target_status = ReturnStatus.RETURN_REJECTED
                    target_updates["rejected_reason"] = rejected_reason_val
                elif refund_amount_val:
                    try:
                        refund_amt = Decimal(refund_amount_val)
                        if refund_amt <= 0:
                            row_errors.append("Refund amount must be greater than 0")
                            row_status = "rejected"
                        else:
                            # Refund ceiling check
                            max_allowed = None
                            if return_req.vendor_wholesale_price is not None:
                                max_allowed = return_req.vendor_wholesale_price * return_req.return_quantity
                            if max_allowed is not None and refund_amt > max_allowed:
                                row_errors.append(f"Refund amount {refund_amt} exceeds maximum allowed {max_allowed}")
                                row_status = "rejected"
                            else:
                                target_status = ReturnStatus.RETURN_REFUNDED
                                target_updates["return_refunded_amount"] = refund_amt
                    except Exception:
                        row_errors.append("Refunded amount must be a numeric value")
                        row_status = "rejected"
                elif received_date_val:
                    parsed_received_date = parse_date_flexible(received_date_val)
                    if not parsed_received_date:
                        row_errors.append("Invalid Return Received Date format")
                        row_status = "rejected"
                    else:
                        from django.utils.timezone import make_aware
                        from datetime import time
                        received_dt = make_aware(datetime.combine(parsed_received_date, time.min))
                        target_status = ReturnStatus.RETURN_RECEIVED
                        target_updates["return_received_date"] = received_dt
                else:
                    if return_req.status == ReturnStatus.RETURN_SENT_TO_VENDOR:
                        row_errors.append("No return outcome details (received date, refund amount, or rejected reason) were provided")
                        row_status = "rejected"
                        
                # Transition / Terminal State checks
                if row_status not in ["rejected", "review_required"] and target_status:
                    current_status = return_req.status
                    status_rank = {
                        ReturnStatus.RETURN_SENT_TO_VENDOR: 1,
                        ReturnStatus.RETURN_RECEIVED: 2,
                        ReturnStatus.RETURN_REFUNDED: 3,
                        ReturnStatus.RETURN_REJECTED: 3,
                        ReturnStatus.RETURN_CLOSED: 4,
                    }
                    cur_rank = status_rank.get(current_status, 1)
                    tgt_rank = status_rank.get(target_status, 1)
                    
                    # Already closed — nothing more to do
                    if current_status == ReturnStatus.RETURN_CLOSED:
                        row_status = "skipped"
                        row_errors.append("Return is already closed")
                    elif tgt_rank < cur_rank:
                        row_errors.append(f"Cannot transition from terminal status {current_status} to {target_status}")
                        row_status = "rejected"
                    elif tgt_rank == cur_rank:
                        if target_status != current_status:
                            row_errors.append(f"Cannot transition from terminal status {current_status} to {target_status}")
                            row_status = "rejected"
                        elif current_status == ReturnStatus.RETURN_REFUNDED:
                            if "return_refunded_amount" in target_updates and target_updates["return_refunded_amount"] != return_req.return_refunded_amount:
                                row_errors.append("Cannot modify terminal return status: refund amount mismatch")
                                row_status = "rejected"
                            else:
                                row_status = "skipped"
                        elif current_status == ReturnStatus.RETURN_REJECTED:
                            if "rejected_reason" in target_updates and target_updates["rejected_reason"] != return_req.rejected_reason:
                                row_errors.append("Cannot modify terminal return status: rejected reason mismatch")
                                row_status = "rejected"
                            else:
                                row_status = "skipped"
                        elif current_status == ReturnStatus.RETURN_RECEIVED:
                            if "return_received_date" in target_updates:
                                if return_req.return_received_date and target_updates["return_received_date"].date() == return_req.return_received_date.date():
                                    row_status = "skipped"
                    
                if row_status == "applied" and target_status:
                    ops_to_execute.append({
                        "return_req": return_req,
                        "status": target_status,
                        "updates": target_updates
                    })
                    applied_count += 1
                elif row_status == "skipped":
                    skipped_count += 1
                    
            if row_status == "rejected":
                rejected_count += 1
                has_any_rejections = True
            elif row_status == "review_required":
                review_required_count += 1
                
            rows_analysis.append({
                "row_index": idx,
                "ran": ran_val,
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
                "detail": "Return CSV import preview generated. Confirm to apply.",
                "confirm_required": True,
                "summary": summary,
                "rows": rows_analysis
            })
            
        with transaction.atomic():
            for op in ops_to_execute:
                req = op["return_req"]
                req.status = op["status"]
                for k, v in op["updates"].items():
                    setattr(req, k, v)
                req.save()
                
                # Auto-close: after refunded or rejected, transition to Return Closed
                if op["status"] in [ReturnStatus.RETURN_REFUNDED, ReturnStatus.RETURN_REJECTED]:
                    req.status = ReturnStatus.RETURN_CLOSED
                    req.save()
                
            log_vendor_id = None
            log_scope_id = None
            if ops_to_execute:
                from apps.routing.models import RoutedSuborder
                first_req = ops_to_execute[0]["return_req"]
                sub = RoutedSuborder.objects.filter(id=first_req.suborder_reference).first()
                if sub:
                    log_vendor_id = sub.vendor_company_reference
                    log_scope_id = sub.order.company_scope_reference
            if not log_vendor_id:
                if hasattr(user, "entity") and user.entity and user.entity.company:
                    log_vendor_id = user.entity.company.id
                else:
                    log_vendor_id = user.id
                    
            VendorReturnImportLog.objects.create(
                vendor_company_reference=log_vendor_id,
                company_scope_reference=log_scope_id,
                uploaded_by=user if user.is_authenticated else None,
                csv_filename=getattr(file_obj, "name", "return_import.csv"),
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
            "success_count": applied_count,
            "skipped_count": skipped_count,
            "rejected_count": rejected_count,
            "review_required_count": review_required_count,
            "detail": "Return import completed successfully."
        })


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("handoffs", FulfillmentHandoffViewSet, basename="handoff")
router.register("sla-evaluations", SLAEvaluationRecordViewSet, basename="sla-evaluation")
router.register("sla-policies", SLAPolicyViewSet, basename="sla-policy")
router.register("sla-overrides", SLAOverrideViewSet, basename="sla-override")
router.register("buyer-signals", BuyerUpdateSignalViewSet, basename="buyer-signal")
router.register("return-requests", ReturnRequestViewSet, basename="return-request")
router.register("return-import-logs", VendorReturnImportLogViewSet, basename="return-import-log")
router.register("shipping-import-logs", VendorShippingImportLogViewSet, basename="shipping-import-log")

urlpatterns = [path("", include(router.urls))]
