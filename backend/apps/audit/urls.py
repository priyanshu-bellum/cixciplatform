"""Audit app URL routes."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.audit.views import AuditRecordViewSet

router = DefaultRouter()
router.register("records", AuditRecordViewSet, basename="audit-record")
router.register("", AuditRecordViewSet, basename="audit")

urlpatterns = [
    path("", include(router.urls)),
]
