"""
Media readiness service.

Implements the platform rule: a product cannot become Active / buyer-facing /
downloadable / exportable / orderable until it has at least one valid,
transparent PNG assigned with a primary image.

Readiness is computed from MediaAsset state; it is never stored on the
product row (so it can never drift from the underlying assets).
"""
from dataclasses import dataclass, field

from django.db.models import Q


@dataclass
class MediaReadiness:
    is_ready: bool = False
    has_primary: bool = False
    primary_is_valid: bool = False
    valid_image_count: int = 0
    reason: str = ""
    primary_url: str | None = None
    issues: list = field(default_factory=list)


def _media_url(storage_key: str) -> str:
    from django.conf import settings
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    return f"{media_url}{storage_key}"


def compute_media_readiness(product) -> MediaReadiness:
    """
    Evaluate whether a product satisfies the media readiness rule.

    Rules (from the Media Validation Rules doc):
    - at least one assigned image
    - a primary image must be designated
    - the primary must be a Ready, transparent PNG
    - only one primary (structural — single field)
    """
    from apps.media.models import MediaAsset

    readiness = MediaReadiness()

    # All assets linked to this product
    scope = Q(owner_record_id=product.id, owner_module="catalog")
    if getattr(product, "primary_image_reference", None):
        scope |= Q(id=product.primary_image_reference)
    assets = list(
        MediaAsset.objects.filter(scope).only(
            "id", "status", "review_status", "file_extension", "mime_type",
            "has_transparency", "storage_key", "width", "height",
        )
    )

    if not assets:
        readiness.reason = "No images assigned to this product."
        readiness.issues.append("assign_at_least_one_transparent_png")
        return readiness

    valid_images = [
        a for a in assets
        if a.status == "ready" and getattr(a, "review_status", "approved") == "approved"
    ]
    readiness.valid_image_count = len(valid_images)

    if not valid_images:
        readiness.reason = "Assigned images are not Ready and approved."
        readiness.issues.append("no_ready_approved_image")
        return readiness

    primary_id = product.primary_image_reference
    if not primary_id:
        readiness.reason = "No primary image designated."
        readiness.has_primary = False
        readiness.issues.append("set_a_primary_image")
        return readiness

    readiness.has_primary = True
    primary = next((a for a in valid_images if str(a.id) == str(primary_id)), None)

    if primary is None:
        readiness.reason = "Designated primary image is missing or not Ready/approved."
        readiness.issues.append("primary_not_ready")
        return readiness

    # Primary must be a transparent PNG (Rule §3). Legacy assets may store the
    # extension without the leading dot ("png"), so normalise before comparing.
    primary_ext = (getattr(primary, "file_extension", "") or "").strip().lower().lstrip(".")
    primary_mime = (getattr(primary, "mime_type", "") or "").strip().lower()
    if primary_ext != "png" or primary_mime != "image/png":
        readiness.reason = "Primary image is not a PNG."
        readiness.issues.append("primary_not_png")
        return readiness

    if not getattr(primary, "has_transparency", False):
        readiness.reason = "Primary image has no transparent background."
        readiness.issues.append("primary_not_transparent")
        return readiness

    readiness.primary_is_valid = True
    readiness.is_ready = True
    readiness.primary_url = _media_url(primary.storage_key)
    return readiness


def assert_can_become_active(product, raise_error=True):
    """
    Guard used on product create/update: block activation without media.

    Returns None when allowed; raises ValidationError when blocked.
    """
    readiness = compute_media_readiness(product)
    if readiness.is_ready:
        return None

    if not raise_error:
        return readiness

    from rest_framework.exceptions import ValidationError
    raise ValidationError({
        "status": (
            "A product cannot become Active without a valid, transparent PNG "
            f"primary image. Issues: {', '.join(readiness.issues) or 'media incomplete'}."
        ),
        "media_readiness": {
            "is_ready": False,
            "issues": readiness.issues,
            "reason": readiness.reason,
        },
    })


# Asset statuses that must never be buyer-facing / exportable (Rule §14, §24, §25)
NON_BUYER_FACING_STATUSES = {
    "validation_failed", "processing_failed", "rejected", "archived",
    "revoked", "superseded", "expired", "restricted",
}


def valid_primary_asset_ids():
    """
    Set of MediaAsset IDs that satisfy the export/visibility image rule:
    Ready + approved + PNG MIME + real transparency, and not in a
    non-buyer-facing status.

    Returned as a Python set so callers can reuse across many lookups.
    """
    from apps.media.models import MediaAsset

    qs = MediaAsset.objects.filter(
        status="ready",
        review_status="approved",
        mime_type="image/png",
        has_transparency=True,
    ).exclude(status__in=NON_BUYER_FACING_STATUSES)
    return set(qs.values_list("id", flat=True))


def product_is_media_ready(product, valid_ids=None):
    """Cheap check: does the product's primary image pass the media rule?"""
    primary_id = getattr(product, "primary_image_reference", None)
    if not primary_id:
        return False
    if valid_ids is None:
        return compute_media_readiness(product).is_ready
    return primary_id in valid_ids
