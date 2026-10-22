"""Media, Analytics, Integration, Procurement, Launch — API (combined stubs with full serializers)"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from config.pagination import CixciCursorPagination

from apps.tenant.mixins import CheckAccessMixin


def _looks_like_uuid(value):
    import uuid as _uuid
    try:
        _uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _parse_uuid(value):
    import uuid as _uuid
    return _uuid.UUID(str(value))


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

    def validate_alt_text(self, value):
        from apps.media.validation import validate_alt_text
        ok, errors = validate_alt_text(value, required=False)
        if not ok:
            raise serializers.ValidationError(errors)
        return value

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
        "review": "media.asset.manage", "reorder": "media.asset.manage",
        "finalize_upload": "media.asset.upload",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["asset_type", "status", "owner_module", "company_scope_reference"]
    search_fields = ["original_filename"]

    def _is_admin(self):
        user = self.request.user
        return getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )

    def _user_company_id(self, user=None):
        user = user or self.request.user
        if hasattr(user, "entity") and user.entity:
            return getattr(user.entity, "company_id", None)
        return None

    def _user_company_type(self, user=None):
        user = user or self.request.user
        if hasattr(user, "entity") and user.entity and getattr(user.entity, "company", None):
            return user.entity.company.company_type
        return None

    def _assert_can_manage_asset(self, asset):
        """
        Tenant/vendor isolation for write operations (Rule §26, §8, §10).
        Non-admins may only manage assets owned by their own company.
        """
        if self._is_admin():
            return
        company_id = self._user_company_id()
        if not company_id or str(asset.company_scope_reference) != str(company_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You may only manage media belonging to your own company.")

    def _resolve_target_product(self, product_id, vendor_only=True):
        """
        Resolve a product an asset may be attached to, enforcing vendor
        boundaries (Rule §8, §10, §23): a vendor admin can only attach media to
        their own vendor's products; CIXCI admin can attach to any.
        """
        from apps.catalog.models import Product
        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, ValueError, TypeError):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"owner_record_id": "Product not found."})

        if self._is_admin():
            return product

        company_id = self._user_company_id()
        if not company_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No company scope for this user.")
        if str(product.vendor_company_reference) != str(company_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vendors may only upload images for their own SKUs.")
        return product

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

        # Rule §13: an image must be assigned to a valid product, and a vendor
        # may only assign to their own products (§8/§10/§23).
        owner_record_id = serializer.validated_data.get("owner_record_id")
        if owner_record_id:
            self._resolve_target_product(owner_record_id)

        asset = serializer.save(
            company_scope_reference=company_id,
            uploaded_by=self.request.user.id,
        )
        if owner_record_id:
            from apps.media.services import log_media_audit, emit_media_change_events
            log_media_audit(
                event_code="media.asset.attached",
                description=f"Asset {asset.id} attached to product {owner_record_id}",
                asset_id=asset.id,
                company_id=company_id,
                actor_id=self.request.user.id,
            )
            emit_media_change_events(owner_record_id, company_id, actor_id=self.request.user.id,
                                     detail="Media asset attached to product.")

    def perform_update(self, serializer):
        asset = self.get_object()
        self._assert_can_manage_asset(asset)

        # Rule §19: alt-text validation on update.
        if "alt_text" in serializer.validated_data:
            from apps.media.validation import validate_alt_text
            ok, errors = validate_alt_text(serializer.validated_data["alt_text"], required=False)
            if not ok:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"alt_text": errors})

        # Rule §13/§8: re-assignment must target a valid, permitted product.
        new_owner = serializer.validated_data.get("owner_record_id")
        if new_owner and str(new_owner) != str(asset.owner_record_id):
            self._resolve_target_product(new_owner)

        prev_status = asset.status
        prev_alt = asset.alt_text
        updated = serializer.save()

        from apps.media.services import log_media_audit, emit_media_change_events
        if new_owner and str(new_owner) != str(asset.owner_record_id):
            log_media_audit(
                event_code="media.asset.attached",
                description=f"Asset {updated.id} re-attached to product {new_owner}",
                asset_id=updated.id, company_id=updated.company_scope_reference,
                actor_id=self.request.user.id,
            )
        if "alt_text" in serializer.validated_data and (prev_alt or "") != (updated.alt_text or ""):
            log_media_audit(
                event_code="media.asset.alt_text_changed",
                description=f"Alt text changed for asset {updated.id}",
                asset_id=updated.id, company_id=updated.company_scope_reference,
                actor_id=self.request.user.id,
            )
        if prev_status != updated.status:
            log_media_audit(
                event_code="media.asset.status_changed",
                description=f"Asset {updated.id} status {prev_status} -> {updated.status}",
                asset_id=updated.id, company_id=updated.company_scope_reference,
                actor_id=self.request.user.id,
            )
        if updated.owner_record_id and updated.owner_module == "catalog":
            emit_media_change_events(updated.owner_record_id, updated.company_scope_reference,
                                     actor_id=self.request.user.id,
                                     detail="Media asset updated on product.")

    def perform_destroy(self, instance):
        """
        Rule §17: removing the only valid transparent PNG image would leave a
        buyer-facing product without media — block it. Otherwise archive rather
        than hard-delete where history matters.
        """
        self._assert_can_manage_asset(instance)
        from rest_framework.exceptions import ValidationError
        from apps.media.readiness import valid_primary_asset_ids
        from apps.catalog.models import Product

        product = None
        if instance.owner_module == "catalog" and instance.owner_record_id:
            product = Product.objects.filter(id=instance.owner_record_id).first()

        if product:
            valid_ids = valid_primary_asset_ids()
            remaining_valid = (
                MediaAsset.objects.filter(
                    owner_module="catalog",
                    owner_record_id=product.id,
                )
                .exclude(id=instance.id)
                .filter(id__in=list(valid_ids))
                .exists()
            )
            is_primary = str(getattr(product, "primary_image_reference", "")) == str(instance.id)
            if is_primary and not remaining_valid and product.status == "active":
                raise ValidationError({
                    "detail": (
                        "Cannot remove the only valid transparent PNG image of an "
                        "Active product. Upload or approve another transparent PNG "
                        "and mark it Primary first (Rule §17)."
                    )
                })

        from apps.media.services import log_media_audit, emit_media_change_events
        owner_id = instance.owner_record_id
        company_id = instance.company_scope_reference
        asset_id = instance.id
        instance.delete()
        log_media_audit(
            event_code="media.asset.removed",
            description=f"Asset {asset_id} removed",
            asset_id=asset_id, company_id=company_id, actor_id=self.request.user.id,
        )
        if owner_id and product:
            emit_media_change_events(owner_id, company_id, actor_id=self.request.user.id,
                                     detail="Media asset removed from product.")

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
        from apps.media.services import emit_media_event, emit_media_change_events
        emit_media_event(
            "product.media.approved" if decision == "approve" else "product.media.rejected",
            asset.owner_record_id, asset.company_scope_reference, actor_id=request.user.id,
            detail=f"Asset {asset.id} {decision}d.",
        )
        if asset.owner_record_id and asset.owner_module == "catalog":
            emit_media_change_events(asset.owner_record_id, asset.company_scope_reference,
                                     actor_id=request.user.id,
                                     detail="Media review decision changed buyer visibility.")
        return Response(MediaAssetSerializer(asset).data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """
        Reorder images within a product (Rule §20).

        Body: { "product_id": "<uuid>", "ordered_asset_ids": ["<uuid>", ...] }
        Saves display_order (index) for each asset. Audited when the product is
        Active/buyer-visible.
        """
        from rest_framework.exceptions import ValidationError
        from apps.catalog.models import Product
        from apps.media.services import log_media_audit, emit_media_change_events

        product_id = request.data.get("product_id")
        ordered_ids = request.data.get("ordered_asset_ids") or []
        if not product_id or not isinstance(ordered_ids, list):
            raise ValidationError({"detail": "product_id and ordered_asset_ids are required."})

        product = self._resolve_target_product(product_id)

        assets = {
            str(a.id): a
            for a in MediaAsset.objects.filter(
                owner_module="catalog", owner_record_id=product.id, id__in=[
                    _parse_uuid(i) for i in ordered_ids if _looks_like_uuid(i)
                ]
            )
        }
        changed = []
        for idx, aid in enumerate(ordered_ids):
            asset = assets.get(str(aid))
            if asset and asset.display_order != idx:
                asset.display_order = idx
                asset.save(update_fields=["display_order", "updated_at"])
                changed.append(asset)

        if changed:
            log_media_audit(
                event_code="media.asset.reordered",
                description=f"Reordered {len(changed)} image(s) for product {product.id}",
                asset_id=changed[0].id, company_id=product.company_scope_reference,
                actor_id=request.user.id,
            )
            if product.status == "active":
                emit_media_change_events(product.id, product.company_scope_reference,
                                         actor_id=request.user.id,
                                         detail="Image order changed on Active product.")

        return Response({
            "product_id": str(product.id),
            "updated": len(changed),
            "order": [str(a.id) for a in MediaAsset.objects.filter(
                owner_module="catalog", owner_record_id=product.id
            ).order_by("display_order", "created_at")],
        })

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
        owner_module = request.data.get("owner_module", "")
        owner_record_id = request.data.get("owner_record_id") or None

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

        # Rule §10/§13: a single upload must attach to the selected product only.
        # The product is resolved (and vendor-isolation checked) BEFORE the
        # asset is created so the asset is never left orphaned.
        target_product = None
        if owner_record_id:
            target_product = self._resolve_target_product(owner_record_id)
            if target_product.status == "archived":
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    "owner_record_id": (
                        "Images cannot be assigned to an archived product (Rule §13)."
                    )
                })

        from apps.media.validation import extension_of

        asset = MediaAsset.objects.create(
            id=asset_id,
            asset_type=asset_type,
            original_filename=filename,
            file_extension=extension_of(filename),
            mime_type=mime_type,
            company_scope_reference=company_id,
            owner_module=owner_module,
            owner_record_id=target_product.id if target_product else None,
            uploaded_by=request.user.id,
            storage_key=storage_key,
            storage_provider=storage_provider,
            alt_text=(request.data.get("alt_text") or ""),
            is_public=bool(request.data.get("is_public", False)),
        )
        
        if target_product:
            from apps.media.services import log_media_audit, emit_media_change_events
            log_media_audit(
                event_code="media.asset.attached",
                description=f"Asset {asset.id} attached to product {target_product.id}",
                asset_id=asset.id,
                company_id=company_id,
                actor_id=request.user.id,
            )
            emit_media_change_events(target_product.id, company_id, actor_id=request.user.id,
                                     detail="Media asset attached to product.")

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
        self._assert_can_manage_asset(asset)
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)
        
        import os
        from django.conf import settings
        from apps.media import validation
        from apps.media.services import log_media_audit, generate_renditions, emit_media_change_events

        # Resolve company
        company_id = asset.company_scope_reference
        if not company_id:
            if request.user.entity:
                company_id = request.user.entity.company_id
            if not company_id:
                from apps.tenant.models import Company
                company = Company.objects.filter(company_type="cixci_internal").first() or Company.objects.first()
                company_id = company.id if company else None
        if not company_id:
            return Response({"error": "Could not resolve company scope for upload."}, status=400)

        # Rule §10/§26: a vendor may only upload to their own product's asset.
        if asset.owner_module == "catalog" and asset.owner_record_id:
            self._resolve_target_product(asset.owner_record_id)

        # Read file into memory for validation
        data = b""
        for chunk in file_obj.chunks():
            data += chunk
        file_obj.seek(0)

        sanitized_name = validation.sanitize_filename(getattr(file_obj, "name", asset.original_filename))
        payload, status_code = self._finalize_asset_bytes(
            asset=asset,
            data=data,
            filename=sanitized_name,
            mime_hint=file_obj.content_type or asset.mime_type,
            company_id=company_id,
            actor_id=request.user.id,
            confirm_replace=str(request.data.get("confirm_replace", "")).lower() in ("1", "true", "yes"),
            set_as_primary=str(request.data.get("set_as_primary", "")).lower() in ("1", "true", "yes"),
        )
        return Response(payload, status=status_code)

    def _finalize_asset_bytes(
        self,
        asset,
        data,
        filename,
        mime_hint=None,
        company_id=None,
        actor_id=None,
        confirm_replace=False,
        set_as_primary=False,
    ):
        """
        Validate raw image bytes for an asset and finalise it (Rule §15, §20).

        Shared by the direct upload endpoint and the presigned-upload
        finalisation endpoint so both paths apply exactly the same PNG /
        transparency / duplicate / replacement rules.

        Returns (payload, status_code).
        """
        import os
        from django.conf import settings
        from apps.media import validation
        from apps.media.services import log_media_audit, generate_renditions, emit_media_change_events

        v = validation.validate_image_bytes(
            data=data,
            filename=filename,
            asset_type=asset.asset_type or "product_image",
            mime_hint=mime_hint or asset.mime_type,
            company_id=company_id,
        )
        if not v.ok:
            asset.status = "validation_failed"
            asset.review_status = "rejected"
            asset.rejection_reason = v.errors[0] if v.errors else "Validation failed"
            asset.save(update_fields=["status", "review_status", "rejection_reason", "updated_at"])
            log_media_audit(
                event_code="media.asset.validation_failed",
                description=f"Upload validation failed: {asset.rejection_reason}",
                asset_id=asset.id,
                company_id=company_id,
                actor_id=actor_id,
                status="failure",
            )
            from apps.media.services import emit_media_event
            emit_media_event("product.media.failed", asset.owner_record_id, company_id,
                             actor_id=actor_id, status="failure",
                             detail=f"Upload validation failed: {asset.rejection_reason}")
            return ({
                "error": "Image validation failed",
                "details": v.errors,
                "warnings": v.warnings,
            }, 400)

        # Rule §12: hard-block an exact duplicate already attached to the SAME
        # product (same content hash). Cross-product reuse is a warning.
        if v.content_hash and asset.owner_record_id:
            dup_same_product = MediaAsset.objects.filter(
                owner_module=asset.owner_module,
                owner_record_id=asset.owner_record_id,
                content_hash=v.content_hash,
                status="ready",
            ).exclude(id=asset.id).first()
            if dup_same_product:
                return ({
                    "error": "Duplicate image",
                    "details": [
                        "This exact image is already attached to this product "
                        f"(asset {dup_same_product.id})."
                    ],
                }, 400)

        # Rule §16: replacing an image on an Active/buyer-visible product needs
        # explicit confirmation, and the replacement must be a valid PNG.
        is_replacement = asset.status == "ready" and bool(asset.content_hash)
        product = None
        if asset.owner_module == "catalog" and asset.owner_record_id:
            from apps.catalog.models import Product
            product = Product.objects.filter(id=asset.owner_record_id).first()
        if is_replacement and product and product.status == "active" and not confirm_replace:
            return ({
                "error": "Replacing the primary image of an Active product requires confirmation.",
                "requires_confirmation": True,
                "details": [
                    "Re-send the upload with confirm_replace=true. The previous "
                    "image is archived and an audit event is recorded (Rule §16)."
                ],
            }, 409)

        # Rule §16: a NEW image that is meant to become the primary image of a
        # product that already has one is a replacement too — it needs the same
        # confirmation when the product is Active / buyer-visible. The check
        # happens before the file is written so the client can retry the same
        # asset with confirm_replace=true.
        replacing_primary = False
        if set_as_primary and product and product.primary_image_reference:
            replacing_primary = str(product.primary_image_reference) != str(asset.id)
        if replacing_primary and product.status == "active" and not confirm_replace:
            return ({
                "error": "Replacing the primary image of an Active product requires confirmation.",
                "requires_confirmation": True,
                "details": [
                    "Re-send the upload with confirm_replace=true. The previous "
                    "image is archived and an audit event is recorded (Rule §16)."
                ],
            }, 409)

        # Archive previous version (Rule §16) instead of overwriting in place.
        from apps.media.models import MediaAssetVersion, Rendition
        from django.utils import timezone as _tz
        if is_replacement:
            MediaAssetVersion.objects.filter(asset=asset, is_current=True).update(
                is_current=False, superseded_at=_tz.now()
            )

        # Save file to MEDIA_ROOT / asset.storage_key
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'wb+') as destination:
            destination.write(data)
                
        # Update asset metadata
        from apps.media.validation import extension_of
        asset.status = "ready"
        asset.review_status = "approved"
        asset.file_size_bytes = len(data)
        asset.content_hash = v.content_hash
        asset.original_filename = filename
        # Rule §3/§21: the stored extension must be the dot-prefixed ".png"
        # form used by the media readiness gate.
        asset.file_extension = extension_of(filename)
        if asset.file_extension == ".png":
            asset.mime_type = "image/png"
        asset.width = v.width
        asset.height = v.height
        asset.has_transparency = v.has_transparency
        asset.save()
        
        # Create version & variant rendition records
        prev_version = MediaAssetVersion.objects.filter(asset=asset).order_by("-version_number").first()
        next_version = (prev_version.version_number + 1) if prev_version else 1
        MediaAssetVersion.objects.create(
            asset=asset,
            version_number=next_version,
            is_current=True,
            storage_key=asset.storage_key,
            content_hash=asset.content_hash,
            file_size_bytes=asset.file_size_bytes
        )
        Rendition.objects.update_or_create(
            asset=asset,
            rendition_type="original",
            defaults={
                "storage_key": asset.storage_key,
                "file_size_bytes": asset.file_size_bytes,
                "mime_type": asset.mime_type,
                "width": v.width,
                "height": v.height,
                "is_ready": True,
            },
        )
        # Rule §5/§15: generate thumbnails / resized renditions.
        if not generate_renditions(asset):
            asset.status = "processing_failed"
            asset.save(update_fields=["status", "updated_at"])

        log_media_audit(
            event_code="media.asset.replaced" if is_replacement else "media.asset.uploaded",
            description=f"Asset {asset.id} {'replaced' if is_replacement else 'uploaded'} (single)",
            asset_id=asset.id,
            company_id=company_id,
            actor_id=actor_id,
        )
        if asset.owner_record_id and asset.owner_module == "catalog":
            emit_media_change_events(asset.owner_record_id, company_id, actor_id=actor_id,
                                     detail="Product image uploaded/replaced.")
            # Rule §2/§13: the uploaded asset becomes the product's primary
            # image when the product does not have one yet, and a product that
            # was staged for missing media is reconciled afterwards.
            self._link_primary_and_reconcile(
                asset, company_id, actor_id, set_as_primary=set_as_primary
            )
        return (MediaAssetSerializer(asset).data, 200)

    @action(detail=True, methods=["post"])
    def finalize_upload(self, request, pk=None):
        """
        Finalise an asset that was uploaded through a presigned URL.

        The stored object is read back and validated with exactly the same
        rules as the direct upload path (PNG only, true transparency, size /
        dimension limits, duplicate detection) before the asset is allowed to
        become Ready / Approved (Rule §15, §20).
        """
        import os
        from django.conf import settings

        asset = self.get_object()
        self._assert_can_manage_asset(asset)

        company_id = asset.company_scope_reference
        if not company_id:
            return Response({"error": "Could not resolve company scope for upload."}, status=400)

        if asset.owner_module == "catalog" and asset.owner_record_id:
            self._resolve_target_product(asset.owner_record_id)

        data = None
        try:
            provider = (asset.storage_provider or "local").lower()
            if provider == "gcs":
                bucket_name = getattr(settings, "GS_BUCKET_NAME", None)
                if not bucket_name:
                    raise ValueError("GS_BUCKET_NAME not configured")
                client = get_gcs_client()
                blob = client.bucket(bucket_name).blob(asset.storage_key)
                data = blob.download_as_bytes()
            elif provider == "s3":
                import boto3
                s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
                    endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None),
                )
                obj = s3_client.get_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=asset.storage_key
                )
                data = obj["Body"].read()
            else:
                full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
                if os.path.exists(full_path):
                    with open(full_path, "rb") as fh:
                        data = fh.read()
        except Exception as exc:
            return Response({
                "error": "Could not read the uploaded object from storage.",
                "details": [str(exc)],
            }, status=400)

        if not data:
            return Response({
                "error": "No uploaded object found for this asset.",
                "details": [
                    "Upload the file with the presigned URL before finalising the asset."
                ],
            }, status=400)

        from apps.media import validation
        filename = validation.sanitize_filename(asset.original_filename or "upload.png")
        payload, status_code = self._finalize_asset_bytes(
            asset=asset,
            data=data,
            filename=filename,
            mime_hint=asset.mime_type,
            company_id=company_id,
            actor_id=request.user.id,
            confirm_replace=str(request.data.get("confirm_replace", "")).lower() in ("1", "true", "yes"),
            set_as_primary=str(request.data.get("set_as_primary", "")).lower() in ("1", "true", "yes"),
        )
        return Response(payload, status=status_code)

    def _link_primary_and_reconcile(self, asset, company_id, actor_id, set_as_primary=False):
        """
        Attach a freshly uploaded asset to its product as the primary image
        and re-evaluate the product's media readiness / activation state.

        When the product has no primary image yet, the uploaded asset becomes
        the primary one. When the upload was explicitly flagged as a primary
        replacement (``set_as_primary``) the previous primary image is
        archived — never hard-deleted (Rule §16) — and the replacement is
        recorded in the audit log.

        Returns a dict describing what happened (used by the upload endpoints
        to report per-product outcomes).
        """
        from apps.catalog.models import Product
        from apps.media.models import MediaAsset
        from apps.media.readiness import compute_media_readiness
        from apps.media.services import log_media_audit

        outcome = {
            "product_id": str(asset.owner_record_id),
            "primary_set": False,
            "primary_replaced": False,
            "activated": False,
            "status": None,
            "reason": None,
        }

        product = Product.objects.filter(id=asset.owner_record_id).first()
        if not product:
            return outcome

        current_primary_id = product.primary_image_reference
        is_new_primary = (
            not current_primary_id
            or (set_as_primary and str(current_primary_id) != str(asset.id))
        )

        if is_new_primary:
            previous_asset = None
            if current_primary_id:
                previous_asset = MediaAsset.objects.filter(id=current_primary_id).first()
            product.primary_image_reference = asset.id
            try:
                product.save(actor_id=actor_id)
                outcome["primary_set"] = True
                outcome["primary_replaced"] = bool(previous_asset)
                log_media_audit(
                    event_code="media.asset.primary_set",
                    description=f"Asset {asset.id} set as primary image of product {product.id}",
                    asset_id=asset.id,
                    company_id=company_id,
                    actor_id=actor_id,
                )
                if previous_asset:
                    # Rule §16: the previous image is archived, not deleted.
                    previous_asset.status = "archived"
                    previous_asset.save(update_fields=["status", "updated_at"])
                    log_media_audit(
                        event_code="media.asset.replaced",
                        description=(
                            f"Asset {previous_asset.id} archived and replaced by "
                            f"asset {asset.id} on product {product.id}"
                        ),
                        asset_id=previous_asset.id,
                        company_id=company_id,
                        actor_id=actor_id,
                    )
            except Exception:
                pass

        readiness = compute_media_readiness(product)
        outcome["media_ready"] = readiness.is_ready
        outcome["media_reason"] = readiness.reason

        if readiness.is_ready:
            from apps.catalog.services import reconcile_product_activation
            result = reconcile_product_activation(
                product, actor_id=actor_id, source="media_upload"
            )
            outcome["activated"] = bool(result.get("activated"))
            outcome["status"] = result.get("status")
            outcome["reason"] = result.get("reason")

        product.refresh_from_db()
        outcome["status"] = outcome["status"] or product.status
        return outcome

    @action(detail=False, methods=["post"])
    def upload_zip(self, request):
        """
        Bulk ZIP image upload with validation and SKU matching.
        POST /media/assets/upload_zip/
        Accepts: multipart file (zip), optional company_scope_reference
        Returns: upload summary with per-file results and SKU match status.

        Enforces Rule §7 (filename patterns), §8 (SKU/vendor matching),
        §9 (ZIP validation), §12 (duplicates), §26 (vendor isolation).
        """
        import os
        import uuid
        from django.conf import settings
        from apps.media import validation
        from apps.media.matching import match_product
        from apps.media.services import log_media_audit, generate_renditions, emit_media_change_events
        from apps.media.models import MediaAsset, MediaAssetVersion, Rendition

        zip_file = request.FILES.get("file")
        if not zip_file:
            return Response({"error": "No ZIP file uploaded"}, status=400)

        # Resolve company scope
        company_id = None
        user_company_type = self._user_company_type()
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
        duplicate_count = 0
        wrong_vendor_count = 0
        products_updated = set()
        products_now_ready = set()
        products_media_incomplete = set()
        products_activated = set()
        # Newly created asset per product, used to replace a legacy primary
        # image that does not satisfy the buyer media gate.
        created_asset_by_product = {}

        # Build SKU lookup. Rule §8: vendor admins may only match their own
        # SKUs; CIXCI admins may match across vendors. When the same SKU exists
        # for multiple vendors, Vendor+SKU filename form is required.
        from apps.catalog.models import Product
        is_admin = self._is_admin()
        # Rule §8: bulk images must match an existing product SKU. The match is
        # NOT restricted to Active products — a product that was staged as
        # media-incomplete (Inactive) or is still a Draft must be able to
        # receive its images. Rule §13 forbids attaching to archived products.
        product_qs = Product.objects.exclude(
            status__in=("archived", "eol")
        ).only(
            "id", "sku", "vendor_company_reference", "primary_image_reference", "status"
        )
        if not is_admin and user_company_type == "vendor":
            product_qs = product_qs.filter(vendor_company_reference=company_id)

        sku_map = {}
        vendor_map = {}
        from apps.tenant.models import Company
        vendor_names = {
            str(c.id): c.name for c in Company.objects.filter(
                id__in=set(str(p.vendor_company_reference) for p in product_qs)
            )
        }
        for p in product_qs:
            if p.sku:
                sku_map.setdefault(p.sku.strip().upper(), p)
                vname = (vendor_names.get(str(p.vendor_company_reference)) or "").upper()
                vendor_map[(vname, p.sku.strip().upper())] = p

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

            # Match SKU using the filename-pattern matcher (Rule §7/§8)
            fname = entry.get("filename") or entry.get("source_name", "")
            product, _key = match_product(fname, sku_map, vendor_map)

            if not product:
                unmatched_count += 1
                results.append({
                    "filename": fname,
                    "status": "unmatched",
                    "reason": "No product found with a matching SKU (or filename pattern).",
                    "matched": False,
                    "product_sku": None,
                    "product_id": None,
                })
                continue

            # Rule §8/§26: never attach to another vendor's SKU.
            if not is_admin and str(product.vendor_company_reference) != str(company_id):
                wrong_vendor_count += 1
                results.append({
                    "filename": fname,
                    "status": "failed",
                    "reason": "Image does not belong to your vendor's SKU.",
                    "matched": False,
                    "product_sku": product.sku,
                    "product_id": str(product.id),
                })
                continue

            # Rule §12: block an exact duplicate on the same product.
            if entry.get("content_hash") and MediaAsset.objects.filter(
                owner_module="catalog", owner_record_id=product.id,
                content_hash=entry["content_hash"], status="ready",
            ).exists():
                duplicate_count += 1
                # Still reconcile the product: the image was already attached in
                # an earlier upload, and that upload may have failed to activate
                # the product. This makes a re-upload an idempotent repair.
                products_updated.add(str(product.id))
                results.append({
                    "filename": fname,
                    "status": "failed",
                    "reason": "Duplicate image already attached to this product.",
                    "matched": True,
                    "product_sku": product.sku,
                    "product_id": str(product.id),
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
            Rendition.objects.update_or_create(
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
            # Rule §5/§15: generate thumbnails / resized renditions.
            generate_renditions(asset)

            created_count += 1
            products_updated.add(str(product.id))
            created_asset_by_product[str(product.id)] = asset
            results.append({
                "filename": fname,
                "status": "created",
                "reason": "Image validated, saved, and linked to product.",
                "matched": True,
                "product_sku": product.sku,
                "product_id": str(product.id),
            })
            log_media_audit(
                event_code="media.asset.created_from_zip",
                description=f"Created asset from ZIP, linked to {product.sku}",
                asset_id=asset.id,
                company_id=company_id,
                actor_id=request.user.id,
            )

        # Link created assets to products (primary if none)
        for pid in list(products_updated):
            try:
                product = Product.objects.get(id=pid)
                new_asset = created_asset_by_product.get(pid)
                current_primary = None
                if product.primary_image_reference:
                    current_primary = MediaAsset.objects.filter(
                        id=product.primary_image_reference
                    ).first()
                primary_is_valid = bool(
                    current_primary
                    and current_primary.status == "ready"
                    and current_primary.mime_type == "image/png"
                    and current_primary.has_transparency
                    and current_primary.review_status == "approved"
                )
                # Attach a primary image, or replace a legacy primary (for
                # example a JPEG) that the buyer media gate would hide.
                if new_asset is not None and not primary_is_valid:
                    product.primary_image_reference = new_asset.id
                    product.save(actor_id=request.user.id)
                elif not product.primary_image_reference:
                    assets = MediaAsset.objects.filter(
                        owner_record_id=product.id, owner_module="catalog"
                    ).order_by("display_order", "created_at")
                    if assets.exists():
                        product.primary_image_reference = assets.first().id
                        product.save(actor_id=request.user.id)
                from apps.media.readiness import compute_media_readiness
                if compute_media_readiness(product).is_ready:
                    products_now_ready.add(pid)
                    # A product that was staged for missing media can now be
                    # reconciled towards Active (Rule §21/§31 gate satisfied).
                    from apps.catalog.services import reconcile_product_activation
                    recon = reconcile_product_activation(
                        product, actor_id=request.user.id, source="media_bulk_upload"
                    )
                    if recon.get("activated"):
                        products_activated.add(pid)
                else:
                    products_media_incomplete.add(pid)
                emit_media_change_events(product.id, company_id, actor_id=request.user.id,
                                         detail="Bulk ZIP images attached to product.")
            except Exception:
                pass

        log_media_audit(
            event_code="media.zip.completed",
            description=(
                f"ZIP processed: {matched_count} matched, {unmatched_count} unmatched, "
                f"{failed_count} failed, {created_count} created, {duplicate_count} duplicates"
            ),
            asset_id=None,
            company_id=company_id,
            actor_id=request.user.id,
        )

        summary = dict(arch["summary"])
        summary.update({
            "matched": matched_count,
            "unmatched": unmatched_count,
            "failed": failed_count,
            "created": created_count,
            "duplicates": duplicate_count + summary.get("duplicates", 0),
            "wrong_vendor": wrong_vendor_count,
            "products_updated": len(products_updated),
            "products_now_media_ready": len(products_now_ready),
            "products_still_media_incomplete": len(products_media_incomplete),
            "products_now_active": len(products_activated),
        })

        return Response({
            "total_files": arch["summary"]["total_files"],
            "matched": matched_count,
            "unmatched": unmatched_count,
            "failed": failed_count,
            "created": created_count,
            "duplicates": summary["duplicates"],
            "wrong_vendor": wrong_vendor_count,
            "products_updated": len(products_updated),
            "products_now_media_ready": len(products_now_ready),
            "products_still_media_incomplete": len(products_media_incomplete),
            "products_now_active": len(products_activated),
            "summary": summary,
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
