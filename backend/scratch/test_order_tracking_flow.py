import os
import sys
import django
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import Company, User
from apps.catalog.models import Product
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
from apps.fulfillment.models import FulfillmentHandoff, ReturnRequest
from rest_framework.test import APIClient

# Find Telco Cellular company
telco_co = Company.objects.filter(name__icontains="Telco").first()
print(f"Telco Company: {telco_co.name} ({telco_co.id})")

# Let's list some active products
products = Product.objects.filter(status="active")
print(f"Total active products: {products.count()}")
product = products.first()
print(f"Testing with Product: {product.name} (SKU: {product.sku}, Vendor: {product.vendor_company_reference})")

# Initialize APIClient
client = APIClient()
# Set headers exactly like telcoApi does
client.credentials(HTTP_X_API_KEY='cixci_key_fab27b938452fc44e137592f38f7ada03de80374ecffca3f')

# 1. Place a test order (Checkout)
# The frontend POSTs to /api/v1/procurement/purchase-orders/
import random
random_po_suffix = random.randint(100000, 999999)

payload = {
    "vendor_company_reference": str(product.vendor_company_reference),
    "po_number": f"PO-TELCO-{random_po_suffix}",
    "currency": "USD",
    "lines": [
        {
            "product_reference": str(product.id),
            "quantity": 2
        }
    ],
    "customer_shipping": {
        "customer_first_name": "Test",
        "customer_last_name": "Buyer",
        "address_1": "123 MVNO Blvd",
        "address_2": "Suite 404",
        "city": "Boston",
        "state": "MA",
        "zip": "02108",
        "country": "US"
    }
}

print("\n--- Placing purchase order ---")
response = client.post("/api/v1/procurement/purchase-orders/", payload, format="json")
print("Status Code:", response.status_code)
if response.status_code not in [200, 201]:
    print("Failed Content:", response.content[:1000])
assert response.status_code in [200, 201], f"Failed checkout with status {response.status_code}"
order_data = response.json()
print("Order placed successfully. PO Number:", order_data.get("po_number"))
po_id = order_data.get("id")

# Wait, let's verify routing/orders endpoint
print("\n--- Fetching buyer orders ---")
response = client.get("/api/v1/routing/orders/")
print("Status Code:", response.status_code)
orders_list = response.json()
print("Found orders count:", len(orders_list.get("results", orders_list)))

# Get suborders of this PO
# The coordination layer automatically routes the PO lines into Suborders.
print("\n--- Fetching suborders for PO ---")
response = client.get(f"/api/v1/routing/orders/{po_id}/suborders/")
print("Status Code:", response.status_code)
suborders = response.json()
print("Suborders count:", len(suborders))
suborder = suborders[0]
suborder_id = suborder.get("id")
print("Suborder ID:", suborder_id)
print("Suborder Status:", suborder.get("status"))

# Let's perform Mock Ship
# The frontend submits CSV data containing the buyer shipping import format.
csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date"
csv_row_shipped = f"Testretail,Test,Buyer,123 MVNO Blvd,Suite 404,Boston,MA,02108,{suborder_id},{product.sku},{product.upc or ''},2,CONF123,UPS,TRK12345,2026-08-01,"
csv_payload = f"{csv_header}\n{csv_row_shipped}"

print("\n--- Performing Mock Ship ---")
# Import shipping via file upload simulation
from django.core.files.uploadedfile import SimpleUploadedFile
csv_file = SimpleUploadedFile("shipping.csv", csv_payload.encode("utf-8"), content_type="text/csv")
response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file}, format="multipart")
print("Status Code:", response.status_code)
print("Response:", response.json())

# Check suborder status again
response = client.get(f"/api/v1/routing/orders/{po_id}/suborders/")
suborder = response.json()[0]
print("After Mock Ship Status:", suborder.get("status"))
assert suborder.get("status") == "shipped"

# Let's perform Mock Deliver
csv_row_delivered = f"Testretail,Test,Buyer,123 MVNO Blvd,Suite 404,Boston,MA,02108,{suborder_id},{product.sku},{product.upc or ''},2,CONF123,UPS,TRK12345,2026-08-01,2026-08-02"
csv_payload_delivered = f"{csv_header}\n{csv_row_delivered}"
csv_file_delivered = SimpleUploadedFile("shipping_delivered.csv", csv_payload_delivered.encode("utf-8"), content_type="text/csv")
print("\n--- Performing Mock Deliver ---")
response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file_delivered}, format="multipart")
print("Status Code:", response.status_code)
print("Response:", response.json())

# Check suborder status again
response = client.get(f"/api/v1/routing/orders/{po_id}/suborders/")
suborder = response.json()[0]
print("After Mock Deliver Status:", suborder.get("status"))
assert suborder.get("status") == "delivered"

# Let's submit a Return Request
# The frontend POSTs to /api/v1/fulfillment/return-requests/
po_obj = PurchaseOrder.objects.get(id=po_id)
return_payload = {
    "suborder_reference": suborder_id,
    "buyer_reference": str(po_obj.company_scope_reference),
    "sku": product.sku,
    "upc": product.upc or "N/A",
    "quantity": 1,
    "reason": "Test defective item"
}
print("\n--- Submitting Return Request ---")
response = client.post("/api/v1/fulfillment/return-requests/", return_payload, format="json")
print("Status Code:", response.status_code)
assert response.status_code in [200, 201], f"Failed return submission: {response.content}"
return_data = response.json()
print("Return request submitted. RAN:", return_data.get("ran"))

# List return requests
print("\n--- Fetching return requests history ---")
response = client.get("/api/v1/fulfillment/return-requests/")
print("Status Code:", response.status_code)
returns_list = response.json()
print("Total Return Requests:", len(returns_list.get("results", returns_list)))
print("E2E order tracking and return verification SUCCESS!")
