"""Audit app URL routes."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.audit.views import (
    AuditRecordViewSet, FileTrackingRecordViewSet,
    ImportBatchViewSet, ExportBatchViewSet
)

router = DefaultRouter()
router.register("file-tracking", FileTrackingRecordViewSet, basename="file-tracking")
router.register("import-batches", ImportBatchViewSet, basename="import-batch")
router.register("export-batches", ExportBatchViewSet, basename="export-batch")
router.register("records", AuditRecordViewSet, basename="audit-record")
router.register("", AuditRecordViewSet, basename="audit")

urlpatterns = [
    path("", include(router.urls)),
]
