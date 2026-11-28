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


DOWNLOAD_WORKERS = 8


def image_candidates(image_urls):
    """The URLs process_vendor_product_images will try, in order."""
    return [url.strip() for url in (image_urls or [])[:6] if isinstance(url, str) and url.strip()]


def prefetch_vendor_images(urls, workers=DOWNLOAD_WORKERS):
    """Download distinct URLs concurrently; network only, no database access.

    Returns {url: (data, filename, mime_type) or the raised Exception}.
    """
    from concurrent.futures import ThreadPoolExecutor

    urls = list(dict.fromkeys(urls))
    if not urls:
        return {}

    def fetch(url):
        try:
            return download_vendor_image(url)
        except Exception as exc:
            return exc

    with ThreadPoolExecutor(max_workers=max(1, min(workers, len(urls)))) as pool:
        return dict(zip(urls, pool.map(fetch, urls)))


def _cloud_storage():
    """Same switch the image proxy uses to decide where a stored file is read from."""
    return bool(getattr(settings, "USE_S3", False) or getattr(settings, "USE_GCS", False))


def file_is_stored(storage_key):
    if not storage_key:
        return False
    if _cloud_storage():
        from django.core.files.storage import default_storage
        return default_storage.exists(storage_key)
    return os.path.isfile(os.path.join(getattr(settings, "MEDIA_ROOT", "") or "", storage_key))


def store_file(storage_key, data):
    """Write image bytes where the proxy will read them. Returns the stored key, or '' on failure."""
    try:
        if _cloud_storage():
            from django.core.files.base import ContentFile
            from django.core.files.storage import default_storage
            return default_storage.save(storage_key, ContentFile(data))
        media_root = getattr(settings, "MEDIA_ROOT", "")
        if not media_root:
            return ""
        full_path = os.path.join(media_root, storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as dest:
            dest.write(data)
        return storage_key
    except Exception as exc:
        logger.warning("Failed to store vendor image %s: %s", storage_key, exc)
        return ""


def create_vendor_media_asset(product_id, image_url, vendor_company_id, actor_id, fetched=None):
    """Download a vendor image and create a MediaAsset linked to the product.

    ``fetched`` is an optional prefetch_vendor_images result for this URL.
    Returns the asset UUID on success, None on failure.
    """
    from apps.media.models import MediaAsset, AssetType, AssetStatus

    try:
        result = fetched.get(image_url) if fetched else None
        if isinstance(result, Exception):
            raise result
        data, filename, mime_type = result or download_vendor_image(image_url)
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
        # A record without its file shows a broken image; put the file back.
        if not file_is_stored(existing.storage_key):
            stored_key = store_file(existing.storage_key, data)
            if not stored_key:
                return None
            if stored_key != existing.storage_key:
                MediaAsset.objects.filter(pk=existing.pk).update(storage_key=stored_key)
        return existing.id

    asset_id = uuid.uuid4()
    ext = os.path.splitext(filename)[1] or ".jpg"
    storage_key = store_file(f"{vendor_company_id}/product_image/{asset_id}/{filename}", data)
    if not storage_key:
        # No asset is recorded for a file that was not stored; the retry picks it up.
        return None

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


def primary_file_missing(product):
    """True when the product's primary image record has no file (checked on local storage only).

    Cloud storage is not probed per product: that would be one network call for
    every product on every sync.
    """
    if _cloud_storage() or not product.primary_image_reference:
        return False
    from apps.media.models import MediaAsset
    key = MediaAsset.objects.filter(pk=product.primary_image_reference).values_list("storage_key", flat=True).first()
    return key is not None and not file_is_stored(key)


def process_vendor_product_images(product, image_urls, vendor_company_id, actor_id, fetched=None):
    """Process image URLs for a vendor-sourced product.

    Downloads the first valid image, creates a MediaAsset, and sets
    primary_image_reference on the product.  Returns True if an image
    was successfully linked.
    """
    from apps.media.utils import media_short_url

    if not image_urls or not isinstance(image_urls, list):
        return False

    if product.primary_image_reference and not primary_file_missing(product):
        return True

    media_refs = []
    primary_id = None

    for url in image_candidates(image_urls):
        extra = {"fetched": fetched} if fetched else {}
        asset_id = create_vendor_media_asset(
            product.id, url, vendor_company_id, actor_id, **extra,
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
