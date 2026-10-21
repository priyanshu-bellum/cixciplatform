"""Media services — audit helper + shared utilities."""
import logging
import os

logger = logging.getLogger(__name__)

# Thumbnail / resized renditions generated for every valid product image
# (Rule §5: "the platform should generate thumbnails or resized versions").
RENDITION_SPECS = [
    ("thumbnail_200", 200),
    ("web_800", 800),
    ("large_1600", 1600),
]


def generate_renditions(asset):
    """
    Generate thumbnail / resized renditions for a validated image asset.

    Best-effort: a rendition failure marks the asset Processing Failed and
    returns False, but never raises (Rule §15). Returns True when the original
    is usable (renditions optional).
    """
    from apps.media.models import Rendition
    from django.conf import settings

    if asset.asset_type not in ("product_image", "device_image", "brand_logo"):
        return True

    storage_key = asset.storage_key
    if not storage_key:
        return True

    source_path = os.path.join(settings.MEDIA_ROOT, storage_key)
    if not os.path.exists(source_path):
        # Nothing to render (e.g. remote storage) — not a failure.
        return True

    try:
        from PIL import Image

        with Image.open(source_path) as img:
            base_w, base_h = img.size
            base_stem, _ = os.path.splitext(storage_key)
            for rendition_type, target in RENDITION_SPECS:
                # Never upscale
                if base_w <= target and base_h <= target:
                    continue
                ratio = target / float(max(base_w, base_h))
                new_size = (max(1, int(base_w * ratio)), max(1, int(base_h * ratio)))
                resized = img.resize(new_size, Image.LANCZOS)
                rend_key = f"{base_stem}_{rendition_type}.png"
                rend_path = os.path.join(settings.MEDIA_ROOT, rend_key)
                os.makedirs(os.path.dirname(rend_path), exist_ok=True)
                resized.save(rend_path, format="PNG")
                Rendition.objects.update_or_create(
                    asset=asset,
                    rendition_type=rendition_type,
                    defaults={
                        "storage_key": rend_key,
                        "width": new_size[0],
                        "height": new_size[1],
                        "file_size_bytes": os.path.getsize(rend_path),
                        "mime_type": "image/png",
                        "is_ready": True,
                    },
                )
    except Exception as exc:
        logger.error("Rendition generation failed for asset %s: %s", asset.id, exc)
        return False

    return True


def log_media_audit(event_code, description, asset_id, company_id=None, actor_id=None, status="success"):
    """Append-only audit record for media lifecycle actions (Rule §28)."""
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        import uuid

        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        s_id = asset_id.id if hasattr(asset_id, "id") else asset_id

        if company_id is None:
            company_id = "00000000-0000-0000-0000-000000000000"
        if s_id is not None:
            s_id = uuid.UUID(str(s_id))

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status=status,
            actor_reference=a_id,
            company_scope_reference=company_id,
            source_module="media",
            source_record_type="MediaAsset",
            source_record_id=s_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as exc:
        logger.error("Failed to log media audit record for %s: %s", event_code, exc)


# ── Downstream events (Rule §30) ─────────────────────────────────────────────
# Recommended events: product.media.changed, product.media.failed,
# product.media.approved, product.media.rejected, catalog.visibility.changed,
# catalog.export.required. These are emitted as tenant-scoped, append-only
# audit observations so downstream consumers can react to media changes that
# affect buyer visibility or export readiness.
DOWNSTREAM_EVENTS = {
    "product.media.changed",
    "product.media.failed",
    "product.media.approved",
    "product.media.rejected",
    "catalog.visibility.changed",
    "catalog.export.required",
}


def emit_media_event(event_code, product_id, company_id, actor_id=None, status="success", detail=""):
    """
    Emit a downstream media/catalog event (Rule §30).

    Records a tenant-scoped AuditRecord. ``catalog.visibility.changed`` is
    emitted whenever a media change can affect buyer visibility;
    ``catalog.export.required`` when it can affect buyer export readiness.
    """
    if event_code not in DOWNSTREAM_EVENTS:
        logger.warning("Unknown downstream media event '%s'", event_code)
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        import uuid

        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        p_id = product_id
        if p_id is not None:
            p_id = uuid.UUID(str(p_id))

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=detail or f"Media event {event_code}",
            status=status,
            actor_reference=a_id,
            company_scope_reference=company_id,
            source_module="catalog" if event_code.startswith("catalog.") else "media",
            source_record_type="Product",
            source_record_id=p_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as exc:
        logger.error("Failed to emit media event %s: %s", event_code, exc)


def emit_media_change_events(product_id, company_id, actor_id=None, changed_visibility=True, changed_export=True, detail=""):
    """
    Convenience: emit the catalog-level downstream events implied by a media
    change on a product. Callers that know whether visibility/export actually
    changed can pass the flags.
    """
    if changed_visibility:
        emit_media_event(
            "catalog.visibility.changed", product_id, company_id,
            actor_id=actor_id, detail=detail or "Media changed; buyer visibility re-evaluated.",
        )
    if changed_export:
        emit_media_event(
            "catalog.export.required", product_id, company_id,
            actor_id=actor_id, detail=detail or "Media changed; buyer export refresh required.",
        )
