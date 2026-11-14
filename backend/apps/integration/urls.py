from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .catalog_api import VendorCatalogConnectionViewSet
from .catalog_brands_api import BrandViewSet, VendorBrandRelationshipViewSet
from .commerce_api import VendorCommerceProfileViewSet
from .storefront_api import BuyerStorefrontViewSet
from .webhook_receiver import WebhookReceiverView
from .operations_api import DispatchViewSet, WebhookReceiptViewSet, PollRunViewSet
from apps.catalog.offer_api import ExportMappingViewSet
router = DefaultRouter()
router.register('vendor-catalog-connections', VendorCatalogConnectionViewSet, basename='vendor-catalog-connection')
router.register('vendor-commerce-profiles', VendorCommerceProfileViewSet, basename='vendor-commerce-profile')
router.register('catalog-brands', BrandViewSet, basename='catalog-brand')
router.register('vendor-brand-relationships', VendorBrandRelationshipViewSet, basename='vendor-brand-relationship')
router.register('buyer-storefronts', BuyerStorefrontViewSet, basename='buyer-storefront')
router.register('buyer-export-mappings', ExportMappingViewSet, basename='buyer-export-mapping')
router.register('operations/dispatches', DispatchViewSet, basename='operations-dispatch')
router.register('operations/webhook-receipts', WebhookReceiptViewSet, basename='operations-webhook-receipt')
router.register('operations/poll-runs', PollRunViewSet, basename='operations-poll-run')
urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/<uuid:receiver_id>/', WebhookReceiverView.as_view(), name='vendor-webhook-receiver'),
]
