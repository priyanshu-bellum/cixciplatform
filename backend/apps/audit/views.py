"""Audit app ViewSets."""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.audit.models import AuditRecord
from apps.audit.serializers import AuditRecordSerializer


class AuditRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditRecord.objects.all().order_by("-id")
    serializer_class = AuditRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return AuditRecord.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return AuditRecord.objects.all().order_by("-id")
        if getattr(user, "company", None):
            return AuditRecord.objects.filter(company_scope_reference=user.company.id).order_by("-id")
        return AuditRecord.objects.none()
