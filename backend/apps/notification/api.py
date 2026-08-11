"""Notification Platform Service — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin
from django.utils import timezone
from .models import (
    NotificationTemplate, NotificationPreference,
    NotificationRequest, DeliveryAttempt,
    ActivitySummaryConfiguration, ActivitySummaryDeliveryAttempt,
    InAppNotification
)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = [
            "id", "template_code", "version", "channel", "event_type",
            "subject_template", "body_template", "dynamic_fields",
            "status", "locale", "company_scope", "effective_from", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id", "level", "scope_id", "event_type", "channel",
            "is_enabled", "use_digest", "quiet_hours_start", "quiet_hours_end",
            "is_unsubscribed", "unsubscribed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "unsubscribed_at"]


class NotificationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRequest
        fields = [
            "id", "event_type", "source_module", "source_record_id",
            "safe_payload_summary", "requested_recipient_ids",
            "company_scope_reference", "template_code", "channel",
            "idempotency_key", "preference_outcome", "created_at",
        ]
        read_only_fields = ["id", "created_at", "preference_outcome"]


class DeliveryAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAttempt
        fields = [
            "id", "notification_request", "recipient_id", "channel",
            "status", "provider_name", "attempt_number",
            "sent_at", "delivered_at", "failed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InAppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InAppNotification
        fields = [
            "id", "recipient", "company_scope_reference", "notification_request",
            "event_type", "classification", "title", "body", "source_module",
            "source_record_id", "link", "delivery_mode", "delivery_attempt_reference",
            "audit_reference", "is_read", "read_at", "created_at"
        ]
        read_only_fields = ["id", "recipient", "company_scope_reference", "created_at"]


class ActivitySummaryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivitySummaryConfiguration
        fields = [
            "id", "status", "delivery_times", "schedule_timezone",
            "skip_weekends", "skip_holidays", "explicit_recipient_ids",
            "last_successful_summary_cursor_reference", "created_at",
        ]
        read_only_fields = [
            "id", "created_at", "last_successful_summary_cursor_reference",
        ]


class NotificationTemplateViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    action_capability_map = {
        "list": "notifications.template.list",
        "retrieve": "notifications.template.read",
        "create": "notifications.template.manage",
        "update": "notifications.template.manage",
        "partial_update": "notifications.template.manage",
        "destroy": "notifications.template.manage",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["channel", "event_type", "status"]
    search_fields = ["template_code", "event_type"]

    def perform_create(self, serializer):
        if not self.request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Phase 1 templates are CIXCI-controlled and cannot be created by tenant users.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Phase 1 templates are CIXCI-controlled and cannot be edited by tenant users.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_cixci_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Phase 1 templates are CIXCI-controlled and cannot be deleted by tenant users.")
        instance.delete()


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferenceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_cixci_admin:
            return NotificationPreference.objects.all()
        return NotificationPreference.objects.filter(scope_id=user.id)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        """Return the current user's preferences."""
        prefs = NotificationPreference.objects.filter(scope_id=request.user.id)
        return Response(NotificationPreferenceSerializer(prefs, many=True).data)

    @action(detail=False, methods=["post"])
    def unsubscribe(self, request):
        """Unsubscribe from a notification type."""
        event_type = request.data.get("event_type", "")
        channel = request.data.get("channel", "")
        pref, _ = NotificationPreference.objects.get_or_create(
            level="user", scope_id=request.user.id,
            event_type=event_type, channel=channel,
            defaults={"is_unsubscribed": True, "unsubscribed_at": timezone.now()},
        )
        if not pref.is_unsubscribed:
            pref.is_unsubscribed = True
            pref.unsubscribed_at = timezone.now()
            pref.save()
        return Response({"status": "unsubscribed"})


class NotificationRequestViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = NotificationRequest.objects.all()
    serializer_class = NotificationRequestSerializer
    action_capability_map = {
        "list": "notifications.request.list",
        "retrieve": "notifications.request.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["event_type", "channel", "preference_outcome", "company_scope_reference"]

    @action(detail=True, methods=["get"])
    def delivery_attempts(self, request, pk=None):
        req = self.get_object()
        attempts = req.delivery_attempts.all()
        return Response(DeliveryAttemptSerializer(attempts, many=True).data)


class InAppNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InAppNotificationSerializer

    def get_queryset(self):
        return InAppNotification.objects.filter(recipient=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        notif = self.get_object()
        # Perform fresh Tenant Company check_access on detail access
        from apps.tenant.services import check_access
        capability = "devices.portfolio.self_modify"
        if notif.source_module == "routing":
            capability = "fulfillment.shipping.import"
        elif notif.source_module == "fulfillment":
            capability = "fulfillment.return.list"
        elif notif.source_module == "catalog":
            capability = "catalog.product.create"

        access_res = check_access(request.user, capability, company_id=notif.company_scope_reference)
        if not access_res.granted:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Fresh Tenant Company authorization check failed.")
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=["is_read", "read_at"])
        return Response(InAppNotificationSerializer(notif).data)

    @action(detail=True, methods=["post"], url_path="mark-unread")
    def mark_unread(self, request, pk=None):
        notif = self.get_object()
        if notif.is_read:
            notif.is_read = False
            notif.read_at = None
            notif.save(update_fields=["is_read", "read_at"])
        return Response(InAppNotificationSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        now = timezone.now()
        updated_count = InAppNotification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=now)
        return Response({"marked_read_count": updated_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = InAppNotification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count})


class ActivitySummaryConfigViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = ActivitySummaryConfiguration.objects.all()
    serializer_class = ActivitySummaryConfigSerializer
    action_capability_map = {
        "list": "notifications.summary.manage",
        "retrieve": "notifications.summary.manage",
        "create": "notifications.summary.manage",
        "update": "notifications.summary.manage",
        "partial_update": "notifications.summary.manage",
        "destroy": "notifications.summary.manage",
    }


router = DefaultRouter()
router.register("templates", NotificationTemplateViewSet, basename="notification-template")
router.register("preferences", NotificationPreferenceViewSet, basename="notification-preference")
router.register("requests", NotificationRequestViewSet, basename="notification-request")
router.register("in-app", InAppNotificationViewSet, basename="notification-in-app")
router.register("summary-config", ActivitySummaryConfigViewSet, basename="summary-config")

urlpatterns = [path("", include(router.urls))]

