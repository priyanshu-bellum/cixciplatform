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

api_v1 = [
    # ── Phase 1: Foundation ───────────────────────────────────
    path("auth/",           include(auth_urls)),
    path("tenant/",         include(tenant_urls)),
    path("audit/",          include(([], "audit"))),          # PR-A/B exposed via audit events only

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

urlpatterns = [
    path("admin/",          admin.site.urls),
    path("api/v1/",         include(api_v1)),
    # OpenAPI docs
    path("api/schema/",     SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/",       SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/",      SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
