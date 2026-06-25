"""Device Catalog URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeviceTypeViewSet, ManufacturerViewSet, DeviceViewSet,
    FeatureGroupViewSet, FeatureValueViewSet,
    DataQualityExceptionViewSet, BuyerPortfolioViewSet,
)

router = DefaultRouter()
router.register("types", DeviceTypeViewSet, basename="device-type")
router.register("manufacturers", ManufacturerViewSet, basename="manufacturer")
router.register("devices", DeviceViewSet, basename="device")
router.register("feature-groups", FeatureGroupViewSet, basename="feature-group")
router.register("feature-values", FeatureValueViewSet, basename="feature-value")
router.register("dqe", DataQualityExceptionViewSet, basename="dqe")
router.register("portfolio", BuyerPortfolioViewSet, basename="portfolio")

urlpatterns = [path("", include(router.urls))]
