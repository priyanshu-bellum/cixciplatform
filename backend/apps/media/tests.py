"""Tests for media validation and readiness — JPEG/JPG/PNG acceptance."""
import io
import struct

from django.test import TestCase, override_settings

from apps.media.validation import (
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_IMAGE_MIMES,
    is_jpeg_bytes,
    is_png_bytes,
    is_allowed_image_bytes,
    sniff_mime,
    validate_image_bytes,
    validate_image_url,
)


def _make_png_bytes(width=200, height=200, transparent=True):
    from PIL import Image

    img = Image.new("RGBA", (width, height), (255, 0, 0, 0 if transparent else 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes(width=200, height=200):
    from PIL import Image

    img = Image.new("RGB", (width, height), (255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class SignatureDetectionTest(TestCase):
    def test_png_signature(self):
        data = _make_png_bytes()
        self.assertTrue(is_png_bytes(data[:8]))
        self.assertFalse(is_jpeg_bytes(data[:3]))
        self.assertTrue(is_allowed_image_bytes(data[:8]))

    def test_jpeg_signature(self):
        data = _make_jpeg_bytes()
        self.assertTrue(is_jpeg_bytes(data[:3]))
        self.assertFalse(is_png_bytes(data[:8]))
        self.assertTrue(is_allowed_image_bytes(data[:8]))

    def test_sniff_png(self):
        self.assertEqual(sniff_mime(_make_png_bytes()[:32]), "image/png")

    def test_sniff_jpeg(self):
        self.assertEqual(sniff_mime(_make_jpeg_bytes()[:32]), "image/jpeg")


class AllowedFormatsTest(TestCase):
    def test_allowed_extensions(self):
        self.assertIn(".png", ALLOWED_IMAGE_EXTENSIONS)
        self.assertIn(".jpg", ALLOWED_IMAGE_EXTENSIONS)
        self.assertIn(".jpeg", ALLOWED_IMAGE_EXTENSIONS)

    def test_allowed_mimes(self):
        self.assertIn("image/png", ALLOWED_IMAGE_MIMES)
        self.assertIn("image/jpeg", ALLOWED_IMAGE_MIMES)


class ValidateImageBytesTest(TestCase):
    def test_valid_png_transparent(self):
        data = _make_png_bytes(transparent=True)
        result = validate_image_bytes(data, "test.png", check_duplicates=False)
        self.assertTrue(result.ok)
        self.assertTrue(result.has_transparency)

    def test_valid_jpeg(self):
        data = _make_jpeg_bytes()
        result = validate_image_bytes(data, "test.jpg", check_duplicates=False)
        self.assertTrue(result.ok)
        self.assertFalse(result.has_transparency)

    def test_valid_jpeg_extension(self):
        data = _make_jpeg_bytes()
        result = validate_image_bytes(data, "test.jpeg", check_duplicates=False)
        self.assertTrue(result.ok)

    def test_png_no_transparency_rejected(self):
        data = _make_png_bytes(transparent=False)
        result = validate_image_bytes(data, "test.png", check_duplicates=False)
        self.assertFalse(result.ok)
        self.assertIn("transparent", result.errors[0].lower())

    def test_unsupported_extension_rejected(self):
        data = _make_png_bytes()
        result = validate_image_bytes(data, "test.bmp", check_duplicates=False)
        self.assertFalse(result.ok)
        self.assertIn("Unsupported", result.errors[0])

    def test_jpeg_content_with_png_ext_accepted(self):
        data = _make_jpeg_bytes()
        result = validate_image_bytes(data, "photo.png", check_duplicates=False)
        self.assertTrue(result.ok)

    def test_png_content_with_jpg_ext_accepted(self):
        data = _make_png_bytes(transparent=True)
        result = validate_image_bytes(data, "photo.jpg", check_duplicates=False)
        self.assertTrue(result.ok)

    def test_non_image_asset_type_skips_format(self):
        data = b"x" * 200
        result = validate_image_bytes(
            data, "readme.txt", asset_type="document", check_duplicates=False
        )
        self.assertTrue(result.ok)

    def test_empty_file_rejected(self):
        result = validate_image_bytes(b"", "test.png", check_duplicates=False)
        self.assertFalse(result.ok)

    def test_jpeg_transparency_not_required(self):
        data = _make_jpeg_bytes()
        result = validate_image_bytes(data, "product.jpg", check_duplicates=False)
        self.assertTrue(result.ok)
        self.assertFalse(result.has_transparency)


class MediaShortUrlTest(TestCase):
    @override_settings(MEDIA_BASE_URL="")
    def test_always_returns_proxy_path(self):
        import uuid
        from apps.media.utils import media_short_url, uuid_to_b62
        asset_id = uuid.uuid4()
        url = media_short_url(asset_id)
        self.assertTrue(url.startswith("/api/img/"))
        self.assertEqual(url, f"/api/img/{uuid_to_b62(asset_id)}")

    @override_settings(MEDIA_BASE_URL="https://cdn.example.com")
    def test_absolute_url_with_base(self):
        import uuid
        from apps.media.utils import media_short_url, uuid_to_b62
        asset_id = uuid.uuid4()
        url = media_short_url(asset_id)
        self.assertTrue(url.startswith("https://cdn.example.com/api/img/"))
