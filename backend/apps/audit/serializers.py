"""Audit app serializers."""
from rest_framework import serializers
from apps.audit.models import AuditRecord


class AuditRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditRecord
        fields = "__all__"
