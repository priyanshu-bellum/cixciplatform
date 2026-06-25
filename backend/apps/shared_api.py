"""Media, Analytics, Integration, Procurement, Launch — API (combined stubs with full serializers)"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

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
        ]
        read_only_fields = ["id", "created_at", "storage_key", "content_hash"]

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
        "upload_file": "media.asset.upload",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["asset_type", "status", "owner_module", "company_scope_reference"]
    search_fields = ["original_filename"]

    def perform_create(self, serializer):
        serializer.save(
            company_scope_reference=self.request.user.entity.company_id,
            uploaded_by=self.request.user.id,
        )

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
        company_id = request.user.entity.company_id

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
        
        # Save file to MEDIA_ROOT / asset.storage_key
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
                
        # Update asset metadata
        asset.status = "ready"
        asset.file_size_bytes = file_obj.size
        
        # Get content hash
        import hashlib
        hasher = hashlib.sha256()
        file_obj.seek(0)
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        asset.content_hash = hasher.hexdigest()
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
        
        return Response(MediaAssetSerializer(asset).data)

class UploadSessionViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = UploadSession.objects.all()
    serializer_class = UploadSessionSerializer
    action_capability_map = {
        "list": "media.asset.list",
        "retrieve": "media.asset.read",
    }


# ── Analytics ──────────────────────────────────────────────────────────────────
from apps.analytics.models import ReportingMetric, ActivitySummaryReportingWindow, ActivitySummaryAggregationRecord

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
    action_capability_map = {"list": "analytics.summary.read", "retrieve": "analytics.summary.read"}
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    @action(detail=True, methods=["get"])
    def aggregations(self, request, pk=None):
        window = self.get_object()
        aggs = window.aggregation_records.filter(is_current=True)
        return Response(ActivitySummaryAggregationSerializer(aggs, many=True).data)

# ── Integration ────────────────────────────────────────────────────────────────
from apps.integration.models import ExternalConnection, ExternalActionRequest, ExternalActionOutcome

class ExternalConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalConnection
        fields = [
            "id", "company_scope_reference", "connector_type",
            "status", "label", "config_reference", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

class ExternalActionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalActionRequest
        fields = [
            "id", "connection", "source_module", "action_type",
            "source_record_id", "idempotency_key", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

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

class ExternalActionRequestViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ExternalActionRequest.objects.all()
    serializer_class = ExternalActionRequestSerializer
    action_capability_map = {"list": "integration.action.list", "retrieve": "integration.action.read"}
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["source_module", "action_type"]

# ── Procurement ────────────────────────────────────────────────────────────────
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine

class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "company_scope_reference", "buyer_reference",
            "vendor_company_reference", "status",
            "pricing_snapshot_reference", "po_number",
            "currency", "total_amount", "approved_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "approved_at"]

class PurchaseOrderViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    action_capability_map = {
        "list": "procurement.po.list", "retrieve": "procurement.po.read",
        "create": "procurement.po.create", "update": "procurement.po.update",
        "partial_update": "procurement.po.update", "destroy": "procurement.po.manage",
        "approve": "procurement.po.approve",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "vendor_company_reference"]

    def perform_create(self, serializer):
        serializer.save(
            buyer_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id,
        )

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

integration_router = DefaultRouter()
integration_router.register("connections", ExternalConnectionViewSet, basename="ext-connection")
integration_router.register("action-requests", ExternalActionRequestViewSet, basename="action-request")

procurement_router = DefaultRouter()
procurement_router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")

launch_router = DefaultRouter()
launch_router.register("events", LaunchEventViewSet, basename="launch-event")

media_urlpatterns = [path("", include(media_router.urls))]
analytics_urlpatterns = [path("", include(analytics_router.urls))]
integration_urlpatterns = [path("", include(integration_router.urls))]
procurement_urlpatterns = [path("", include(procurement_router.urls))]
launch_urlpatterns = [path("", include(launch_router.urls))]
