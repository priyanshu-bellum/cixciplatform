"""
Tests for the product-image attach / activation flow.

Covers the end-to-end path a vendor uses after a catalog import:

- §10  a single upload attaches to the selected product only
- §13  an image is never attached to an archived product
- §8   a bulk ZIP upload matches an Inactive (media-staged) SKU
- §3   the stored file extension is the dot-prefixed ".png" form
- §21/§31 a product becomes Active only once its media is complete
"""
import io
import uuid
import zipfile
from datetime import date

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.media.models import MediaAsset


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


def _make_product(vendor_company, sku="SKU-900", status="inactive", **kwargs):
    from apps.catalog.models import Product

    defaults = dict(
        name=f"Product {sku}",
        sku=sku,
        upc="123456789012",
        vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id,
        status=status,
        launch_date=date(2024, 1, 1),
    )
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


def _zip_bytes(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


@pytest.mark.django_db
class TestRequestUploadAttachment:
    def test_owner_record_id_is_persisted(self, vendor_client, vendor_company):
        product = _make_product(vendor_company, sku="SKU-ATTACH")

        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )

        assert resp.status_code == 201, resp.data
        asset = MediaAsset.objects.get(id=resp.data["id"])
        assert str(asset.owner_record_id) == str(product.id)
        assert asset.owner_module == "catalog"

    def test_extension_is_stored_with_leading_dot(self, vendor_client, vendor_company):
        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
            },
            format="json",
        )

        assert resp.status_code == 201, resp.data
        asset = MediaAsset.objects.get(id=resp.data["id"])
        assert asset.file_extension == ".png"

    def test_cannot_attach_to_another_vendors_product(self, vendor_client, buyer_company):
        product = _make_product(buyer_company, sku="SKU-OTHER-VENDOR")

        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )

        assert resp.status_code == 403
        assert not MediaAsset.objects.filter(owner_record_id=product.id).exists()

    def test_cannot_attach_to_archived_product(self, vendor_client, vendor_company):
        product = _make_product(vendor_company, sku="SKU-ARCHIVED", status="archived")

        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )

        assert resp.status_code == 400
        assert not MediaAsset.objects.filter(owner_record_id=product.id).exists()


@pytest.mark.django_db
class TestSingleUploadActivatesProduct:
    def _upload(self, client, product, filename="case.png"):
        resp = client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": filename,
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        asset_id = resp.data["id"]

        upload = client.post(
            f"/api/v1/media/assets/{asset_id}/upload_file/",
            {"file": SimpleUploadedFile(filename, _png_bytes(), content_type="image/png")},
            format="multipart",
        )
        return asset_id, upload

    def test_upload_makes_media_ready_and_activates_staged_product(
        self, vendor_client, vendor_company
    ):
        from apps.media.readiness import compute_media_readiness

        product = _make_product(vendor_company, sku="SKU-READY")
        assert product.status == "inactive"

        asset_id, upload = self._upload(vendor_client, product)
        assert upload.status_code == 200, upload.data

        asset = MediaAsset.objects.get(id=asset_id)
        assert asset.status == "ready"
        assert asset.review_status == "approved"
        assert asset.file_extension == ".png"
        assert asset.mime_type == "image/png"
        assert asset.has_transparency is True

        product.refresh_from_db()
        assert product.primary_image_reference is not None
        assert str(product.primary_image_reference) == str(asset.id)

        readiness = compute_media_readiness(product)
        assert readiness.is_ready, readiness.reason

        # The staged product is reconciled to Active once its media is complete.
        assert product.status == "active"
        assert product.selling_status == "for_sale"

    def test_product_can_be_saved_as_active_through_the_api(
        self, vendor_client, vendor_company
    ):
        product = _make_product(vendor_company, sku="SKU-API-ACTIVE")
        asset_id, upload = self._upload(vendor_client, product)
        assert upload.status_code == 200, upload.data

        resp = vendor_client.patch(
            f"/api/v1/catalog/products/{product.id}/",
            {
                "name": product.name,
                "sku": product.sku,
                "status": "active",
                "primary_image_reference": asset_id,
            },
            format="json",
        )
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == "active"


@pytest.mark.django_db
class TestZipUploadMatchesStagedProducts:
    def _post_zip(self, client, files):
        payload = _zip_bytes(files)
        return client.post(
            "/api/v1/media/assets/upload_zip/",
            {"file": SimpleUploadedFile("images.zip", payload, content_type="application/zip")},
            format="multipart",
        )

    def test_inactive_sku_is_matched_and_activated(self, vendor_client, vendor_company):
        product = _make_product(vendor_company, sku="SKU-ZIP", status="inactive")

        resp = self._post_zip(vendor_client, {"SKU-ZIP.png": _png_bytes()})

        assert resp.status_code == 200, resp.data
        data = resp.data
        assert data["matched"] == 1
        assert data["unmatched"] == 0
        assert data["created"] == 1
        assert data["products_now_media_ready"] == 1
        assert data["products_now_active"] == 1

        asset = MediaAsset.objects.get(owner_record_id=product.id)
        assert asset.file_extension == ".png"
        assert asset.mime_type == "image/png"

        product.refresh_from_db()
        assert str(product.primary_image_reference) == str(asset.id)
        assert product.status == "active"

    def test_archived_sku_is_not_matched(self, vendor_client, vendor_company):
        _make_product(vendor_company, sku="SKU-DEAD", status="archived")

        resp = self._post_zip(vendor_client, {"SKU-DEAD.png": _png_bytes()})

        assert resp.status_code == 200, resp.data
        assert resp.data["unmatched"] == 1
        assert resp.data["created"] == 0

    def test_other_vendors_sku_is_rejected(self, vendor_client, buyer_company):
        # Rule §8/§26: a vendor may only match their own SKUs. The other
        # vendor's SKU is not visible to the uploader at all, so the file is
        # reported as unmatched (no information about the other tenant).
        foreign = _make_product(buyer_company, sku="SKU-FOREIGN")

        resp = self._post_zip(vendor_client, {"SKU-FOREIGN.png": _png_bytes()})

        assert resp.status_code == 200, resp.data
        assert resp.data["created"] == 0
        assert resp.data["unmatched"] == 1
        assert resp.data["wrong_vendor"] == 0
        assert not MediaAsset.objects.filter(owner_record_id=foreign.id).exists()

    def test_summary_reports_media_incomplete_products(self, vendor_client, vendor_company):
        product = _make_product(vendor_company, sku="SKU-NONPNG")
        # A non-transparent PNG is rejected by validation, so the product
        # stays media incomplete and is reported as such.
        resp = self._post_zip(vendor_client, {"SKU-NONPNG.png": _png_bytes(transparent=False)})

        assert resp.status_code == 200, resp.data
        assert resp.data["failed"] == 1
        product.refresh_from_db()
        assert product.status == "inactive"


@pytest.mark.django_db
class TestPresignedUploadFinalisation:
    def test_finalize_upload_validates_the_stored_object(
        self, vendor_client, vendor_company, settings, tmp_path
    ):
        settings.MEDIA_ROOT = str(tmp_path)
        product = _make_product(vendor_company, sku="SKU-PRESIGNED")

        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        asset_id = resp.data["id"]
        asset = MediaAsset.objects.get(id=asset_id)
        assert asset.status == "upload_pending"

        # Simulate the client PUT to the presigned URL.
        full_path = tmp_path / asset.storage_key
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(_png_bytes())

        finalize = vendor_client.post(
            f"/api/v1/media/assets/{asset_id}/finalize_upload/", {}, format="json"
        )
        assert finalize.status_code == 200, finalize.data

        asset.refresh_from_db()
        assert asset.status == "ready"
        assert asset.review_status == "approved"
        assert asset.file_extension == ".png"
        assert asset.mime_type == "image/png"
        assert asset.has_transparency is True

        product.refresh_from_db()
        assert str(product.primary_image_reference) == str(asset.id)
        assert product.status == "active"

    def test_finalize_upload_rejects_an_invalid_object(
        self, vendor_client, vendor_company, settings, tmp_path
    ):
        settings.MEDIA_ROOT = str(tmp_path)
        product = _make_product(vendor_company, sku="SKU-PRESIGNED-BAD")

        resp = vendor_client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": "case.png",
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )
        asset_id = resp.data["id"]
        asset = MediaAsset.objects.get(id=asset_id)

        full_path = tmp_path / asset.storage_key
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(b"not-an-image")

        finalize = vendor_client.post(
            f"/api/v1/media/assets/{asset_id}/finalize_upload/", {}, format="json"
        )
        assert finalize.status_code == 400, finalize.data

        asset.refresh_from_db()
        assert asset.status != "ready"

        product.refresh_from_db()
        assert product.status == "inactive"


@pytest.mark.django_db
class TestPrimaryImageReplacement:
    def _existing_primary(self, product):
        return MediaAsset.objects.create(
            id=uuid.uuid4(),
            asset_type="product_image",
            status="ready",
            review_status="approved",
            owner_module="catalog",
            owner_record_id=product.id,
            company_scope_reference=product.company_scope_reference,
            original_filename="old.png",
            file_extension=".png",
            mime_type="image/png",
            has_transparency=True,
            content_hash=uuid.uuid4().hex,
            storage_key=f"{product.company_scope_reference}/product_image/{uuid.uuid4()}/old.png",
        )

    def _upload(self, client, product, filename="new.png", extra=None):
        resp = client.post(
            "/api/v1/media/assets/request_upload/",
            {
                "filename": filename,
                "mime_type": "image/png",
                "asset_type": "product_image",
                "owner_module": "catalog",
                "owner_record_id": str(product.id),
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        asset_id = resp.data["id"]

        data = {"file": SimpleUploadedFile(filename, _png_bytes(), content_type="image/png")}
        data.update(extra or {})
        upload = client.post(
            f"/api/v1/media/assets/{asset_id}/upload_file/", data, format="multipart"
        )
        return asset_id, upload

    def test_new_primary_replaces_and_archives_the_previous_image(
        self, vendor_client, vendor_company
    ):
        product = _make_product(vendor_company, sku="SKU-REPLACE")
        old_asset = self._existing_primary(product)
        product.primary_image_reference = old_asset.id
        product.save()

        asset_id, upload = self._upload(vendor_client, product, extra={"set_as_primary": "true"})

        assert upload.status_code == 200, upload.data
        product.refresh_from_db()
        assert str(product.primary_image_reference) == asset_id

        old_asset.refresh_from_db()
        assert old_asset.status == "archived"

    def test_replacing_the_primary_of_an_active_product_needs_confirmation(
        self, vendor_client, vendor_company
    ):
        product = _make_product(vendor_company, sku="SKU-REPLACE-ACTIVE", status="active")
        old_asset = self._existing_primary(product)
        product.primary_image_reference = old_asset.id
        product.save()

        asset_id, upload = self._upload(vendor_client, product, extra={"set_as_primary": "true"})

        assert upload.status_code == 409, upload.data
        assert upload.data["requires_confirmation"] is True

        product.refresh_from_db()
        assert str(product.primary_image_reference) == str(old_asset.id)

        # The same asset is retried with the explicit confirmation.
        retry = vendor_client.post(
            f"/api/v1/media/assets/{asset_id}/upload_file/",
            {
                "file": SimpleUploadedFile("new.png", _png_bytes(), content_type="image/png"),
                "set_as_primary": "true",
                "confirm_replace": "true",
            },
            format="multipart",
        )
        assert retry.status_code == 200, retry.data

        product.refresh_from_db()
        assert str(product.primary_image_reference) == asset_id
        old_asset.refresh_from_db()
        assert old_asset.status == "archived"

    def test_upload_without_set_as_primary_keeps_the_existing_primary(
        self, vendor_client, vendor_company
    ):
        product = _make_product(vendor_company, sku="SKU-KEEP")
        old_asset = self._existing_primary(product)
        product.primary_image_reference = old_asset.id
        product.save()

        asset_id, upload = self._upload(vendor_client, product)

        assert upload.status_code == 200, upload.data
        product.refresh_from_db()
        assert str(product.primary_image_reference) == str(old_asset.id)


@pytest.mark.django_db
class TestActivationReconcile:
    def _ready_asset(self, product):
        return MediaAsset.objects.create(
            id=uuid.uuid4(),
            asset_type="product_image",
            status="ready",
            review_status="approved",
            owner_module="catalog",
            owner_record_id=product.id,
            company_scope_reference=product.company_scope_reference,
            original_filename="case.png",
            file_extension=".png",
            mime_type="image/png",
            has_transparency=True,
            content_hash=uuid.uuid4().hex,
            storage_key=f"{product.company_scope_reference}/product_image/{uuid.uuid4()}/case.png",
        )

    def test_deactivation_hold_is_respected(self, vendor_company):
        from apps.catalog.services import reconcile_product_activation

        product = _make_product(
            vendor_company, sku="SKU-HOLD", status="inactive",
            deactivation_reason="Content correction needed",
        )
        asset = self._ready_asset(product)
        product.primary_image_reference = asset.id
        product.save()

        result = reconcile_product_activation(product, source="test")

        product.refresh_from_db()
        assert result["activated"] is False
        assert product.status == "inactive"

    def test_future_launch_date_blocks_activation(self, vendor_company):
        from apps.catalog.services import reconcile_product_activation

        future = date.today() + __import__("datetime").timedelta(days=30)
        product = _make_product(vendor_company, sku="SKU-FUTURE", status="inactive")
        product.launch_date = future
        product.release_date = future
        product.save()
        asset = self._ready_asset(product)
        product.primary_image_reference = asset.id
        product.save()

        result = reconcile_product_activation(product, source="test")

        product.refresh_from_db()
        assert result["activated"] is False
        assert product.status == "inactive"

    def test_active_product_is_left_untouched(self, vendor_company):
        from apps.catalog.services import reconcile_product_activation

        product = _make_product(vendor_company, sku="SKU-ALREADY", status="active")
        asset = self._ready_asset(product)
        product.primary_image_reference = asset.id
        product.save()

        result = reconcile_product_activation(product, source="test")

        product.refresh_from_db()
        assert result["activated"] is False
        assert product.status == "active"

    def test_media_incomplete_product_is_not_activated(self, vendor_company):
        from apps.catalog.services import reconcile_product_activation

        product = _make_product(vendor_company, sku="SKU-NOMEDIA", status="inactive")

        result = reconcile_product_activation(product, source="test")

        product.refresh_from_db()
        assert result["activated"] is False
        assert product.status == "inactive"


@pytest.mark.django_db
class TestScheduledActivationRequiresMedia:
    def test_task_does_not_activate_media_incomplete_product(self, vendor_company):
        from apps.catalog.tasks import update_product_statuses_by_date

        product = _make_product(vendor_company, sku="SKU-TASK", status="inactive")
        assert product.status == "inactive"

        update_product_statuses_by_date()

        product.refresh_from_db()
        assert product.status == "inactive"
