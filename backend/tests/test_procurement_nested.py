import pytest
import uuid
from apps.catalog.models import Product
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine

@pytest.fixture
def product(buyer_user):
    """A product scoped to buyer_user's company, compatible with a device in their portfolio."""
    from apps.devices.models import Device, DeviceType, Manufacturer
    from apps.devices.services import add_device_to_portfolio
    from apps.catalog.models import ProductCompatibilityAssertion

    p = Product.objects.create(
        name="Test Accessory",
        sku="ACC-001",
        brand="TestBrand",
        product_type="accessory",
        status="active",
        selling_status="for_sale",
        launch_date="2026-06-18",
        compatibility_status="complete",
        company_scope_reference=buyer_user.entity.company_id,
        vendor_company_reference=uuid.uuid4(),
    )

    dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone")
    mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
    device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)

    add_device_to_portfolio(buyer_user, device.id)

    ProductCompatibilityAssertion.objects.create(
        product=p,
        device_reference=device.id,
        is_compatible=True,
        is_excluded=False
    )
    return p

@pytest.mark.django_db
class TestProcurementNestedApi:
    def test_create_nested_purchase_order(self, buyer_client, buyer_user, product):
        vendor_ref = product.vendor_company_reference
        
        # Prepare product pricing and inventory
        product.vendor_wholesale_price_amount = 15.00
        product.inventory_level = 50
        product.status = "active"
        product.save()
        
        url = "/api/v1/procurement/purchase-orders/"
        payload = {
            "vendor_company_reference": str(vendor_ref),
            "po_number": "PO-TEST-12345",
            "currency": "USD",
            "lines": [
                {
                    "product_reference": str(product.id),
                    "quantity": 3
                }
            ]
        }
        
        response = buyer_client.post(url, payload, format="json")
        assert response.status_code == 201, response.data
        
        po_id = response.data["id"]
        po = PurchaseOrder.objects.get(id=po_id)
        assert po.po_number == "PO-TEST-12345"
        assert float(po.total_amount) == 45.00  # 15.00 * 3
        
        # Check lines endpoint
        lines_url = f"/api/v1/procurement/purchase-orders/{po_id}/lines/"
        lines_response = buyer_client.get(lines_url)
        assert lines_response.status_code == 200
        assert len(lines_response.data) == 1
        assert lines_response.data[0]["product_reference"] == str(product.id)
        assert int(lines_response.data[0]["quantity"]) == 3
        assert float(lines_response.data[0]["unit_price_snapshot"]) == 15.00
        assert float(lines_response.data[0]["line_total"]) == 45.00

    def test_create_purchase_order_out_of_stock_fails(self, buyer_client, buyer_user, product):
        vendor_ref = product.vendor_company_reference
        
        # Set product status to out_of_stock
        product.status = "out_of_stock"
        product.save()
        
        url = "/api/v1/procurement/purchase-orders/"
        payload = {
            "vendor_company_reference": str(vendor_ref),
            "po_number": "PO-TEST-54321",
            "currency": "USD",
            "lines": [
                {
                    "product_reference": str(product.id),
                    "quantity": 1
                }
            ]
        }
        
        response = buyer_client.post(url, payload, format="json")
        assert response.status_code == 400
        assert "Out of Stock" in str(response.data)
