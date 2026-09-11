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

class BuyerSchemaView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        schema_path = os.path.join(settings.BASE_DIR, "schema.yml")
        if not os.path.exists(schema_path):
            return Response({"error": "Schema file not found"}, status=404)
        
        with open(schema_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        # Precise Buyer API specification matching the 4 data flow use cases:
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

            # ── 2. Orders: CIXCI Receives Order Information from Buyer ──
            "/api/v1/routing/orders/": {
                "methods": {"get", "post"},
                "tag": "2. Orders (Customer Purchases)",
            },
            "/api/v1/routing/orders/{id}/": {
                "methods": {"get"},
                "tag": "2. Orders (Customer Purchases)",
            },

            # ── 3. Shipping: CIXCI Sends Shipping Information to Buyer ──
            "/api/v1/fulfillment/handoffs/": {
                "methods": {"get"},
                "tag": "3. Shipping (Order Tracking & Delivery)",
            },
            "/api/v1/fulfillment/handoffs/{id}/": {
                "methods": {"get"},
                "tag": "3. Shipping (Order Tracking & Delivery)",
            },

            # ── 4. Returns: Return Information & Confirmations ──
            "/api/v1/fulfillment/return-requests/": {
                "methods": {"get", "post"},
                "tag": "4. Returns (RMA & Confirmations)",
            },
            "/api/v1/fulfillment/return-requests/{id}/": {
                "methods": {"get"},
                "tag": "4. Returns (RMA & Confirmations)",
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
            "to integrate with CIXCI across the 4 core use cases:\n\n"
            "1. **CIXCI Sends Selected Product Data to Buyer**: Product IDs, descriptions, pricing (MSRP, buyer wholesale), and inventory levels.\n"
            "2. **CIXCI Receives Order Information from Buyer**: Customer purchase details, shipping destination, product lines, quantities, and transaction dates.\n"
            "3. **CIXCI Sends Shipping Information to Buyer**: Tracking numbers, shipping carriers, order status, shipped dates, and delivery evidence.\n"
            "4. **Return Information**: Return requests (RAN), return confirmations, restocking fees, item inspection conditions, refund statuses, and vendor return addresses."
        )
        data["tags"] = [
            {
                "name": "1. Products (Catalog & Export)",
                "description": "Retrieve available accessory products and generate/download catalog export feeds (JSON / CSV)."
            },
            {
                "name": "2. Orders (Customer Purchases)",
                "description": "Submit customer purchase orders to CIXCI and monitor processing status."
            },
            {
                "name": "3. Shipping (Order Tracking & Delivery)",
                "description": "Access vendor fulfillment details, shipping carriers, tracking numbers, and delivery status."
            },
            {
                "name": "4. Returns (RMA & Confirmations)",
                "description": "Submit customer return requests and receive vendor return confirmations, restocking fees, and refund statuses."
            },
        ]
        
        return Response(data)

urlpatterns = [
    path("admin/",          admin.site.urls),
    path("api/v1/",         include(api_v1)),
    # Overall OpenAPI docs
    path("api/schema/",     SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/",       SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/",      SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Dedicated Buyer API docs
    path("api/buyer-schema/", BuyerSchemaView.as_view(), name="buyer-schema"),
    path("api/buyer-docs/",   SpectacularSwaggerView.as_view(url_name="buyer-schema"), name="buyer-swagger-ui"),
    path("api/buyer-redoc/",  SpectacularRedocView.as_view(url_name="buyer-schema"), name="buyer-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
