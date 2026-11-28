"""A product that is visible and exportable with an approved vendor JPEG can also be ordered.

Order acceptance used a stricter image rule (transparent PNG only) than visibility
and export, so buyers could see and export Balaji products that an order refused.
"""
import decimal
import uuid

import pytest
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product, ProductStatus
from apps.catalog.offer_services import freeze_export_selection
from apps.media.models import MediaAsset
from tests.assortment import buyer_assortment_for

pytestmark = pytest.mark.django_db


def order(client, vendor_company, buyer_company, sku):
    return client.post("/api/v1/routing/orders/", {
        "vendor_id": str(vendor_company.id), "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.test",
        "address1": "1 Main Street", "address2": "", "city": "Austin", "state": "TX", "zip_code": "78701",
        "sku": sku, "product_name": "JPEG Case", "vendor_color": "Black", "quantity": 1, "upc": "810000000001",
        "order_date_time": timezone.now().isoformat(), "buyer_id": str(buyer_company.id),
        "buyer_order_number": "JPEG-ORD-" + uuid.uuid4().hex[:6]}, format="json")


@pytest.mark.parametrize("mime,transparent,review,accepted", [
    ("image/jpeg", False, "approved", True),
    ("image/png", True, "approved", True),
    ("image/jpeg", False, "pending", False),
])
def test_order_uses_the_same_image_rule_as_visibility(mime, transparent, review, accepted, settings, buyer_client, buyer_user,
        buyer_company, vendor_company):
    settings.MEDIA_READINESS_ENFORCE_BUYER = True
    product = Product.objects.create(sku="JPEG-SKU-1", name="JPEG Case", upc="810000000001", color="Black",
        vendor_wholesale_price_amount=decimal.Decimal("5.00"), msrp=decimal.Decimal("20.00"), selling_status="for_sale",
        vendor_company_reference=vendor_company.id, company_scope_reference=vendor_company.id, status=ProductStatus.ACTIVE,
        launch_date=timezone.now().date())
    asset = MediaAsset.objects.create(asset_type="product_image", status="ready", review_status=review, owner_module="catalog",
        owner_record_id=product.pk, company_scope_reference=vendor_company.id, original_filename="primary.jpg",
        file_extension=".jpg" if mime == "image/jpeg" else ".png", mime_type=mime, has_transparency=transparent,
        content_hash=uuid.uuid4().hex, storage_key=f"{vendor_company.id}/product_image/{uuid.uuid4()}/primary")
    Product.objects.filter(pk=product.pk).update(primary_image_reference=asset.pk)
    buyer_assortment_for(buyer_user)(product)
    with transaction.atomic():
        selection = freeze_export_selection(product=product, company=buyer_company, entity=buyer_user.entity, actor=buyer_user)
    type(selection).objects.filter(pk=selection.pk).update(exported_at=timezone.now() - timezone.timedelta(days=1))

    response = order(buyer_client, vendor_company, buyer_company, product.sku)
    if accepted:
        assert response.status_code == 201, response.content
    else:
        assert response.status_code == 400
        assert b"OFFER_NOT_ORDERABLE" in response.content
