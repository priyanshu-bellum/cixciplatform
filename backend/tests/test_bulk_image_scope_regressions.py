"""Bulk image continuation must keep the imported supplier's ownership scope."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.media.models import MediaAsset
from apps.tenant.models import Company
from tests.test_media_attach_flow import _make_product, _png_bytes, _zip_bytes

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("actor", ["admin", "vendor"])
def test_zip_scope_matches_imported_supplier(actor, request, vendor_company, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    client = request.getfixturevalue(actor + "_client")
    other = Company.objects.create(name="Other image supplier", slug="other-image-supplier", company_type="vendor")
    if actor == "admin":
        admin = request.getfixturevalue("admin_user")
        admin.entity = other.entities.first()
        admin.save(update_fields=["entity"])
    product = _make_product(vendor_company, sku="SCOPE-ZIP")
    foreign = _make_product(other, sku="SCOPE-ZIP")
    upload = SimpleUploadedFile("images.zip", _zip_bytes({"SCOPE-ZIP.png": _png_bytes()}), content_type="application/zip")
    response = client.post("/api/v1/media/assets/upload_zip/", {"file": upload, "company_scope_reference": str(vendor_company.id if actor == "admin" else other.id)}, format="multipart")
    assert response.status_code == 200 and response.data["created"] == 1, response.data
    asset = MediaAsset.objects.get(owner_record_id=product.id)
    assert asset.company_scope_reference == vendor_company.id
    assert not MediaAsset.objects.filter(owner_record_id=foreign.id).exists()


def test_admin_unqualified_duplicate_sku_is_not_first_match(admin_client, vendor_company, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    other = Company.objects.create(name="Another supplier", slug="another-image-supplier", company_type="vendor")
    products = [_make_product(company, sku="SHARED-ZIP") for company in (vendor_company, other)]
    upload = SimpleUploadedFile("images.zip", _zip_bytes({"SHARED-ZIP.png": _png_bytes()}), content_type="application/zip")
    response = admin_client.post("/api/v1/media/assets/upload_zip/", {"file": upload}, format="multipart")
    assert response.status_code == 200, response.data
    assert response.data["created"] == 0 and not MediaAsset.objects.filter(owner_record_id__in=[product.id for product in products]).exists()
