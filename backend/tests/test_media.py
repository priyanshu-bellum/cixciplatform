import pytest
from django.test import override_settings
from unittest.mock import patch, MagicMock
from apps.media.models import MediaAsset, UploadSession

@pytest.mark.django_db
class TestMediaUploadSession:
    def test_request_upload_local_fallback(self, buyer_client, buyer_user):
        """By default (no GCS/S3), request_upload falls back to placeholder."""
        url = "/api/v1/media/assets/request_upload/"
        payload = {
            "filename": "test_image.png",
            "mime_type": "image/png",
            "asset_type": "product_image",
            "owner_module": "catalog",
        }
        
        response = buyer_client.post(url, payload, format="json")
        assert response.status_code == 201
        data = response.data
        
        # Verify response structure
        assert "presigned_url" in data
        assert data["presigned_url"].startswith("https://placeholder-upload.cixci.com/")
        
        # Verify db models
        asset = MediaAsset.objects.get(id=data["id"])
        assert asset.original_filename == "test_image.png"
        assert asset.mime_type == "image/png"
        assert asset.storage_provider == "local"
        assert asset.storage_key.startswith(f"{buyer_user.entity.company_id}/product_image/")
        
        session = UploadSession.objects.get(id=data["upload_session_id"])
        assert session.presigned_url == data["presigned_url"]

    @override_settings(USE_GCS=True, GS_BUCKET_NAME="my-gcs-test-bucket")
    @patch("apps.shared_api.get_gcs_client")
    def test_request_upload_gcs_signed_url(self, mock_get_gcs_client, buyer_client, buyer_user):
        """When USE_GCS is True, generate real GCS signed PUT URLs."""
        # Setup mocks
        mock_client = MagicMock()
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        mock_blob.generate_signed_url.return_value = "https://storage.googleapis.com/my-gcs-test-bucket/signed-put-url"
        
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        mock_get_gcs_client.return_value = mock_client
        
        url = "/api/v1/media/assets/request_upload/"
        payload = {
            "filename": "avatar.jpg",
            "mime_type": "image/jpeg",
            "asset_type": "brand_logo",
            "owner_module": "tenant",
        }
        
        response = buyer_client.post(url, payload, format="json")
        assert response.status_code == 201
        data = response.data
        
        assert data["presigned_url"] == "https://storage.googleapis.com/my-gcs-test-bucket/signed-put-url"
        
        asset = MediaAsset.objects.get(id=data["id"])
        assert asset.storage_provider == "gcs"
        assert asset.storage_key.endswith("avatar.jpg")
        
        mock_client.bucket.assert_called_once_with("my-gcs-test-bucket")
        mock_blob.generate_signed_url.assert_called_once()
        
        # Verify method was PUT
        kwargs = mock_blob.generate_signed_url.call_args[1]
        assert kwargs["method"] == "PUT"
        assert kwargs["content_type"] == "image/jpeg"
