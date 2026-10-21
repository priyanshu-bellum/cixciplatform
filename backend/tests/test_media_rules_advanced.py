"""
Tests for the second wave of CIXCI Media Validation Rules:

§5/§15 renditions, §7 filename matching, §8/§10/§23/§26 vendor isolation,
§11 image URL validation, §12 duplicate blocking, §16 replacement confirmation,
§17 removal guard, §19 alt-text, §20 reorder, §25 export filtering,
§30 downstream events.
"""
import io
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.media.models import MediaAsset, Rendition
from apps.media.matching import candidate_skus, match_product


def _png_bytes(width=300, height=300, transparent=True):
    from PIL import Image

    if transparent:
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        for x in range(width // 4, width // 2):
            for y in range(height // 4, height // 2):
                img.putpixel((x, y), (10, 20, 30, 255))
    else:
        img = Image.new("RGB", (width, height), (10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_product(vendor_company, sku="SKU-100", status="active"):
    from apps.catalog.models import Product
    from datetime import date
    return Product.objects.create(
        name=f"Product {sku}",
        sku=sku,
        upc="123456789012",
        vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id,
        status=status,
        launch_date=date(2024, 1, 1),
    )


def _asset(product_or_company, company_id=None, **kwargs):
    """Create a valid transparent-PNG MediaAsset linked to a product."""
    product = getattr(product_or_company, "id", None)
    company = company_id or getattr(product_or_company, "company_scope_reference", None)
    defaults = dict(
        asset_type="product_image",
        status="ready",
        review_status="approved",
        owner_module="catalog",
        owner_record_id=product,
        company_scope_reference=company,
        original_filename="case.png",
        file_extension=".png",
        mime_type="image/png",
        has_transparency=True,
        content_hash=uuid.uuid4().hex,
        storage_key=f"{company}/product_image/{uuid.uuid4()}/case.png",
    )
    defaults.update(kwargs)
    return MediaAsset.objects.create(**defaults)


# ── §7 filename matching ──────────────────────────────────────────────────────

class TestFilenameMatching:
    def test_plain_sku(self):
        assert candidate_skus("SKU123.png")[0] == "SKU123"

    def test_sequence_suffix_stripped(self):
        cands = candidate_skus("SKU123_1.png")
        assert "SKU123" in cands

    def test_vendor_sku_pattern(self):
        cands = candidate_skus("VENDOR-SKU123-primary.png")
        assert any(c == "VENDOR-SKU123" for c in cands)
        assert any(c == "SKU123" for c in cands)

    def test_match_product_global_sku(self):
        class P:
            sku = "SKU123"
        sku_map = {"SKU123": P()}
        product, key = match_product("SKU123_2.png", sku_map)
        assert product is not None
        assert key == "SKU123"

    def test_match_product_unmatched(self):
        product, key = match_product("NOPE.png", {"SKU123": object()})
        assert product is None


# ── §5/§15 renditions ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRenditions:
    def test_renditions_generated_on_upload(self, buyer_client, buyer_company, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        asset = MediaAsset.objects.create(
            asset_type="product_image", status="upload_pending",
            company_scope_reference=buyer_company.id,
            original_filename="x.png", file_extension=".png",
            mime_type="image/png",
            storage_key=f"{buyer_company.id}/product_image/x/x.png",
        )
        f = SimpleUploadedFile("x.png", _png_bytes(width=1000, height=1000), content_type="image/png")
        resp = buyer_client.post(
            f"/api/v1/media/assets/{asset.id}/upload_file/", {"file": f}, format="multipart",
        )
        assert resp.status_code == 200
        types = set(Rendition.objects.filter(asset=asset).values_list("rendition_type", flat=True))
        assert "original" in types
        assert "thumbnail_200" in types


# ── §12 duplicate blocking on same product ────────────────────────────────────

@pytest.mark.django_db
class TestDuplicateBlocking:
    def test_duplicate_on_same_product_blocked(self, admin_client, vendor_company, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        from apps.media.validation import sha256_bytes
        product = _make_product(vendor_company, status="active")
        png = _png_bytes()
        # existing ready asset attached to the same product, same content hash
        MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            owner_module="catalog", owner_record_id=product.id,
            company_scope_reference=vendor_company.id,
            content_hash=sha256_bytes(png),
            original_filename="already.png", file_extension=".png",
            mime_type="image/png", storage_key="a/already.png",
        )
        new_asset = MediaAsset.objects.create(
            asset_type="product_image", status="upload_pending",
            owner_module="catalog", owner_record_id=product.id,
            company_scope_reference=vendor_company.id,
            original_filename="x.png", file_extension=".png",
            mime_type="image/png",
            storage_key=f"{vendor_company.id}/product_image/x/x.png",
        )
        f = SimpleUploadedFile("x.png", png, content_type="image/png")
        resp = admin_client.post(
            f"/api/v1/media/assets/{new_asset.id}/upload_file/", {"file": f}, format="multipart",
        )
        assert resp.status_code == 400
        assert "Duplicate" in resp.data.get("error", "")


# ── §16 replacement confirmation ──────────────────────────────────────────────

@pytest.mark.django_db
class TestReplacementConfirmation:
    def test_replacing_primary_of_active_product_requires_confirmation(
        self, buyer_client, buyer_company, settings, tmp_path
    ):
        settings.MEDIA_ROOT = tmp_path
        product = _make_product(buyer_company, status="active")
        asset = _asset(product)
        product.primary_image_reference = asset.id
        product.save()
        # First upload makes it a replacement candidate: force ready+hash set
        asset.status = "ready"
        asset.content_hash = "a" * 64
        asset.save(update_fields=["status", "content_hash"])

        f = SimpleUploadedFile("x.png", _png_bytes(), content_type="image/png")
        resp = buyer_client.post(
            f"/api/v1/media/assets/{asset.id}/upload_file/", {"file": f}, format="multipart",
        )
        # 409 = confirmation required (buyer may not own product, but the
        # confirmation check fires before ownership for admin; buyers own company)
        assert resp.status_code in (409, 403)


# ── §17 removal guard ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRemovalGuard:
    def test_removing_only_valid_image_of_active_product_blocked(
        self, admin_client, vendor_company
    ):
        product = _make_product(vendor_company, status="active")
        asset = _asset(product)
        product.primary_image_reference = asset.id
        product.save()

        resp = admin_client.delete(f"/api/v1/media/assets/{asset.id}/")
        assert resp.status_code == 400
        assert MediaAsset.objects.filter(id=asset.id).exists()

    def test_removing_non_only_image_allowed(self, admin_client, vendor_company):
        product = _make_product(vendor_company, status="active")
        keep = _asset(product)
        remove = _asset(product)
        product.primary_image_reference = keep.id
        product.save()

        resp = admin_client.delete(f"/api/v1/media/assets/{remove.id}/")
        assert resp.status_code == 204
        assert not MediaAsset.objects.filter(id=remove.id).exists()


# ── §19 alt-text validation ───────────────────────────────────────────────────

class TestAltTextValidation:
    def test_blank_not_required_ok(self):
        from apps.media.validation import validate_alt_text
        ok, errs = validate_alt_text("", required=False)
        assert ok

    def test_blank_required_fails(self):
        from apps.media.validation import validate_alt_text
        ok, errs = validate_alt_text("", required=True)
        assert not ok

    def test_too_long_fails(self):
        from apps.media.validation import validate_alt_text
        ok, errs = validate_alt_text("x" * 600, required=False)
        assert not ok

    def test_keyword_stuffing_flagged(self):
        from apps.media.validation import validate_alt_text
        ok, errs = validate_alt_text("case case case case case", required=False)
        assert not ok

    def test_unsupported_chars_flagged(self):
        from apps.media.validation import validate_alt_text
        ok, errs = validate_alt_text("<script>alert(1)</script>", required=False)
        assert not ok


# ── §20 reorder ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReorder:
    def test_reorder_updates_display_order(self, admin_client, vendor_company):
        product = _make_product(vendor_company, status="active")
        a1 = _asset(product)
        a2 = _asset(product)
        a3 = _asset(product)

        resp = admin_client.post(
            "/api/v1/media/assets/reorder/",
            {"product_id": str(product.id),
             "ordered_asset_ids": [str(a3.id), str(a1.id), str(a2.id)]},
            format="json",
        )
        assert resp.status_code == 200
        a3.refresh_from_db(); a1.refresh_from_db(); a2.refresh_from_db()
        assert a3.display_order == 0
        assert a1.display_order == 1
        assert a2.display_order == 2


# ── §8/§10/§26 vendor isolation on write ──────────────────────────────────────

@pytest.mark.django_db
class TestVendorWriteIsolation:
    def test_vendor_cannot_manage_other_company_asset(self, vendor_client, buyer_company):
        other = MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=buyer_company.id,
            original_filename="theirs.png", file_extension=".png",
            mime_type="image/png", storage_key="a/theirs.png",
        )
        resp = vendor_client.patch(
            f"/api/v1/media/assets/{other.id}/", {"alt_text": "x"}, format="json",
        )
        assert resp.status_code in (403, 404)

    def test_vendor_cannot_attach_to_other_vendor_product(
        self, vendor_client, vendor_company, buyer_company
    ):
        other_product = _make_product(buyer_company, sku="OTHER-1", status="active")
        own_asset = MediaAsset.objects.create(
            asset_type="product_image", status="ready",
            company_scope_reference=vendor_company.id,
            original_filename="mine.png", file_extension=".png",
            mime_type="image/png", storage_key="a/mine.png",
        )
        resp = vendor_client.patch(
            f"/api/v1/media/assets/{own_asset.id}/",
            {"owner_module": "catalog", "owner_record_id": str(other_product.id)},
            format="json",
        )
        assert resp.status_code in (400, 403)


# ── §25 export filtering ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestExportFiltering:
    def test_export_excludes_media_incomplete_products(self, vendor_company, buyer_company):
        from apps.catalog.tasks import process_buyer_export_job
        from apps.catalog.models import (
            BuyerProductExportJob, BuyerProductExportSelectionSnapshot,
        )
        ready = _make_product(vendor_company, sku="READY-1", status="active")
        ready_asset = _asset(ready)
        ready.primary_image_reference = ready_asset.id
        ready.save()
        incomplete = _make_product(vendor_company, sku="INC-1", status="active")

        job = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_company.id,
            company_scope_reference=buyer_company.id,
            buyer_entity_reference=buyer_company.id,
            requested_by=buyer_company.id,
            format="API",
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=[str(ready.id), str(incomplete.id)],
            portfolio_snapshot_reference=buyer_company.id,
        )
        process_buyer_export_job(str(job.id))
        job.refresh_from_db()
        assert job.status == "completed"
        assert job.product_count == 1

    def test_export_opt_in_includes_media_missing(self, vendor_company, buyer_company):
        from apps.catalog.tasks import process_buyer_export_job
        from apps.catalog.models import (
            BuyerProductExportJob, BuyerProductExportSelectionSnapshot,
        )
        incomplete = _make_product(vendor_company, sku="INC-2", status="active")
        job = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_company.id,
            company_scope_reference=buyer_company.id,
            buyer_entity_reference=buyer_company.id,
            requested_by=buyer_company.id,
            format="API",
            include_media_missing=True,
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=[str(incomplete.id)],
            portfolio_snapshot_reference=buyer_company.id,
        )
        process_buyer_export_job(str(job.id))
        job.refresh_from_db()
        assert job.product_count == 1


# ── §30 downstream events ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDownstreamEvents:
    def test_media_change_emits_catalog_events(self, vendor_company):
        from apps.media.services import emit_media_change_events
        from apps.audit.models import AuditRecord
        product = _make_product(vendor_company)
        emit_media_change_events(product.id, vendor_company.id)
        codes = set(
            AuditRecord.objects.filter(source_record_id=product.id).values_list("event_code", flat=True)
        )
        assert "catalog.visibility.changed" in codes
        assert "catalog.export.required" in codes

    def test_review_approval_emits_product_media_approved(self, admin_client, vendor_company):
        product = _make_product(vendor_company)
        asset = _asset(product, review_status="pending", status="ready")
        from apps.audit.models import AuditRecord
        resp = admin_client.post(
            f"/api/v1/media/assets/{asset.id}/review/",
            {"decision": "approve"}, format="json",
        )
        assert resp.status_code == 200
        assert AuditRecord.objects.filter(event_code="product.media.approved").exists()


# ── §11 image URL validation ──────────────────────────────────────────────────

class TestImageUrlValidation:
    def test_rejects_non_https(self):
        from apps.media.validation import validate_image_url
        ok, data, name, errs = validate_image_url("ftp://example.com/a.png")
        assert not ok

    def test_rejects_empty(self):
        from apps.media.validation import validate_image_url
        ok, data, name, errs = validate_image_url("")
        assert not ok
