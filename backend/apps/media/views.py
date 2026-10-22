"""
Media proxy view — short URL redirect to S3/GCS storage.

/api/img/<base62_code> → 302 redirect → https://bucket.s3.amazonaws.com/...

No authentication required (images load via <img> tags).
Browser caches the redirect for 1 hour.
"""
from django.conf import settings
from django.http import HttpResponseRedirect, HttpResponseNotFound
from django.views import View
from django.views.decorators.cache import cache_control
from django.utils.decorators import method_decorator

from apps.media.models import MediaAsset
from apps.media.utils import b62_to_uuid


@method_decorator(cache_control(public=True, max_age=3600), name="dispatch")
class MediaProxyView(View):

    def get(self, request, code):
        try:
            asset_id = b62_to_uuid(code)
        except (ValueError, IndexError):
            return HttpResponseNotFound("Invalid image code")

        try:
            asset = MediaAsset.objects.only(
                "id", "status", "storage_key"
            ).get(id=asset_id)
        except MediaAsset.DoesNotExist:
            return HttpResponseNotFound("Asset not found")

        if asset.status != "ready":
            return HttpResponseNotFound("Asset not available")

        if not asset.storage_key:
            return HttpResponseNotFound("Asset has no storage reference")

        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return HttpResponseRedirect(f"{media_url}{asset.storage_key}")
