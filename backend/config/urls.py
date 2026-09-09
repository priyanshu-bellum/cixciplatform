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
            
        buyer_paths = {
            "/api/v1/catalog/products/",
            "/api/v1/catalog/products/{id}/",
            "/api/v1/catalog/my-projection/",
            "/api/v1/catalog/my-projection/refresh/",
            "/api/v1/catalog/export-jobs/",
            "/api/v1/catalog/export-jobs/create_job/",
            "/api/v1/catalog/export-jobs/list_jobs/",
            "/api/v1/catalog/export-jobs/{id}/",
            "/api/v1/catalog/export-jobs/{id}/download/",
            "/api/v1/procurement/purchase-orders/",
            "/api/v1/procurement/purchase-orders/{id}/",
            "/api/v1/procurement/purchase-orders/{id}/lines/",
            "/api/v1/routing/orders/",
            "/api/v1/routing/orders/{id}/",
            "/api/v1/routing/orders/{id}/suborders/",
            "/api/v1/routing/orders/{id}/lines/",
            "/api/v1/fulfillment/handoffs/import-shipping/",
            "/api/v1/fulfillment/return-requests/",
            "/api/v1/fulfillment/return-requests/{id}/",
        }
        
        data["paths"] = {p: item for p, item in data.get("paths", {}).items() if p in buyer_paths}
        data["info"]["title"] = "CIXCI Buyer Integration API Documentation"
        data["info"]["description"] = "Dedicated OpenAPI documentation for Buyer MVNO integration covering Accessory Catalog & Export, Purchase Orders & Shipping, and Return Requests."
        
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
