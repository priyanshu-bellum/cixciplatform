"""Media, Analytics, Integration, Procurement, Launch — API (combined stubs with full serializers)"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from config.pagination import CixciCursorPagination

from apps.tenant.mixins import CheckAccessMixin

# ── Media ──────────────────────────────────────────────────────────────────────
from apps.media.models import MediaAsset, UploadSession, Rendition

class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = [
            "id", "asset_type", "status", "owner_module", "owner_record_id",
            "company_scope_reference", "original_filename", "mime_type",
            "file_size_bytes", "storage_key", "storage_provider",
            "content_hash", "is_public", "created_at",
            "width", "height", "has_transparency",
            "alt_text", "display_order",
            "review_status", "reviewed_at", "review_notes", "rejection_reason",
        ]
        read_only_fields = [
            "id", "created_at", "storage_key", "content_hash",
            "width", "height", "has_transparency",
            "review_status", "reviewed_at", "review_notes", "rejection_reason",
        ]

class UploadSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadSession
        fields = [
            "id", "asset", "status", "presigned_url",
            "expected_filename", "expected_mime_type",
            "expires_at", "completed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "presigned_url"]

def get_gcs_client():
    from django.conf import settings
    from google.cloud import storage
    
    creds = getattr(settings, "GS_CREDENTIALS", None)
    if creds:
        import os
        if isinstance(creds, str) and os.path.exists(creds):
            return storage.Client.from_service_account_json(creds)
        import json
        try:
            if isinstance(creds, str):
                info = json.loads(creds)
                return storage.Client.from_service_account_info(info)
            elif isinstance(creds, dict):
                return storage.Client.from_service_account_info(creds)
        except Exception:
            pass
    return storage.Client()


class MediaAssetViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = MediaAsset.objects.all()
    serializer_class = MediaAssetSerializer
    action_capability_map = {
        "list": "media.asset.list", "retrieve": "media.asset.read",
        "create": "media.asset.upload", "update": "media.asset.manage",
        "partial_update": "media.asset.manage", "destroy": "media.asset.manage",
        "renditions": "media.asset.read", "request_upload": "media.asset.upload",
        "upload_file": "media.asset.upload", "upload_zip": "media.asset.upload",
        "review": "media.asset.manage",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["asset_type", "status", "owner_module", "company_scope_reference"]
    search_fields = ["original_filename"]

    def _is_admin(self):
        user = self.request.user
        return getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )

    def get_queryset(self):
        """Tenant isolation (Rule §26): users only see their own company's assets."""
        qs = MediaAsset.objects.all()
        if self._is_admin():
            return qs
        user = self.request.user
        company_id = None
        if hasattr(user, "entity") and user.entity:
            company_id = getattr(user.entity, "company_id", None)
        if not company_id:
            return qs.none()
        return qs.filter(company_scope_reference=company_id)

    def perform_create(self, serializer):
        company_id = None
        if self.request.user.entity:
            company_id = self.request.user.entity.company_id
        else:
            from apps.tenant.models import Company
            company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
            if company:
                company_id = company.id
        serializer.save(
            company_scope_reference=company_id,
            uploaded_by=self.request.user.id,
        )

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """
        Approve or reject an asset (Rule §18). Body: { "decision": "approve"|"reject", "reason": "..." }
        """
        from django.utils import timezone
        from apps.media.services import log_media_audit

        asset = self.get_object()
        decision = (request.data.get("decision") or "").lower()
        reason = request.data.get("reason", "")

        if decision not in ("approve", "reject"):
            return Response({"error": "decision must be 'approve' or 'reject'."}, status=400)

        if decision == "approve":
            asset.review_status = "approved"
            asset.rejection_reason = ""
            asset.status = "ready"
        else:
            asset.review_status = "rejected"
            asset.rejection_reason = reason or "Rejected by reviewer."
            asset.status = "rejected"

        asset.reviewed_at = timezone.now()
        asset.reviewed_by = request.user.id
        asset.review_notes = reason
        asset.save(update_fields=[
            "review_status", "rejection_reason", "status",
            "reviewed_at", "reviewed_by", "review_notes", "updated_at",
        ])

        log_media_audit(
            event_code=f"media.asset.{'approved' if decision == 'approve' else 'rejected'}",
            description=f"Asset {asset.id} {decision}d by reviewer.",
            asset_id=asset.id,
            company_id=asset.company_scope_reference,
            actor_id=request.user.id,
        )
        return Response(MediaAssetSerializer(asset).data)

    @action(detail=True, methods=["get"])
    def renditions(self, request, pk=None):
        asset = self.get_object()
        from apps.media.models import Rendition
        rends = Rendition.objects.filter(asset=asset)
        data = [{"id": str(r.id), "rendition_type": r.rendition_type,
                 "width": r.width, "height": r.height, "mime_type": r.mime_type,
                 "is_ready": r.is_ready} for r in rends]
        return Response(data)

    @action(detail=False, methods=["post"])
    def request_upload(self, request):
        """Initiate a presigned upload session."""
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings
        import uuid

        filename = request.data.get("filename", "upload")
        mime_type = request.data.get("mime_type", "application/octet-stream")
        asset_type = request.data.get("asset_type", "other")
        
        company_id = None
        if request.user.entity:
            company_id = request.user.entity.company_id
        else:
            from apps.tenant.models import Company
            company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
            if company:
                company_id = company.id

        asset_id = uuid.uuid4()
        storage_key = f"{company_id}/{asset_type}/{asset_id}/{filename}"
        
        use_gcs = getattr(settings, "USE_GCS", False)
        use_s3 = getattr(settings, "USE_S3", False)
        
        presigned_url = None
        storage_provider = "local"
        
        if use_gcs:
            storage_provider = "gcs"
            try:
                bucket_name = getattr(settings, "GS_BUCKET_NAME", None)
                if bucket_name:
                    client = get_gcs_client()
                    bucket = client.bucket(bucket_name)
                    blob = bucket.blob(storage_key)
                    presigned_url = blob.generate_signed_url(
                        version="v4",
                        expiration=timedelta(hours=1),
                        method="PUT",
                        content_type=mime_type
                    )
                else:
                    raise ValueError("GS_BUCKET_NAME not configured")
            except Exception as e:
                import logging
                logger = logging.getLogger("apps.media")
                logger.warning(f"Could not generate GCS signed URL: {e}. Falling back to placeholder.")
        
        elif use_s3:
            storage_provider = "s3"
            try:
                import boto3
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
                    endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None)
                )
                presigned_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={
                        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                        'Key': storage_key,
                        'ContentType': mime_type
                    },
                    ExpiresIn=3600
                )
            except Exception as e:
                import logging
                logger = logging.getLogger("apps.media")
                logger.warning(f"Could not generate S3 signed URL: {e}. Falling back to placeholder.")

        if not presigned_url:
            presigned_url = f"https://placeholder-upload.cixci.com/{asset_id}"

        asset = MediaAsset.objects.create(
            id=asset_id,
            asset_type=asset_type,
            original_filename=filename,
            file_extension=filename.rsplit(".", 1)[-1] if "." in filename else "",
            mime_type=mime_type,
            company_scope_reference=company_id,
            owner_module=request.data.get("owner_module", ""),
            uploaded_by=request.user.id,
            storage_key=storage_key,
            storage_provider=storage_provider,
        )
        
        session = UploadSession.objects.create(
            asset=asset,
            expected_filename=filename,
            expected_mime_type=mime_type,
            expires_at=timezone.now() + timedelta(hours=1),
            uploaded_by=request.user.id,
            company_scope_reference=company_id,
            presigned_url=presigned_url,
        )
        # Return the MediaAsset record (with its ID) so the frontend can use
        # reqRes.data.id directly in the subsequent upload_file call.
        # Include the session presigned_url as a bonus field.
        asset_data = MediaAssetSerializer(asset).data
        asset_data["upload_session_id"] = str(session.id)
        asset_data["presigned_url"] = session.presigned_url
        return Response(asset_data, status=201)

    @action(detail=True, methods=["post"])
    def upload_file(self, request, pk=None):
        """Upload a file directly for this asset in local development."""
        asset = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)
        
        import os
        from django.conf import settings
        from apps.media import validation
        from apps.media.services import log_media_audit

        # Resolve company
        company_id = asset.company_scope_reference
        if not company_id:
            if request.user.entity:
                company_id = request.user.entity.company_id
            if not company_id:
                from apps.tenant.models import Company
                company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
                company_id = company.id if company else None

        # Read file into memory for validation
        data = b""
        for chunk in file_obj.chunks():
            data += chunk
        file_obj.seek(0)

        sanitized_name = validation.sanitize_filename(getattr(file_obj, "name", asset.original_filename))
        v = validation.validate_image_bytes(
            data=data,
            filename=sanitized_name,
            asset_type=asset.asset_type or "product_image",
            mime_hint=file_obj.content_type or asset.mime_type,
            company_id=company_id,
        )
        if not v.ok:
            asset.status = "validation_failed"
            asset.review_status = "rejected"
            asset.rejection_reason = v.errors[0] if v.errors else "Validation failed"
            asset.save(update_fields=["status", "review_status", "rejection_reason", "updated_at"])
            log_media_audit(
                event_code="media.asset.validation_failed",
                description=f"Single upload validation failed: {asset.rejection_reason}",
                asset_id=asset.id,
                company_id=company_id,
                actor_id=request.user.id,
                status="failure",
            )
            return Response({
                "error": "Image validation failed",
                "details": v.errors,
                "warnings": v.warnings,
            }, status=400)
        
        # Save file to MEDIA_ROOT / asset.storage_key
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'wb+') as destination:
            destination.write(data)
                
        # Update asset metadata
        asset.status = "ready"
        asset.review_status = "approved"
        asset.file_size_bytes = len(data)
        asset.content_hash = v.content_hash
        asset.original_filename = sanitized_name
        asset.width = v.width
        asset.height = v.height
        asset.has_transparency = v.has_transparency
        asset.save()
        
        # Create version & variant rendition records
        from apps.media.models import MediaAssetVersion, Rendition
        MediaAssetVersion.objects.create(
            asset=asset,
            version_number=1,
            is_current=True,
            storage_key=asset.storage_key,
            content_hash=asset.content_hash,
            file_size_bytes=asset.file_size_bytes
        )
        Rendition.objects.get_or_create(
            asset=asset,
            rendition_type="original",
            defaults={
                "storage_key": asset.storage_key,
                "file_size_bytes": asset.file_size_bytes,
                "mime_type": asset.mime_type,
                "is_ready": True
            }
        )
        log_media_audit(
            event_code="media.asset.uploaded",
            description=f"Asset {asset.id} uploaded (single)",
            asset_id=asset.id,
            company_id=company_id,
            actor_id=request.user.id,
        )
        return Response(MediaAssetSerializer(asset).data)

    @action(detail=False, methods=["post"])
    def upload_zip(self, request):
        """
        Bulk ZIP image upload with validation and SKU matching.
        POST /media/assets/upload_zip/
        Accepts: multipart file (zip), optional company_scope_reference
        Returns: upload summary with per-file results and SKU match status.
        """
        import os
        import uuid
        from django.conf import settings
        from apps.media import validation
        from apps.media.services import log_media_audit

        zip_file = request.FILES.get("file")
        if not zip_file:
            return Response({"error": "No ZIP file uploaded"}, status=400)

        # Resolve company scope
        company_id = None
        if request.user.entity:
            company_id = request.user.entity.company_id
        else:
            from apps.tenant.models import Company
            company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
            if company:
                company_id = company.id
        if not company_id:
            return Response({"error": "Could not resolve company scope for upload."}, status=400)

        # Validate archive
        arch = validation.validate_zip_archive(
            zip_file=zip_file,
            company_id=company_id,
            asset_type="product_image",
        )
        if not arch.get("ok") or arch.get("error"):
            log_media_audit(
                event_code="media.zip.validation_failed",
                description=arch.get("error", "ZIP validation failed"),
                asset_id=None,
                company_id=company_id,
                actor_id=request.user.id,
                status="failure",
            )
            return Response({"error": arch.get("error", "ZIP validation failed")}, status=400)

        results = []
        matched_count = 0
        unmatched_count = 0
        failed_count = 0
        created_count = 0

        # Build SKU lookup for active products
        from apps.catalog.models import Product
        sku_map = {}
        for p in Product.objects.filter(status="active").only("id", "sku", "vendor_company_reference"):
            if p.sku:
                sku_map[p.sku.strip().upper()] = p

        upload_dir = settings.MEDIA_ROOT
        os.makedirs(upload_dir, exist_ok=True)

        for entry in arch.get("entries", []):
            if entry.get("status") != "valid" or not entry.get("data"):
                failed_count += 1
                results.append({
                    "filename": entry.get("filename"),
                    "status": "failed",
                    "reason": entry.get("reason", "Invalid file"),
                    "matched": False,
                    "product_sku": None,
                    "product_id": None,
                })
                continue

            # Match SKU
            fname = entry.get("filename") or entry.get("source_name", "")
            base = os.path.splitext(fname)[0]
            product = sku_map.get(base.strip().upper())
            if not product:
                # try split
                for sep in ("_", "-", " "):
                    if sep in base:
                        for token in base.split(sep):
                            product = sku_map.get(token.strip().upper())
                            if product:
                                break
                        if product:
                            break
            if not product:
                unmatched_count += 1
                results.append({
                    "filename": fname,
                    "status": "unmatched",
                    "reason": "No active product found with matching SKU.",
                    "matched": False,
                    "product_sku": None,
                    "product_id": None,
                })
                continue

            matched_count += 1
            asset_id = uuid.uuid4()
            ext = os.path.splitext(fname)[1].lower() or ".png"
            storage_key = f"{company_id}/product_image/{asset_id}/{fname}"
            full_path = os.path.join(upload_dir, storage_key)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            try:
                with open(full_path, "wb+") as dest:
                    dest.write(entry["data"])
            except Exception as exc:
                failed_count += 1
                results.append({
                    "filename": fname,
                    "status": "failed",
                    "reason": f"Could not save extracted file: {exc}",
                    "matched": True,
                    "product_sku": getattr(product, "sku", None),
                    "product_id": str(product.id),
                })
                continue

            from apps.media.models import MediaAsset, MediaAssetVersion, Rendition
            asset = MediaAsset.objects.create(
                id=asset_id,
                asset_type="product_image",
                status="ready",
                owner_module="catalog",
                owner_record_id=product.id,
                company_scope_reference=company_id,
                original_filename=fname,
                file_extension=ext,
                mime_type="image/png",
                file_size_bytes=entry["file_size_bytes"],
                storage_key=storage_key,
                storage_provider="local",
                content_hash=entry["content_hash"],
                width=entry.get("width"),
                height=entry.get("height"),
                has_transparency=entry.get("has_transparency", True),
                uploaded_by=request.user.id,
            )
            MediaAssetVersion.objects.create(
                asset=asset,
                version_number=1,
                is_current=True,
                storage_key=storage_key,
                content_hash=entry["content_hash"],
                file_size_bytes=entry["file_size_bytes"],
            )
            Rendition.objects.get_or_create(
                asset=asset,
                rendition_type="original",
                defaults={
                    "storage_key": storage_key,
                    "file_size_bytes": entry["file_size_bytes"],
                    "mime_type": "image/png",
                    "width": entry.get("width"),
                    "height": entry.get("height"),
                    "is_ready": True,
                },
            )
            created_count += 1
            results.append({
                "filename": fname,
                "status": "created",
                "reason": "Image validated, saved, and linked to product.",
                "matched": True,
                "product_sku": product.sku,
                "product_id": str(product.id),
            })
            try:
                from apps.media.services import log_media_audit
                log_media_audit(
                    event_code="media.asset.created_from_zip",
                    description=f"Created asset from ZIP, linked to {product.sku}",
                    asset_id=asset.id,
                    company_id=company_id,
                    actor_id=request.user.id,
                )
            except Exception:
                pass

        # Link created assets to products (primary if none)
        try:
            from apps.catalog.api import ProductSerializerBase
            for entry in results:
                if entry.get("product_id") and entry.get("status") == "created":
                    try:
                        product = Product.objects.get(id=entry["product_id"])
                        assets = MediaAsset.objects.filter(owner_record_id=product.id, owner_module="catalog").order_by("display_order", "created_at")
                        if assets.exists() and not product.primary_image_reference:
                            product.primary_image_reference = assets.first().id
                            product.save(actor_id=request.user.id)
                    except Exception:
                        pass
        except Exception:
            pass

        log_media_audit(
            event_code="media.zip.completed",
            description=f"ZIP processed: {matched_count} matched, {unmatched_count} unmatched, {failed_count} failed, {created_count} created",
            asset_id=None,
            company_id=company_id,
            actor_id=request.user.id,
        )

        return Response({
            "total_files": arch["summary"]["total_files"],
            "matched": matched_count,
            "unmatched": unmatched_count,
            "failed": failed_count,
            "created": created_count,
            "results": results,
        })


class UploadSessionViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = UploadSession.objects.all()
    serializer_class = UploadSessionSerializer
    action_capability_map = {
        "list": "media.asset.list",
        "retrieve": "media.asset.read",
    }


# ── Analytics ──────────────────────────────────────────────────────────────────
from apps.analytics.models import ReportingMetric, ActivitySummaryReportingWindow, ActivitySummaryAggregationRecord, DataFreshnessMarker

class ReportingMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportingMetric
        fields = ["id", "code", "label", "source_module", "aggregation_method", "is_active"]
        read_only_fields = ["id"]

class ActivitySummaryWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivitySummaryReportingWindow
        fields = ["id", "window_start", "window_end", "status", "effective_start", "created_at"]
        read_only_fields = ["id", "created_at"]

class ActivitySummaryAggregationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivitySummaryAggregationRecord
        fields = [
            "id", "window", "is_current",
            "orders_count", "shipments_count",
            "sla_exceptions_count", "late_imports_count",
            "missing_imports_count", "partial_imports_count",
            "result_discriminator", "aggregated_at",
        ]
        read_only_fields = ["id", "aggregated_at"]

class DataFreshnessMarkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataFreshnessMarker
        fields = [
            "id", "source_module", "source_event_type",
            "last_processed_at", "last_source_record_reference",
            "is_stale", "updated_at",
        ]
        read_only_fields = ["id", "last_processed_at", "updated_at"]

class DataFreshnessMarkerViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DataFreshnessMarker.objects.all().order_by("-last_processed_at")
    serializer_class = DataFreshnessMarkerSerializer
    action_capability_map = {"list": "analytics.summary.read", "retrieve": "analytics.summary.read"}
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["source_module", "is_stale"]

class ReportingMetricViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = ReportingMetric.objects.filter(is_active=True)
    serializer_class = ReportingMetricSerializer
    action_capability_map = {
        "list": "analytics.metrics.list", "retrieve": "analytics.metrics.read",
        "create": "analytics.metrics.manage", "update": "analytics.metrics.manage",
        "partial_update": "analytics.metrics.manage", "destroy": "analytics.metrics.manage",
    }

class ActivitySummaryWindowViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ActivitySummaryReportingWindow.objects.all().order_by("-window_start")
    serializer_class = ActivitySummaryWindowSerializer
    action_capability_map = {
        "list": "analytics.summary.read",
        "retrieve": "analytics.summary.read",
        "live_summary": "analytics.summary.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    @action(detail=True, methods=["get"])
    def aggregations(self, request, pk=None):
        window = self.get_object()
        aggs = window.aggregation_records.filter(is_current=True)
        return Response(ActivitySummaryAggregationSerializer(aggs, many=True).data)

    @action(detail=False, methods=["get"], url_path="live-summary")
    def live_summary(self, request):
        """Counts computed directly from source modules, for the dashboard."""
        from datetime import timedelta

        from django.utils import timezone
        from apps.routing.models import Order
        from apps.fulfillment.models import (
            DeliveryDateEvidence,
            LateFulfillmentImportException,
            MissingFulfillmentImportException,
            PartialFulfillmentResponseException,
        )

        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, days)
        since = timezone.now() - timedelta(days=days)

        late_count = LateFulfillmentImportException.objects.filter(created_at__gte=since).count()
        missing_count = MissingFulfillmentImportException.objects.filter(created_at__gte=since).count()
        partial_count = PartialFulfillmentResponseException.objects.filter(created_at__gte=since).count()

        return Response({
            "window_days": days,
            "orders_count": Order.objects.filter(placed_at__gte=since).count(),
            "shipments_count": DeliveryDateEvidence.objects.filter(created_at__gte=since).count(),
            "sla_exceptions_count": late_count + missing_count + partial_count,
            "late_imports_count": late_count,
            "missing_imports_count": missing_count,
            "partial_imports_count": partial_count,
            "generated_at": timezone.now(),
        })

# ── Integration ────────────────────────────────────────────────────────────────
from apps.integration.models import (
    ExternalConnection, ExternalActionRequest, ExternalActionOutcome,
    CompanyAPIKey, WebhookDelivery, InboundWebhookReceipt
)

class ExternalConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalConnection
        fields = [
            "id", "company_scope_reference", "connector_type",
            "status", "label", "config_reference", "created_at",
        ]
        read_only_fields = ["id", "company_scope_reference", "created_at"]

class ExternalConnectionViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = ExternalConnection.objects.all()
    serializer_class = ExternalConnectionSerializer
    action_capability_map = {
        "list": "integration.connection.list", "retrieve": "integration.connection.read",
        "create": "integration.connection.manage", "update": "integration.connection.manage",
        "partial_update": "integration.connection.manage", "destroy": "integration.connection.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["connector_type", "status", "company_scope_reference"]

    def perform_create(self, serializer):
        user = self.request.user
        company_id = user.entity.company_id if getattr(user, "entity", None) else None
        if not company_id and getattr(user, "company", None):
            company_id = user.company.id
        serializer.save(company_scope_reference=company_id)

class ExternalActionOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalActionOutcome
        fields = "__all__"

class ExternalActionRequestSerializer(serializers.ModelSerializer):
    company_scope_reference = serializers.ReadOnlyField(source="connection.company_scope_reference", read_only=True)
    target_system = serializers.ReadOnlyField(source="connection.connector_type", read_only=True)
    status = serializers.SerializerMethodField()
    outcomes = ExternalActionOutcomeSerializer(source="outcome", read_only=True)

    class Meta:
        model = ExternalActionRequest
        fields = [
            "id", "company_scope_reference", "connection", "source_module",
            "action_type", "target_system", "status", "idempotency_key",
            "created_at", "outcomes",
        ]

    def get_status(self, obj) -> str:
        if hasattr(obj, "outcome") and obj.outcome:
            return obj.outcome.outcome_status
        return "pending"

class ExternalActionRequestViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ExternalActionRequest.objects.all()
    serializer_class = ExternalActionRequestSerializer
    action_capability_map = {"list": "integration.action.list", "retrieve": "integration.action.read"}
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["source_module", "action_type"]

class CompanyAPIKeySerializer(serializers.ModelSerializer):
    company_scope_reference = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = CompanyAPIKey
        fields = [
            "id", "company_scope_reference", "label", "token",
            "is_active", "created_at", "last_used_at",
        ]
        read_only_fields = ["id", "token", "created_at", "last_used_at"]

class CompanyAPIKeyViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = CompanyAPIKey.objects.all()
    serializer_class = CompanyAPIKeySerializer
    action_capability_map = {
        "list": "integration.connection.list", "retrieve": "integration.connection.read",
        "create": "integration.connection.manage", "destroy": "integration.connection.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_active"]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_cixci_admin", False):
            return CompanyAPIKey.objects.all()
        if not getattr(user, "entity", None):
            return CompanyAPIKey.objects.none()
        return CompanyAPIKey.objects.filter(company_scope_reference=user.entity.company_id)

    def perform_create(self, serializer):
        import secrets, uuid
        token = f"cixci_key_{secrets.token_hex(24)}"
        user = self.request.user
        company_id = serializer.validated_data.get("company_scope_reference")
        if not company_id:
            company_id = user.entity.company_id if getattr(user, "entity", None) else None
        if not company_id and getattr(user, "company", None):
            company_id = user.company.id
        if not company_id and getattr(user, "is_cixci_admin", False):
            from apps.tenant.models import Company
            c = Company.objects.first()
            company_id = c.id if c else uuid.uuid4()
        serializer.save(
            company_scope_reference=company_id,
            token=token
        )

class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = "__all__"

class WebhookDeliveryViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = WebhookDelivery.objects.all()
    serializer_class = WebhookDeliverySerializer
    action_capability_map = {
        "list": "integration.connection.list", "retrieve": "integration.connection.read",
        "create": "integration.connection.manage", "update": "integration.connection.manage",
        "partial_update": "integration.connection.manage", "destroy": "integration.connection.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["event_type", "status"]

class InboundWebhookReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = InboundWebhookReceipt
        fields = "__all__"

class _InboundWebhookPagination(CixciCursorPagination):
    ordering = "-received_at"

class InboundWebhookReceiptViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = InboundWebhookReceipt.objects.all()
    serializer_class = InboundWebhookReceiptSerializer
    pagination_class = _InboundWebhookPagination
    action_capability_map = {
        "list": "integration.connection.list", "retrieve": "integration.connection.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["event_type", "processing_status"]

# ── Procurement ────────────────────────────────────────────────────────────────
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine

class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = [
            "id", "purchase_order", "product_reference",
            "quantity", "unit_price_snapshot", "msrp_snapshot", "line_total", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "company_scope_reference", "buyer_reference",
            "vendor_company_reference", "status",
            "pricing_snapshot_reference", "po_number",
            "currency", "total_amount", "approved_at", "created_at",
        ]
        read_only_fields = ["id", "company_scope_reference", "buyer_reference", "created_at", "approved_at"]

class PurchaseOrderViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    action_capability_map = {
        "list": "procurement.po.list", "retrieve": "procurement.po.read",
        "create": "procurement.po.create", "update": "procurement.po.update",
        "partial_update": "procurement.po.update", "destroy": "procurement.po.manage",
        "approve": "procurement.po.approve",
        "lines": "procurement.po.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "vendor_company_reference"]

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseOrder.objects.all().order_by("-created_at")
        if not user.is_cixci_admin and user.entity:
            company = user.entity.company
            if company.company_type == "vendor":
                qs = qs.filter(vendor_company_reference=company.id)
            elif company.company_type == "buyer":
                qs = qs.filter(company_scope_reference=company.id)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        lines_data = data.pop('lines', None)
        customer_shipping = data.pop('customer_shipping', None)

        company_id = None
        if request.user.entity:
            company_id = request.user.entity.company_id
        else:
            from apps.tenant.models import Company
            company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
            if company:
                company_id = company.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        from apps.catalog.models import Product

        try:
            with transaction.atomic():
                po = serializer.save(
                    buyer_reference=request.user.id,
                    company_scope_reference=company_id,
                )

                from apps.pricing.services import create_effective_price_snapshot
                from apps.tenant.models import Company
                buyer_company = Company.objects.filter(id=company_id).first()

                is_storefront = False
                if po.po_number and po.po_number.startswith("PO-TELCO"):
                    is_storefront = True
                if request.META.get('HTTP_X_API_KEY') or 'HTTP_X_API_KEY' in request.META:
                    is_storefront = True

                if is_storefront:
                    po.status = "approved"
                    from django.utils import timezone
                    po.approved_at = timezone.now()

                total_amount = 0
                first_snapshot_id = None
                if lines_data:
                    for line_item in lines_data:
                        prod_ref = line_item.get('product_reference')
                        qty = int(line_item.get('quantity', 1))

                        try:
                            product = Product.objects.get(id=prod_ref)
                        except Product.DoesNotExist:
                            raise ValidationError(f"Product with ID '{prod_ref}' does not exist.")

                        # Generate pricing snapshot in Pricing module
                        snapshot = create_effective_price_snapshot(product, buyer_company, "buyer_storefront")
                        price = snapshot.buyer_facing_price
                        if not first_snapshot_id:
                            first_snapshot_id = snapshot.id

                        # line_total = MSRP × qty (client rule), fallback to wholesale × qty
                        msrp_val = product.msrp if product.msrp else None
                        line_total = (msrp_val * qty) if msrp_val else (price * qty)
                        total_amount += line_total

                        po_line = PurchaseOrderLine(
                            purchase_order=po,
                            product_reference=product.id,
                            quantity=qty,
                            unit_price_snapshot=price,
                            msrp_snapshot=msrp_val,
                            line_total=line_total
                        )
                        # Save triggers PurchaseOrderLine.clean() validation!
                        po_line.save()

                po.total_amount = total_amount
                if first_snapshot_id:
                    po.pricing_snapshot_reference = first_snapshot_id
                
                update_fields = ["total_amount", "pricing_snapshot_reference"]
                if is_storefront:
                    update_fields.extend(["status", "approved_at"])
                po.save(update_fields=update_fields)

                if po.status == "approved":
                    from apps.procurement.services import orchestrate_po_finalization
                    orchestrate_po_finalization(po, customer_shipping=customer_shipping)

        except ValidationError as ve:
            raise ve
        except Exception as e:
            raise ValidationError(str(e))

        return Response(self.get_serializer(po).data, status=201)

    def perform_create(self, serializer):
        serializer.save(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
        )

    @action(detail=True, methods=["get"])
    def lines(self, request, pk=None):
        po = self.get_object()
        lines = po.lines.all()
        return Response(PurchaseOrderLineSerializer(lines, many=True).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        from apps.tenant.services import check_access
        result = check_access(request.user, "procurement.po.approve")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        from django.utils import timezone
        po = self.get_object()
        po.status = "approved"
        po.approved_at = timezone.now()
        po.save(update_fields=["status", "approved_at", "updated_at"])
        
        # Trigger orchestration
        from apps.procurement.services import orchestrate_po_finalization
        orchestrate_po_finalization(po)
        
        return Response({"status": "approved"})

# ── Launch ─────────────────────────────────────────────────────────────────────
from apps.launch.models import LaunchEvent

class LaunchEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LaunchEvent
        fields = [
            "id", "company_scope_reference", "name", "status",
            "target_launch_date", "product_readiness_references",
            "device_readiness_references", "pricing_readiness_references",
            "notification_trigger_references", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

class LaunchEventViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = LaunchEvent.objects.all()
    serializer_class = LaunchEventSerializer
    action_capability_map = {
        "list": "launch.event.list", "retrieve": "launch.event.read",
        "create": "launch.event.create", "update": "launch.event.update",
        "partial_update": "launch.event.update", "destroy": "launch.event.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "company_scope_reference"]

    def perform_create(self, serializer):
        serializer.save(company_scope_reference=self.request.user.entity.company_id)

# ── Routers ────────────────────────────────────────────────────────────────────

media_router = DefaultRouter()
media_router.register("assets", MediaAssetViewSet, basename="media-asset")
media_router.register("upload-sessions", UploadSessionViewSet, basename="upload-session")

analytics_router = DefaultRouter()
analytics_router.register("metrics", ReportingMetricViewSet, basename="reporting-metric")
analytics_router.register("summary-windows", ActivitySummaryWindowViewSet, basename="summary-window")
analytics_router.register("freshness-markers", DataFreshnessMarkerViewSet, basename="freshness-marker")

integration_router = DefaultRouter()
integration_router.register("connections", ExternalConnectionViewSet, basename="ext-connection")
integration_router.register("action-requests", ExternalActionRequestViewSet, basename="action-request")
integration_router.register("api-keys", CompanyAPIKeyViewSet, basename="company-api-key")
integration_router.register("webhooks", WebhookDeliveryViewSet, basename="webhook-delivery")
integration_router.register("inbound-webhooks", InboundWebhookReceiptViewSet, basename="inbound-webhook")

procurement_router = DefaultRouter()
procurement_router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")

launch_router = DefaultRouter()
launch_router.register("events", LaunchEventViewSet, basename="launch-event")

media_urlpatterns = [path("", include(media_router.urls))]
analytics_urlpatterns = [path("", include(analytics_router.urls))]
integration_urlpatterns = [path("", include(integration_router.urls))]
procurement_urlpatterns = [path("", include(procurement_router.urls))]
launch_urlpatterns = [path("", include(launch_router.urls))]
