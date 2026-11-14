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
    def test_processes_max_three_images(self, mock_create, vendor_product, vendor_company):
        from apps.integration.catalog_media import process_vendor_product_images
        mock_create.return_value = uuid.uuid4()

        urls = [f"https://example.com/img{i}.jpg" for i in range(6)]
        process_vendor_product_images(vendor_product, urls, vendor_company.id, None)
        assert mock_create.call_count == 3
