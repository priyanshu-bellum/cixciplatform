"""CIXCI URL Configuration — All 14 modules wired."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Phase 1 — Foundation
from apps.tenant.urls.auth import urlpatterns as auth_urls
from apps.tenant.urls.tenant import urlpatterns as tenant_urls

# Phase 2 — Catalog (each module's api.py / urls.py)
from apps.devices.urls import urlpatterns as device_urls
from apps.catalog.api import urlpatterns as catalog_urls
from apps.notification.api import urlpatterns as notification_urls

# Phase 3 — Commerce
from apps.pricing.api import urlpatterns as pricing_urls
from apps.routing.api import urlpatterns as routing_urls
from apps.fulfillment.api import urlpatterns as fulfillment_urls

# Phase 4 — Finance
from apps.invoicing.api import urlpatterns as invoicing_urls

# Shared (Media, Analytics, Integration, Procurement, Launch)
from apps.shared_api import (
    media_urlpatterns, analytics_urlpatterns,
    integration_urlpatterns, procurement_urlpatterns, launch_urlpatterns,
)

from apps.audit.urls import urlpatterns as audit_urls

api_v1 = [
    # ── Phase 1: Foundation ───────────────────────────────────
    path("auth/",           include(auth_urls)),
    path("tenant/",         include(tenant_urls)),
    path("audit/",          include(audit_urls)),


    # ── Phase 2: Catalog ──────────────────────────────────────
    path("devices/",        include(device_urls)),
    path("catalog/",        include(catalog_urls)),
    path("media/",          include(media_urlpatterns)),
    path("notifications/",  include(notification_urls)),

    # ── Phase 3: Commerce ─────────────────────────────────────
    path("pricing/",        include(pricing_urls)),
    path("routing/",        include(routing_urls)),
    path("fulfillment/",    include(fulfillment_urls)),

    # ── Phase 4: Finance ──────────────────────────────────────
    path("invoicing/",      include(invoicing_urls)),
    path("integration/",    include(integration_urlpatterns)),

    # ── Phase 5: Intelligence ─────────────────────────────────
    path("analytics/",      include(analytics_urlpatterns)),
    path("procurement/",    include(procurement_urlpatterns)),

    # ── Phase 6: Launch ───────────────────────────────────────
    path("launch/",         include(launch_urlpatterns)),
]

import os
import yaml
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


# ─── Admin Schema: full internal schema, restricted to CIXCI admins ────────────

class AdminSchemaView(APIView):
    """
    Serves the full unfiltered OpenAPI schema. Only accessible to authenticated
    CIXCI system admins. Do NOT expose this URL publicly.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not getattr(request.user, "is_cixci_admin", False):
            return Response(
                {"detail": "Access restricted to CIXCI system administrators."},
                status=403,
            )
        schema_path = os.path.join(settings.BASE_DIR, "schema.yml")
        if not os.path.exists(schema_path):
            return Response({"error": "Schema file not found"}, status=404)
        with open(schema_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        data["info"]["title"] = "CIXCI Internal API — System Admin Reference"
        data["info"]["description"] = (
            "## Internal API Reference (CIXCI System Admins only)\n\n"
            "This schema covers all 14 CIXCI modules. It is not intended for "
            "Buyer or Vendor integration. Access is restricted to authenticated "
            "CIXCI system administrators."
        )
        return Response(data)


# ─── Vendor Schema: vendor-facing endpoints only ──────────────────────────────

class VendorSchemaView(APIView):
    """
    Filtered OpenAPI schema exposing only the endpoints that Accessory Vendors
    need to interact with on the CIXCI platform.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        schema_path = os.path.join(settings.BASE_DIR, "schema.yml")
        if not os.path.exists(schema_path):
            return Response({"error": "Schema file not found"}, status=404)
        with open(schema_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # Vendor API specification — 6 areas vendors interact with:
        vendor_endpoint_config = {
            # ── 1. Product Catalog: Vendors manage their own products ──
            "/api/v1/catalog/products/": {
                "methods": {"get", "post"},
                "tag": "1. Products (Vendor Catalog Management)",
            },
            "/api/v1/catalog/products/{id}/": {
                "methods": {"get", "put", "patch", "delete"},
                "tag": "1. Products (Vendor Catalog Management)",
            },
            "/api/v1/catalog/export-jobs/create_job/": {
                "methods": {"post"},
                "tag": "1. Products (Vendor Catalog Management)",
            },
            "/api/v1/catalog/export-jobs/list_jobs/": {
                "methods": {"get"},
                "tag": "1. Products (Vendor Catalog Management)",
            },
            "/api/v1/catalog/export-jobs/{id}/": {
                "methods": {"get"},
                "tag": "1. Products (Vendor Catalog Management)",
            },
            "/api/v1/catalog/export-jobs/{id}/download/": {
                "methods": {"get"},
                "tag": "1. Products (Vendor Catalog Management)",
            },

            # ── 2. Pricing: Vendors view their pricing profiles & snapshots ──
            "/api/v1/pricing/profiles/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },
            "/api/v1/pricing/profiles/{id}/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },
            "/api/v1/pricing/snapshots/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },
            "/api/v1/pricing/snapshots/{id}/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },
            "/api/v1/pricing/exceptions/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },
            "/api/v1/pricing/exceptions/{id}/": {
                "methods": {"get"},
                "tag": "2. Pricing (Vendor Price Profiles)",
            },

            # ── 3. Orders: Vendors see suborders routed to them ──
            "/api/v1/routing/orders/": {
                "methods": {"get"},
                "tag": "3. Orders (Routed Suborders)",
            },
            "/api/v1/routing/orders/{id}/": {
                "methods": {"get"},
                "tag": "3. Orders (Routed Suborders)",
            },
            "/api/v1/routing/export-logs/": {
                "methods": {"get", "post"},
                "tag": "3. Orders (Routed Suborders)",
            },
            "/api/v1/routing/export-logs/{id}/": {
                "methods": {"get"},
                "tag": "3. Orders (Routed Suborders)",
            },

            # ── 4. Fulfillment: Vendors submit shipping & return updates ──
            "/api/v1/fulfillment/handoffs/": {
                "methods": {"get", "post"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/handoffs/{id}/": {
                "methods": {"get", "patch"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/shipping-import-logs/": {
                "methods": {"get", "post"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/shipping-import-logs/{id}/": {
                "methods": {"get"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/return-requests/": {
                "methods": {"get"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/return-requests/{id}/": {
                "methods": {"get"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/return-import-logs/": {
                "methods": {"get", "post"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },
            "/api/v1/fulfillment/return-import-logs/{id}/": {
                "methods": {"get"},
                "tag": "4. Fulfillment (Shipping & Returns)",
            },

            # ── 5. Devices: Read-only reference catalog for compatibility ──
            "/api/v1/devices/types/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },
            "/api/v1/devices/types/{id}/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },
            "/api/v1/devices/manufacturers/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },
            "/api/v1/devices/manufacturers/{id}/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },
            "/api/v1/devices/devices/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },
            "/api/v1/devices/devices/{id}/": {
                "methods": {"get"},
                "tag": "5. Devices (Reference Catalog)",
            },

            # ── 6. Invoicing: Vendors view invoices issued to/from them ──
            "/api/v1/invoicing/invoices/": {
                "methods": {"get"},
                "tag": "6. Invoicing (Vendor Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/": {
                "methods": {"get"},
                "tag": "6. Invoicing (Vendor Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/lines/": {
                "methods": {"get"},
                "tag": "6. Invoicing (Vendor Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/adjustments/": {
                "methods": {"get"},
                "tag": "6. Invoicing (Vendor Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/reconciliation/": {
                "methods": {"get", "post"},
                "tag": "6. Invoicing (Vendor Invoices)",
            },
        }

        filtered_paths = {}
        for path_pattern, config in vendor_endpoint_config.items():
            if path_pattern in data.get("paths", {}):
                path_item = data["paths"][path_pattern]
                filtered_ops = {}
                for method, op in path_item.items():
                    if method.lower() in config["methods"]:
                        op_copy = dict(op)
                        op_copy["tags"] = [config["tag"]]
                        filtered_ops[method] = op_copy
                if filtered_ops:
                    filtered_paths[path_pattern] = filtered_ops

        data["paths"] = filtered_paths
        data["info"]["title"] = "CIXCI Vendor Integration API Documentation"
        data["info"]["version"] = "1.0.0"
        data["info"]["description"] = (
            "## API Integration Specifications for Accessory Vendors\n\n"
            "This documentation covers the endpoints that Accessory Vendors use "
            "to integrate with the CIXCI platform across 6 areas:\n\n"
            "1. **Products (Catalog Management)**: Create and manage your accessory product listings, descriptions, pricing inputs, and export feeds.\n"
            "2. **Pricing (Price Profiles)**: View your pricing profiles, effective price snapshots, and MAP exception records.\n"
            "3. **Orders (Routed Suborders)**: View suborders routed to your company and manage export logs for your order fulfillment workflow.\n"
            "4. **Fulfillment (Shipping & Returns)**: Submit shipping tracking updates, import fulfillment CSVs, view and process return requests.\n"
            "5. **Devices (Reference Catalog)**: Read-only access to the device reference catalog for product compatibility mapping.\n"
            "6. **Invoicing (Vendor Invoices)**: View invoices issued to or from your company, line items, adjustments, and submit reconciliation uploads."
        )
        data["tags"] = [
            {
                "name": "1. Products (Vendor Catalog Management)",
                "description": "Create, update, and manage your accessory product listings in the CIXCI catalog."
            },
            {
                "name": "2. Pricing (Vendor Price Profiles)",
                "description": "View pricing profiles, effective price snapshots, and MAP price exception records for your products."
            },
            {
                "name": "3. Orders (Routed Suborders)",
                "description": "View suborders routed to your company by CIXCI and manage order export logs."
            },
            {
                "name": "4. Fulfillment (Shipping & Returns)",
                "description": "Submit shipment tracking updates, upload fulfillment CSVs, and process customer return requests."
            },
            {
                "name": "5. Devices (Reference Catalog)",
                "description": "Read-only device reference catalog for verifying product compatibility with device types and manufacturers."
            },
            {
                "name": "6. Invoicing (Vendor Invoices)",
                "description": "View invoices, line items, and adjustments. Upload vendor reconciliation files against CIXCI invoices."
            },
        ]
        return Response(data)


# ─── Buyer Schema ──────────────────────────────────────────────────────────────

class BuyerSchemaView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        schema_path = os.path.join(settings.BASE_DIR, "schema.yml")
        if not os.path.exists(schema_path):
            return Response({"error": "Schema file not found"}, status=404)
        
        with open(schema_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        # Buyer API specification — 7 areas covering all buyer-facing data flows:
        buyer_endpoint_config = {
            # ── 1. Products: CIXCI Sends Selected Product Data to Buyer ──
            "/api/v1/catalog/products/": {
                "methods": {"get"},
                "tag": "1. Products (Catalog & Export)",
            },
            "/api/v1/catalog/products/{id}/": {
                "methods": {"get"},
                "tag": "1. Products (Catalog & Export)",
            },
            "/api/v1/catalog/export-jobs/create_job/": {
                "methods": {"post"},
                "tag": "1. Products (Catalog & Export)",
            },
            "/api/v1/catalog/export-jobs/list_jobs/": {
                "methods": {"get"},
                "tag": "1. Products (Catalog & Export)",
            },
            "/api/v1/catalog/export-jobs/{id}/": {
                "methods": {"get"},
                "tag": "1. Products (Catalog & Export)",
            },
            "/api/v1/catalog/export-jobs/{id}/download/": {
                "methods": {"get"},
                "tag": "1. Products (Catalog & Export)",
            },

            # ── 2. Devices: Device Reference Catalog & Buyer Portfolio ──
            "/api/v1/devices/types/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/types/{id}/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/manufacturers/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/manufacturers/{id}/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/devices/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/devices/{id}/": {
                "methods": {"get"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/portfolio/": {
                "methods": {"get", "post"},
                "tag": "2. Devices (Reference Catalog)",
            },
            "/api/v1/devices/portfolio/{id}/": {
                "methods": {"get", "patch"},
                "tag": "2. Devices (Reference Catalog)",
            },

            # ── 3. Orders: CIXCI Receives Order Information from Buyer ──
            "/api/v1/routing/orders/": {
                "methods": {"get", "post"},
                "tag": "3. Orders (Customer Purchases)",
            },
            "/api/v1/routing/orders/{id}/": {
                "methods": {"get"},
                "tag": "3. Orders (Customer Purchases)",
            },

            # ── 4. Procurement: Buyer Purchase Orders to CIXCI ──
            "/api/v1/procurement/purchase-orders/": {
                "methods": {"get", "post"},
                "tag": "4. Procurement (Purchase Orders)",
            },
            "/api/v1/procurement/purchase-orders/{id}/": {
                "methods": {"get"},
                "tag": "4. Procurement (Purchase Orders)",
            },
            "/api/v1/procurement/purchase-orders/{id}/lines/": {
                "methods": {"get"},
                "tag": "4. Procurement (Purchase Orders)",
            },
            "/api/v1/procurement/purchase-orders/{id}/approve/": {
                "methods": {"post"},
                "tag": "4. Procurement (Purchase Orders)",
            },

            # ── 5. Shipping: CIXCI Sends Shipping Information to Buyer ──
            "/api/v1/fulfillment/handoffs/": {
                "methods": {"get"},
                "tag": "5. Shipping (Order Tracking & Delivery)",
            },
            "/api/v1/fulfillment/handoffs/{id}/": {
                "methods": {"get"},
                "tag": "5. Shipping (Order Tracking & Delivery)",
            },

            # ── 6. Returns: Return Information & Confirmations ──
            "/api/v1/fulfillment/return-requests/": {
                "methods": {"get", "post"},
                "tag": "6. Returns (RMA & Confirmations)",
            },
            "/api/v1/fulfillment/return-requests/{id}/": {
                "methods": {"get"},
                "tag": "6. Returns (RMA & Confirmations)",
            },

            # ── 7. Invoicing: Buyer-facing Invoices & Line Items ──
            "/api/v1/invoicing/invoices/": {
                "methods": {"get"},
                "tag": "7. Invoicing (Buyer Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/": {
                "methods": {"get"},
                "tag": "7. Invoicing (Buyer Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/lines/": {
                "methods": {"get"},
                "tag": "7. Invoicing (Buyer Invoices)",
            },
            "/api/v1/invoicing/invoices/{id}/adjustments/": {
                "methods": {"get"},
                "tag": "7. Invoicing (Buyer Invoices)",
            },
        }

        filtered_paths = {}
        for path_pattern, config in buyer_endpoint_config.items():
            if path_pattern in data.get("paths", {}):
                path_item = data["paths"][path_pattern]
                filtered_ops = {}
                for method, op in path_item.items():
                    if method.lower() in config["methods"]:
                        op_copy = dict(op)
                        op_copy["tags"] = [config["tag"]]
                        filtered_ops[method] = op_copy
                if filtered_ops:
                    filtered_paths[path_pattern] = filtered_ops

        data["paths"] = filtered_paths
        data["info"]["title"] = "CIXCI Buyer Integration API Documentation"
        data["info"]["version"] = "1.0.0"
        data["info"]["description"] = (
            "## Preliminary Data Integration Specifications for Buyers\n\n"
            "This documentation specifies the dedicated API endpoints for Buyers (MVNOs/Carriers) "
            "to integrate with CIXCI across 7 core areas:\n\n"
            "1. **Products (Catalog & Export)**: Product IDs, descriptions, pricing (MSRP, buyer wholesale), and inventory levels.\n"
            "2. **Devices (Reference Catalog)**: Device types, manufacturers, device reference catalog, and buyer device portfolio management.\n"
            "3. **Orders (Customer Purchases)**: Submit customer purchase details, shipping destination, product lines, quantities, and transaction dates.\n"
            "4. **Procurement (Purchase Orders)**: Buyer purchase orders to CIXCI, line items, and approval workflows.\n"
            "5. **Shipping (Order Tracking & Delivery)**: Tracking numbers, shipping carriers, order status, shipped dates, and delivery evidence.\n"
            "6. **Returns (RMA & Confirmations)**: Return requests (RAN), return confirmations, restocking fees, item inspection conditions, and refund statuses.\n"
            "7. **Invoicing (Buyer Invoices)**: Buyer-facing invoices, line items, and adjustments issued by CIXCI."
        )
        data["tags"] = [
            {
                "name": "1. Products (Catalog & Export)",
                "description": "Retrieve available accessory products and generate/download catalog export feeds (JSON / CSV)."
            },
            {
                "name": "2. Devices (Reference Catalog)",
                "description": "Browse the device reference catalog (types, manufacturers, devices) and manage the buyer's device portfolio references."
            },
            {
                "name": "3. Orders (Customer Purchases)",
                "description": "Submit customer purchase orders to CIXCI and monitor processing status."
            },
            {
                "name": "4. Procurement (Purchase Orders)",
                "description": "Create and manage buyer purchase orders to CIXCI, view line items, and trigger approval workflows."
            },
            {
                "name": "5. Shipping (Order Tracking & Delivery)",
                "description": "Access vendor fulfillment details, shipping carriers, tracking numbers, and delivery status."
            },
            {
                "name": "6. Returns (RMA & Confirmations)",
                "description": "Submit customer return requests and receive vendor return confirmations, restocking fees, and refund statuses."
            },
            {
                "name": "7. Invoicing (Buyer Invoices)",
                "description": "View buyer-facing invoices issued by CIXCI, including line items and any applied adjustments."
            },
        ]
        
        return Response(data)

urlpatterns = [
    path("admin/",          admin.site.urls),
    path("api/v1/",         include(api_v1)),

    # ── Internal: CIXCI System Admin only ─────────────────────────────────────
    # /api/docs/ is now restricted — only authenticated CIXCI admins can access it.
    path("api/schema/",        AdminSchemaView.as_view(), name="schema"),
    path("api/docs/",          SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/",         SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # ── External: Buyer API docs ───────────────────────────────────────────────
    path("api/buyer-schema/",  BuyerSchemaView.as_view(), name="buyer-schema"),
    path("api/buyer-docs/",    SpectacularSwaggerView.as_view(url_name="buyer-schema"), name="buyer-swagger-ui"),
    path("api/buyer-redoc/",   SpectacularRedocView.as_view(url_name="buyer-schema"), name="buyer-redoc"),

    # ── External: Vendor API docs ──────────────────────────────────────────────
    path("api/vendor-schema/", VendorSchemaView.as_view(), name="vendor-schema"),
    path("api/vendor-docs/",   SpectacularSwaggerView.as_view(url_name="vendor-schema"), name="vendor-swagger-ui"),
    path("api/vendor-redoc/",  SpectacularRedocView.as_view(url_name="vendor-schema"), name="vendor-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
