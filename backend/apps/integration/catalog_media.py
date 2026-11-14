"""Vendor catalog image processing — downloads vendor images and creates MediaAssets.

Vendor API images bypass the strict PNG-transparency rule (Rule §11) because
vendors control their own image format.  The asset is stored as-is (JPEG/PNG)
and marked vendor_sourced so downstream rules can distinguish the origin.
"""
import hashlib
import os
import uuid
import urllib.request
import urllib.parse
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
DOWNLOAD_TIMEOUT = 15
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}
MIME_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _sniff_mime(head: bytes) -> str:
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:4] == b"RIFF" and len(head) >= 12 and head[8:12] == b"WEBP":
        return "image/webp"
    return "application/octet-stream"


def download_vendor_image(url, timeout=DOWNLOAD_TIMEOUT):
    """Download image from vendor URL.

    Returns (data, filename, mime_type) or raises on failure.
    """
    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme not in ("https", "http"):
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")

    filename = os.path.basename(parsed.path) or "vendor_image"
    if "?" in filename:
        filename = filename.split("?")[0]

    req = urllib.request.Request(url, headers={"User-Agent": "CIXCI-VendorCatalog/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read(MAX_IMAGE_BYTES + 1)

    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError(f"Image exceeds {MAX_IMAGE_BYTES // (1024*1024)} MB limit")

    mime = _sniff_mime(data[:16])
    if mime not in ALLOWED_MIMES:
        raise ValueError(f"Unsupported image format: {mime}")

    ext = MIME_EXT.get(mime, os.path.splitext(filename)[1] or ".jpg")
    if not filename.lower().endswith(ext):
        filename = os.path.splitext(filename)[0] + ext

    return data, filename, mime


def create_vendor_media_asset(product_id, image_url, vendor_company_id, actor_id):
    """Download a vendor image and create a MediaAsset linked to the product.

    Returns the asset UUID on success, None on failure.
    """
    from apps.media.models import MediaAsset, AssetType, AssetStatus

    try:
        data, filename, mime_type = download_vendor_image(image_url)
    except Exception as exc:
        logger.warning("Vendor image download failed for product %s: %s", product_id, exc)
        return None

    content_hash = hashlib.sha256(data).hexdigest()

    existing = MediaAsset.objects.filter(
        content_hash=content_hash,
        owner_record_id=product_id,
        company_scope_reference=vendor_company_id,
    ).first()
    if existing:
        return existing.id

    asset_id = uuid.uuid4()
    ext = os.path.splitext(filename)[1] or ".jpg"
    storage_key = f"{vendor_company_id}/product_image/{asset_id}/{filename}"

    media_root = getattr(settings, "MEDIA_ROOT", "")
    if media_root:
        full_path = os.path.join(media_root, storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        try:
            with open(full_path, "wb") as dest:
                dest.write(data)
        except Exception as exc:
            logger.warning("Failed to write vendor image to disk: %s", exc)

    try:
        from PIL import Image
        from io import BytesIO
        img = Image.open(BytesIO(data))
        width, height = img.size
    except Exception:
        width, height = None, None

    MediaAsset.objects.create(
        id=asset_id,
        asset_type=AssetType.PRODUCT_IMAGE,
        status=AssetStatus.READY,
        review_status="approved",
        owner_module="catalog",
        owner_record_id=product_id,
        company_scope_reference=vendor_company_id,
        original_filename=filename,
        file_extension=ext,
        mime_type=mime_type,
        file_size_bytes=len(data),
        content_hash=content_hash,
        width=width,
        height=height,
        has_transparency=False,
        storage_key=storage_key,
        is_public=True,
        uploaded_by=actor_id,
    )
    return asset_id


def process_vendor_product_images(product, image_urls, vendor_company_id, actor_id):
    """Process image URLs for a vendor-sourced product.

    Downloads the first valid image, creates a MediaAsset, and sets
    primary_image_reference on the product.  Returns True if an image
    was successfully linked.
    """
    from apps.media.utils import media_short_url

    if not image_urls or not isinstance(image_urls, list):
        return False

    if product.primary_image_reference:
        return True

    media_refs = []
    primary_id = None

    for url in image_urls[:3]:
        if not isinstance(url, str) or not url.strip():
            continue
        asset_id = create_vendor_media_asset(
            product.id, url.strip(), vendor_company_id, actor_id,
        )
        if asset_id:
            media_refs.append(media_short_url(asset_id))
            if primary_id is None:
                primary_id = asset_id

    if primary_id:
        product.primary_image_reference = primary_id
        if media_refs:
            existing = product.media_references or []
            product.media_references = existing + media_refs
        from apps.catalog.models import Product
        Product.objects.filter(pk=product.pk).update(
            primary_image_reference=primary_id,
            media_references=product.media_references,
        )
        return True

    return False
