"""Audit app ViewSets."""
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from apps.audit.models import AuditRecord, FileTrackingRecord, FileDirection
from apps.audit.serializers import AuditRecordSerializer, FileTrackingRecordSerializer


class AuditRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditRecord.objects.all().order_by("-created_at", "-id")
    serializer_class = AuditRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["source_module", "company_scope_reference", "actor_reference", "status", "source_record_type", "event_code"]
    search_fields = ["event_code", "event_description", "source_module"]
    ordering_fields = ["created_at", "id", "event_code", "source_module"]
    ordering = ["-created_at", "-id"]

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        if user and not getattr(user, "is_cixci_admin", False):
            company = getattr(user, "company", None)
            if company and getattr(company, "company_type", None) == "buyer":
                raise PermissionDenied("Buyer users cannot access audit logs.")

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return AuditRecord.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return AuditRecord.objects.all().order_by("-created_at", "-id")
        if getattr(user, "company", None):
            return AuditRecord.objects.filter(company_scope_reference=user.company.id).order_by("-created_at", "-id")
        return AuditRecord.objects.none()


class FileTrackingRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FileTrackingRecord.objects.all().order_by("-created_at", "-id")
    serializer_class = FileTrackingRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["file_direction", "file_purpose", "file_lifecycle_status", "source_module", "company_scope_reference", "vendor_reference"]
    search_fields = ["file_name", "file_type", "source_module"]
    ordering_fields = ["created_at", "id", "file_name"]
    ordering = ["-created_at", "-id"]

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        if user and not getattr(user, "is_cixci_admin", False):
            company = getattr(user, "company", None)
            if company and getattr(company, "company_type", None) == "buyer":
                raise PermissionDenied("Buyer users cannot access file tracking logs.")

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return FileTrackingRecord.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return FileTrackingRecord.objects.all().order_by("-created_at", "-id")
        if getattr(user, "company", None):
            return FileTrackingRecord.objects.filter(company_scope_reference=user.company.id).order_by("-created_at", "-id")
        return FileTrackingRecord.objects.none()


class ImportBatchViewSet(FileTrackingRecordViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(file_direction=FileDirection.INBOUND)


class ExportBatchViewSet(FileTrackingRecordViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(file_direction=FileDirection.OUTBOUND)
