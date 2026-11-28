"""Tests for vendor catalog image processing (catalog_media.py)."""
import uuid
from unittest.mock import patch, MagicMock
import pytest

from apps.media.models import MediaAsset, AssetType, AssetStatus
from apps.catalog.models import Product


@pytest.fixture
def vendor_product(db, vendor_company):
    return Product.objects.create(
        name="Test Vendor Product",
        sku="VND-IMG-001",
        brand="TestBrand",
        product_type="accessory",
        status="draft",
        selling_status="not_for_sale",
        launch_date="2026-01-01",
        company_scope_reference=vendor_company.id,
        vendor_company_reference=vendor_company.id,
    )


FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 500
FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500


@pytest.mark.django_db
class TestDownloadVendorImage:
    def test_rejects_unsupported_scheme(self):
        from apps.integration.catalog_media import download_vendor_image
        with pytest.raises(ValueError, match="Unsupported URL scheme"):
            download_vendor_image("ftp://example.com/image.jpg")

    @patch("apps.integration.catalog_media.urllib.request.urlopen")
    def test_downloads_jpeg(self, mock_urlopen):
        from apps.integration.catalog_media import download_vendor_image
        mock_resp = MagicMock()
        mock_resp.read.return_value = FAKE_JPEG
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        data, filename, mime = download_vendor_image("https://example.com/product.jpg")
        assert mime == "image/jpeg"
        assert data == FAKE_JPEG
        assert filename.endswith(".jpg")

    @patch("apps.integration.catalog_media.urllib.request.urlopen")
    def test_rejects_non_image(self, mock_urlopen):
        from apps.integration.catalog_media import download_vendor_image
        mock_resp = MagicMock()
        mock_resp.read.return_value = b"%PDF-1.4 fake pdf"
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        with pytest.raises(ValueError, match="Unsupported image format"):
            download_vendor_image("https://example.com/file.pdf")


@pytest.mark.django_db
class TestCreateVendorMediaAsset:
    @patch("apps.integration.catalog_media.download_vendor_image")
    def test_creates_asset(self, mock_download, vendor_product, vendor_company):
        from apps.integration.catalog_media import create_vendor_media_asset
        mock_download.return_value = (FAKE_JPEG, "product.jpg", "image/jpeg")

        asset_id = create_vendor_media_asset(
            vendor_product.id, "https://example.com/product.jpg",
            vendor_company.id, None,
        )
        assert asset_id is not None
        asset = MediaAsset.objects.get(id=asset_id)
        assert asset.asset_type == AssetType.PRODUCT_IMAGE
        assert asset.status == AssetStatus.READY
        assert asset.mime_type == "image/jpeg"
        assert asset.owner_record_id == vendor_product.id
        assert asset.company_scope_reference == vendor_company.id

    @patch("apps.integration.catalog_media.download_vendor_image")
    def test_deduplicates_by_content_hash(self, mock_download, vendor_product, vendor_company):
        from apps.integration.catalog_media import create_vendor_media_asset
        mock_download.return_value = (FAKE_JPEG, "product.jpg", "image/jpeg")

        id1 = create_vendor_media_asset(
            vendor_product.id, "https://example.com/product.jpg",
            vendor_company.id, None,
        )
        id2 = create_vendor_media_asset(
            vendor_product.id, "https://example.com/product.jpg",
            vendor_company.id, None,
        )
        assert id1 == id2
        assert MediaAsset.objects.filter(owner_record_id=vendor_product.id).count() == 1

    @patch("apps.integration.catalog_media.download_vendor_image")
    def test_returns_none_on_download_failure(self, mock_download, vendor_product, vendor_company):
        from apps.integration.catalog_media import create_vendor_media_asset
        mock_download.side_effect = Exception("Connection timeout")

        result = create_vendor_media_asset(
            vendor_product.id, "https://example.com/broken.jpg",
            vendor_company.id, None,
        )
        assert result is None


@pytest.mark.django_db
class TestProcessVendorProductImages:
    @patch("apps.integration.catalog_media.create_vendor_media_asset")
    def test_links_first_image_as_primary(self, mock_create, vendor_product, vendor_company):
        from apps.integration.catalog_media import process_vendor_product_images
        asset_id = uuid.uuid4()
        mock_create.return_value = asset_id

        result = process_vendor_product_images(
            vendor_product,
            ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
            vendor_company.id, None,
        )
        assert result is True
        vendor_product.refresh_from_db()
        assert vendor_product.primary_image_reference == asset_id

    @patch("apps.integration.catalog_media.create_vendor_media_asset")
    def test_skips_if_already_has_image(self, mock_create, vendor_product, vendor_company):
        from apps.integration.catalog_media import process_vendor_product_images
        vendor_product.primary_image_reference = uuid.uuid4()
        vendor_product.save()

        result = process_vendor_product_images(
            vendor_product, ["https://example.com/img.jpg"],
            vendor_company.id, None,
        )
        assert result is True
        mock_create.assert_not_called()

    def test_returns_false_on_empty_urls(self, vendor_product, vendor_company):
        from apps.integration.catalog_media import process_vendor_product_images
        assert process_vendor_product_images(vendor_product, [], vendor_company.id, None) is False
        assert process_vendor_product_images(vendor_product, None, vendor_company.id, None) is False

    @patch("apps.integration.catalog_media.create_vendor_media_asset")
    def test_processes_at_most_six_images(self, mock_create, vendor_product, vendor_company):
        from apps.integration.catalog_media import process_vendor_product_images
        mock_create.return_value = uuid.uuid4()

        # Up to six vendor images are kept per product (raised from three in 6ea8fd1).
        urls = [f"https://example.com/img{i}.jpg" for i in range(9)]
        process_vendor_product_images(vendor_product, urls, vendor_company.id, None)
        assert mock_create.call_count == 6


@pytest.mark.django_db
class TestVendorImageStorageAndRetry:
    """ISSUE-014: no asset without a file, a lost file is restored, a failed download is retried."""

    def _source(self, vendor_company, product, admin_user):
        from apps.integration.catalog_config import default_catalog_config
        from apps.integration.models import VendorCatalogConnection, VendorCatalogItem
        connection = VendorCatalogConnection.objects.create(vendor_company=vendor_company, label="Images",
            config=default_catalog_config(), updated_by=admin_user)
        return VendorCatalogItem.objects.create(connection=connection, external_id="img-1", product=product,
            payload={"id": "img-1", "images": ["https://cdn.example.test/a.jpg"]}, source_hash="h")

    def test_no_asset_is_recorded_when_the_file_cannot_be_stored(self, vendor_product, vendor_company, settings, tmp_path):
        from apps.integration import catalog_media
        settings.MEDIA_ROOT = str(tmp_path)
        fetched = {"https://cdn.example.test/a.jpg": (FAKE_JPEG, "a.jpg", "image/jpeg")}
        with patch.object(catalog_media, "open", side_effect=OSError("disk full"), create=True):
            assert catalog_media.create_vendor_media_asset(vendor_product.id, "https://cdn.example.test/a.jpg",
                vendor_company.id, None, fetched=fetched) is None
        assert not MediaAsset.objects.filter(owner_record_id=vendor_product.id).exists()

    def test_a_lost_file_is_written_again_for_the_same_asset(self, vendor_product, vendor_company, settings, tmp_path):
        import os
        from apps.integration import catalog_media
        settings.MEDIA_ROOT = str(tmp_path)
        url = "https://cdn.example.test/a.jpg"
        fetched = {url: (FAKE_JPEG, "a.jpg", "image/jpeg")}
        assert catalog_media.process_vendor_product_images(vendor_product, [url], vendor_company.id, None, fetched=fetched)
        asset = MediaAsset.objects.get(owner_record_id=vendor_product.id)
        path = os.path.join(str(tmp_path), asset.storage_key)
        os.remove(path)
        vendor_product.refresh_from_db()
        assert catalog_media.primary_file_missing(vendor_product)
        assert catalog_media.process_vendor_product_images(vendor_product, [url], vendor_company.id, None, fetched=fetched)
        assert os.path.isfile(path) and MediaAsset.objects.filter(owner_record_id=vendor_product.id).count() == 1

    def test_cloud_storage_receives_the_file_the_proxy_redirects_to(self, vendor_product, vendor_company, settings):
        from apps.integration import catalog_media
        settings.USE_S3 = True
        with patch("django.core.files.storage.default_storage.save", side_effect=lambda name, content: name) as save:
            asset_id = catalog_media.create_vendor_media_asset(vendor_product.id, "https://cdn.example.test/a.jpg",
                vendor_company.id, None, fetched={"https://cdn.example.test/a.jpg": (FAKE_JPEG, "a.jpg", "image/jpeg")})
        asset = MediaAsset.objects.get(pk=asset_id)
        assert save.call_args[0][0] == asset.storage_key and save.call_args[0][1].read() == FAKE_JPEG

    def test_failed_download_is_retried_later_with_a_backoff(self, vendor_product, vendor_company, admin_user, settings, tmp_path):
        from django.core.cache import cache
        from apps.integration import catalog_sync
        settings.MEDIA_ROOT = str(tmp_path)
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "image-retry"}}
        cache.clear()
        self._source(vendor_company, vendor_product, admin_user)
        with patch("apps.integration.catalog_media.download_vendor_image", side_effect=OSError("timeout")):
            assert catalog_sync.retry_missing_vendor_images() == {"checked": 1, "attempted": 1, "linked": 0}
        with patch("apps.integration.catalog_media.download_vendor_image", return_value=(FAKE_JPEG, "a.jpg", "image/jpeg")) as download:
            # Inside the backoff window the product is left alone.
            assert catalog_sync.retry_missing_vendor_images()["attempted"] == 0 and not download.called
            cache.clear()
            assert catalog_sync.retry_missing_vendor_images() == {"checked": 1, "attempted": 1, "linked": 1}
        vendor_product.refresh_from_db()
        assert vendor_product.primary_image_reference is not None
        assert catalog_sync.retry_missing_vendor_images() == {"checked": 0, "attempted": 0, "linked": 0}
