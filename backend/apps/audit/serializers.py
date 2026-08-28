"""Audit app serializers."""
from rest_framework import serializers
from apps.audit.models import AuditRecord, FileTrackingRecord


class AuditRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditRecord
        fields = "__all__"


class FileTrackingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileTrackingRecord
        fields = "__all__"
