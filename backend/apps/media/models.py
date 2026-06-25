"""
Media & Image Asset Management — Models

Architecture rules:
- Media owns asset metadata, renditions, processing state, storage path metadata
- Device Catalog owns DeviceImageReadinessReference (a reference into Media — not a copy)
- Integration Management tracks storage provider connections; Media owns asset IDs
- Storage provider paths/objects MUST NOT become CIXCI source-of-truth identifiers
"""
import uuid
from django.db import models
from django.utils import timezone


class AssetStatus(models.TextChoices):
    UPLOAD_PENDING = "upload_pending", "Upload Pending"
    UPLOADING = "uploading", "Uploading"
    VALIDATING = "validating", "Validating"
    VALIDATION_FAILED = "validation_failed", "Validation Failed"
    PROCESSING = "processing", "Processing"
    PROCESSING_FAILED = "processing_failed", "Processing Failed"
    READY = "ready", "Ready"
    RESTRICTED = "restricted", "Restricted"
    REVOKED = "revoked", "Revoked"
    EXPIRED = "expired", "Expired"
    SUPERSEDED = "superseded", "Superseded"


class AssetType(models.TextChoices):
    PRODUCT_IMAGE = "product_image", "Product Image"
    DEVICE_IMAGE = "device_image", "Device Image"
    BRAND_LOGO = "brand_logo", "Brand Logo"
    DOCUMENT = "document", "Document"
    VIDEO = "video", "Video (placeholder)"
    OTHER = "other", "Other"


# ─── Media Asset ──────────────────────────────────────────────────────────────

class MediaAsset(models.Model):
    """
    Canonical media asset record. Owns the asset identity and metadata.
    Storage path is a reference — not the source-of-truth identifier.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset_type = models.CharField(max_length=30, choices=AssetType.choices)
    status = models.CharField(max_length=30, choices=AssetStatus.choices, default=AssetStatus.UPLOAD_PENDING)

    # Ownership scope
    owner_module = models.CharField(max_length=100, help_text="Which module owns this asset (e.g. catalog, devices)")
    owner_record_id = models.UUIDField(null=True, blank=True, help_text="ID of owning record (Product, Device, etc.)")
    company_scope_reference = models.UUIDField(db_index=True)

    # File identity
    original_filename = models.CharField(max_length=500)
    file_extension = models.CharField(max_length=20)
    mime_type = models.CharField(max_length=100)
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)

    # Storage reference (NOT the source-of-truth identifier)
    storage_key = models.CharField(max_length=1000, blank=True, help_text="S3/R2 object key")
    storage_provider = models.CharField(max_length=50, default="s3")

    # Content hash for integrity
    content_hash = models.CharField(max_length=512, blank=True)

    # Access policy
    is_public = models.BooleanField(default=False)
    access_policy = models.JSONField(default=dict)

    # Audit
    uploaded_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "media_asset"
        indexes = [
            models.Index(fields=["owner_module", "owner_record_id"]),
            models.Index(fields=["company_scope_reference", "asset_type", "status"]),
        ]

    def __str__(self):
        return f"{self.asset_type}:{self.original_filename} ({self.status})"


# ─── Media Asset Version ──────────────────────────────────────────────────────

class MediaAssetVersion(models.Model):
    """
    Immutable version record for a MediaAsset.
    Re-processing or re-upload creates a new version; prior becomes superseded.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="versions")
    version_number = models.PositiveIntegerField()
    is_current = models.BooleanField(default=True)
    storage_key = models.CharField(max_length=1000)
    content_hash = models.CharField(max_length=512)
    file_size_bytes = models.PositiveBigIntegerField()
    superseded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "media_asset_version"
        unique_together = [("asset", "version_number")]
        ordering = ["-version_number"]


# ─── Rendition ────────────────────────────────────────────────────────────────

class Rendition(models.Model):
    """
    Processed variant of a MediaAsset (thumbnail, resized, webp-converted, etc.).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="renditions")
    rendition_type = models.CharField(max_length=50, help_text="e.g. thumbnail_200, webp_800, original")
    storage_key = models.CharField(max_length=1000)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100)
    is_ready = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "media_rendition"
        unique_together = [("asset", "rendition_type")]


# ─── Upload Session ───────────────────────────────────────────────────────────

class UploadSessionStatus(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    UPLOADING = "uploading", "Uploading"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    EXPIRED = "expired", "Expired"


class UploadSession(models.Model):
    """
    Tracks a file upload session. Used for presigned URL uploads to S3/R2.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="upload_sessions", null=True, blank=True)
    status = models.CharField(max_length=20, choices=UploadSessionStatus.choices, default=UploadSessionStatus.INITIATED)
    presigned_url = models.URLField(max_length=2000, blank=True)
    expected_filename = models.CharField(max_length=500)
    expected_mime_type = models.CharField(max_length=100)
    expires_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.UUIDField()
    company_scope_reference = models.UUIDField(db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "media_upload_session"
