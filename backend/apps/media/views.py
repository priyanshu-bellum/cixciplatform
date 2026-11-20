"""
Media proxy view — serves images from local storage or redirects to cloud.

/api/img/<base62_code> → StreamingHttpResponse (local) or 302 redirect (S3/GCS)

No authentication required (images load via <img> tags).
Browser caches the response for 1 hour.
"""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseRedirect, HttpResponseNotFound
from django.views import View
from django.views.decorators.cache import cache_control
from django.utils.decorators import method_decorator

from apps.media.models import MediaAsset
from apps.media.utils import b62_to_uuid


def _is_local_storage():
    return not getattr(settings, "USE_S3", False) and not getattr(settings, "USE_GCS", False)


@method_decorator(cache_control(public=True, max_age=3600), name="dispatch")
class MediaProxyView(View):

    def get(self, request, code):
        try:
            asset_id = b62_to_uuid(code)
        except (ValueError, IndexError):
            return HttpResponseNotFound("Invalid image code")

        try:
            asset = MediaAsset.objects.only(
                "id", "status", "storage_key", "mime_type"
            ).get(id=asset_id)
        except MediaAsset.DoesNotExist:
            return HttpResponseNotFound("Asset not found")

        if asset.status != "ready":
            return HttpResponseNotFound("Asset not available")

        if not asset.storage_key:
            return HttpResponseNotFound("Asset has no storage reference")

        if _is_local_storage():
            file_path = Path(settings.MEDIA_ROOT) / asset.storage_key
            if not file_path.is_file():
                return HttpResponseNotFound("File not found on disk")
            content_type = asset.mime_type or mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            return FileResponse(open(file_path, "rb"), content_type=content_type)

        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return HttpResponseRedirect(f"{media_url}{asset.storage_key}")
