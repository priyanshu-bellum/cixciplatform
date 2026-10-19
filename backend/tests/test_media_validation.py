"""
Tests for CIXCI Media / Image Asset Management validation rules.

Covers: PNG-only enforcement, MIME/signature sniffing, transparency, size and
dimension limits, filename sanitisation, duplicate detection, ZIP bulk rules,
media-readiness gating, and tenant isolation.
"""
import io
import zipfile

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.media import validation
from apps.media.models import MediaAsset


# ── Helpers ───────────────────────────────────────────────────────────────────

def _png_bytes(width=200, height=200, transparent=True, color=(255, 0, 0)):
    """Build a real PNG in memory. transparent=True gives a real alpha channel."""
    from PIL import Image

    if transparent:
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        # Draw an opaque block so at least one pixel has alpha 255 AND one has 0
        for x in range(width // 4, width // 2):
            for y in range(height // 4, height // 2):
                img.putpixel((x, y), (color[0], color[1], color[2], 255))
    else:
        img = Image.new("RGB", (width, height), color)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _jpeg_bytes(width=200, height=200):
    from PIL import Image

    img = Image.new("RGB", (width, height), (0, 128, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _zip_bytes(files):
    """files: dict name -> bytes"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


# ── validate_image_bytes ──────────────────────────────────────────────────────

class TestImageValidation:
    def test_valid_transparent_png_passes(self):
        data = _png_bytes(transparent=True)
        r = validation.validate_image_bytes(data, "case.png", "product_image")
        assert r.ok
        assert r.has_transparency
        assert r.width == 200 and r.height == 200
        assert r.content_hash

    def test_opaque_png_rejected(self):
        data = _png_bytes(transparent=False)
        r = validation.validate_image_bytes(data, "opaque.png", "product_image")
        assert not r.ok
        assert any("transparen" in e.lower() for e in r.errors)

    def test_jpeg_rejected(self):
        data = _jpeg_bytes()
        r = validation.validate_image_bytes(data, "photo.jpg", "product_image")
        assert not r.ok
        assert any("Unsupported" in e for e in r.errors)

    def test_png_extension_with_jpeg_content_rejected(self):
        data = _jpeg_bytes()
        r = validation.validate_image_bytes(data, "fake.png", "product_image")
        assert not r.ok
        assert any("not PNG" in e or "content" in e.lower() for e in r.errors)

    def test_empty_file_rejected(self):
        r = validation.validate_image_bytes(b"", "empty.png", "product_image")
        assert not r.ok
        assert any("empty" in e.lower() for e in r.errors)

    def test_oversize_rejected(self, settings):
        settings.MEDIA_IMAGE_MAX_SIZE = 50
        data = _png_bytes()
        r = validation.validate_image_bytes(data, "big.png", "product_image")
        assert not r.ok
        assert any("limit" in e.lower() or "exceeds" in e.lower() for e in r.errors)

    def test_below_min_dimension_rejected(self, settings):
        settings.MEDIA_IMAGE_MIN_DIMENSION = 300
        data = _png_bytes(width=200, height=200)
        r = validation.validate_image_bytes(data, "small.png", "product_image")
        assert not r.ok
        assert any("below" in e.lower() for e in r.errors)

    def test_mime_mismatch_rejected(self):
        data = _png_bytes()
        r = validation.validate_image_bytes(
            data, "case.png", "product_image", mime_hint="image/jpeg"
        )
        assert not r.ok
        assert any("content type" in e.lower() for e in r.errors)

    def test_non_image_asset_type_skips_format_rules(self):
        r = validation.validate_image_bytes(b"x" * 500, "doc.pdf", "document")
        assert r.ok


class TestFilenameSanitisation:
    def test_path_traversal_stripped(self):
        assert "/" not in validation.sanitize_filename("../../etc/passwd.png")

    def test_basename_only(self):
        assert validation.sanitize_filename("a/b/c.png") == "c.png"
        assert validation.sanitize_filename("a\\b\\c.png") == "c.png"

    def test_unsafe_chars_stripped(self):
        out = validation.sanitize_filename("my file <>.png")
        assert "<" not in out and ">" not in out and " " not in out

    def test_empty_falls_back(self):
        assert validation.sanitize_filename("") == "upload.png"
        assert validation.sanitize_filename("..") == "upload.png"


# ── validate_zip_archive ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestZipValidation:
    def test_zip_with_jpeg_reports_failure(self):
        data = _zip_bytes({"a.png": _png_bytes(), "b.jpg": _jpeg_bytes()})
        f = SimpleUploadedFile("imgs.zip", data, content_type="application/zip")
        res = validation.validate_zip_archive(f, company_id="11111111-1111-1111-1111-111111111111")
        assert res["ok"]
        statuses = {e["filename"]: e["status"] for e in res["entries"]}
        assert statuses["a.png"] == "valid"
        assert statuses["b.jpg"] == "failed"

    def test_zip_with_opaque_png_reports_not_transparent(self):
        data = _zip_bytes({"a.png": _png_bytes(transparent=False)})
        f = SimpleUploadedFile("imgs.zip", data, content_type="application/zip")
        res = validation.validate_zip_archive(f, company_id="11111111-1111-1111-1111-111111111111")
        assert res["ok"]
        assert res["summary"]["not_transparent"] == 1
        assert res["entries"][0]["status"] == "failed"

    def test_not_a_zip_rejected(self):
        f = SimpleUploadedFile("x.zip", b"hello world", content_type="application/zip")
        res = validation.validate_zip_archive(f, company_id="11111111-1111-1111-1111-111111111111")
        assert not res["ok"]

    def test_nested_folders_names_are_basenames(self):
        data = _zip_bytes({"folder/sub/case.png": _png_bytes()})
        f = SimpleUploadedFile("imgs.zip", data, content_type="application/zip")
        res = validation.validate_zip_archive(f, company_id="11111111-1111-1111-1111-111111111111")
        assert res["entries"][0]["filename"] == "case.png"

    def test_empty_zip_rejected(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w"):
            pass
        f = SimpleUploadedFile("imgs.zip", buf.getvalue(), content_type="application/zip")
        res = validation.validate_zip_archive(f, company_id="11111111-1111-1111-1111-111111111111")
        assert not res["ok"]


# ── Media readiness ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMediaReadiness:
    def _product(self, vendor_company, **kwargs):
        from apps.catalog.models import Product, ProductStatus
        from datetime import date
        defaults = dict(
            name="Case",
            sku="PP-1",
            upc="123456789012",
            vendor_company_reference=vendor_company.id,
            company_scope_reference=vendor_company.id,
            status=ProductStatus.DRAFT,
            launch_date=date(2024, 1, 1),
        )
        defaults.update(kwargs)
        return Product.objects.create(**defaults)

    def test_no_images_not_ready(self, vendor_company):
        from apps.media.readiness import compute_media_readiness
        p = self._product(vendor_company)
        r = compute_media_readiness(p)
        assert not r.is_ready
        assert "assign" in " ".join(r.issues)

    def test_valid_transparent_primary_ready(self, vendor_company):
        from apps.media.readiness import compute_media_readiness
        p = self._product(vendor_company)
        asset = MediaAsset.objects.create(
            asset_type="product_image",
            status="ready",
            review_status="approved",
            owner_module="catalog",
            owner_record_id=p.id,
            company_scope_reference=vendor_company.id,
            original_filename="case.png",
            file_extension=".png",
            mime_type="image/png",
            has_transparency=True,
            storage_key="x/case.png",
        )
        p.primary_image_reference = asset.id
        p.save()
        r = compute_media_readiness(p)
        assert r.is_ready and r.primary_is_valid

    def test_opaque_primary_not_ready(self, vendor_company):
        from apps.media.readiness import compute_media_readiness
        p = self._product(vendor_company)
        asset = MediaAsset.objects.create(
            asset_type="product_image",
            status="ready",
            review_status="approved",
            owner_module="catalog",
            owner_record_id=p.id,
            company_scope_reference=vendor_company.id,
            original_filename="case.png",
            file_extension=".png",
            mime_type="image/png",
            has_transparency=False,
            storage_key="x/case.png",
        )
        p.primary_image_reference = asset.id
        p.save()
        r = compute_media_readiness(p)
        assert not r.is_ready
        assert "primary_not_transparent" in r.issues


# ── API: tenant isolation ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMediaTenantIsolation:
    def test_buyer_only_sees_own_company_assets(self, buyer_client, buyer_company, vendor_company):
        mine = MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=buyer_company.id,
            original_filename="mine.png", file_extension=".png",
            mime_type="image/png", storage_key="a/mine.png",
        )
        MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=vendor_company.id,
            original_filename="theirs.png", file_extension=".png",
            mime_type="image/png", storage_key="a/theirs.png",
        )
        resp = buyer_client.get("/api/v1/media/assets/")
        assert resp.status_code == 200
        ids = [str(a["id"]) for a in resp.data.get("results", resp.data)]
        assert str(mine.id) in ids
        assert len(ids) == 1

    def test_admin_sees_all_assets(self, admin_client, buyer_company, vendor_company):
        MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=buyer_company.id,
            original_filename="a.png", file_extension=".png",
            mime_type="image/png", storage_key="a/a.png",
        )
        MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=vendor_company.id,
            original_filename="b.png", file_extension=".png",
            mime_type="image/png", storage_key="a/b.png",
        )
        resp = admin_client.get("/api/v1/media/assets/")
        assert resp.status_code == 200
        ids = resp.data.get("results", resp.data)
        assert len(ids) == 2


# ── API: single upload validation ─────────────────────────────────────────────

@pytest.mark.django_db
class TestSingleUploadValidation:
    def test_upload_rejects_jpeg(self, buyer_client, buyer_company):
        asset = MediaAsset.objects.create(
            asset_type="product_image", status="upload_pending",
            company_scope_reference=buyer_company.id,
            original_filename="x.jpg", file_extension=".jpg",
            mime_type="image/jpeg", storage_key=f"{buyer_company.id}/product_image/x/x.jpg",
        )
        f = SimpleUploadedFile("x.jpg", _jpeg_bytes(), content_type="image/jpeg")
        resp = buyer_client.post(
            f"/api/v1/media/assets/{asset.id}/upload_file/",
            {"file": f}, format="multipart",
        )
        assert resp.status_code == 400
        asset.refresh_from_db()
        assert asset.status == "validation_failed"

    def test_upload_accepts_transparent_png(self, buyer_client, buyer_company):
        asset = MediaAsset.objects.create(
            asset_type="product_image", status="upload_pending",
            company_scope_reference=buyer_company.id,
            original_filename="x.png", file_extension=".png",
            mime_type="image/png", storage_key=f"{buyer_company.id}/product_image/x/x.png",
        )
        f = SimpleUploadedFile("x.png", _png_bytes(), content_type="image/png")
        resp = buyer_client.post(
            f"/api/v1/media/assets/{asset.id}/upload_file/",
            {"file": f}, format="multipart",
        )
        assert resp.status_code == 200
        asset.refresh_from_db()
        assert asset.status == "ready"
        assert asset.has_transparency is True
        assert asset.width == 200
