"""Read-only operations API for CIXCI admins to monitor vendor commerce."""
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.tenant.mixins import CheckAccessMixin
from .commerce_models import (
    SupplierOrderDispatch,
    VendorCommercePollRun,
    VendorWebhookReceipt,
)


class DispatchSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor_company.name', read_only=True)
    suborder_id = serializers.UUIDField(source='suborder.id', read_only=True)
    order_id = serializers.UUIDField(source='suborder.order_id', read_only=True)

    class Meta:
        model = SupplierOrderDispatch
        fields = [
            'id', 'po_number', 'status', 'mode', 'vendor_name',
            'suborder_id', 'order_id', 'external_order_id',
            'provider_status', 'attempt_count', 'last_error_code',
            'provider_updated_at', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WebhookReceiptSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source='profile.vendor_company.name', read_only=True,
    )

    class Meta:
        model = VendorWebhookReceipt
        fields = [
            'id', 'vendor_name', 'provider_event_id', 'event_type',
            'is_test', 'status', 'error_code', 'received_at', 'processed_at',
        ]
        read_only_fields = fields


class PollRunSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source='profile.vendor_company.name', read_only=True,
    )

    class Meta:
        model = VendorCommercePollRun
        fields = [
            'id', 'vendor_name', 'kind', 'status', 'rows_seen',
            'processed_count', 'review_count', 'page_index',
            'attempt_count', 'error_code', 'watermark',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields


class DispatchViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = DispatchSerializer
    permission_classes = [IsAuthenticated]
    required_capability = 'integration.operations.view'

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, 'is_cixci_admin', False):
            return SupplierOrderDispatch.objects.none()
        qs = SupplierOrderDispatch.objects.select_related(
            'vendor_company', 'suborder__order',
        ).order_by('-created_at')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        vendor = self.request.query_params.get('vendor')
        if vendor:
            qs = qs.filter(vendor_company_id=vendor)
        po = self.request.query_params.get('po_number')
        if po:
            qs = qs.filter(po_number__icontains=po)
        return qs

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        dispatch = self.get_object()
        if dispatch.status not in ('failed', 'configuration_required'):
            return Response({'error': 'Only failed dispatches can be retried.'}, status=400)
        from .order_dispatch import publish_dispatch
        dispatch.status = 'retrying'
        dispatch.save(update_fields=['status'])
        publish_dispatch(dispatch.pk)
        return Response({'status': 'retrying', 'dispatch_id': str(dispatch.pk)})


class WebhookReceiptViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = WebhookReceiptSerializer
    permission_classes = [IsAuthenticated]
    required_capability = 'integration.operations.view'
    ordering = '-received_at'

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, 'is_cixci_admin', False):
            return VendorWebhookReceipt.objects.none()
        qs = VendorWebhookReceipt.objects.select_related(
            'profile__vendor_company',
        ).order_by('-received_at')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs


class PollRunViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = PollRunSerializer
    permission_classes = [IsAuthenticated]
    required_capability = 'integration.operations.view'

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, 'is_cixci_admin', False):
            return VendorCommercePollRun.objects.none()
        qs = VendorCommercePollRun.objects.select_related(
            'profile__vendor_company',
        ).order_by('-created_at')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    @action(detail=False, methods=['post'])
    def trigger(self, request):
        profile_id = request.data.get('profile_id')
        if not profile_id:
            return Response({'error': 'profile_id required'}, status=400)
        from .shipment_poll import request_shipment_poll
        try:
            run = request_shipment_poll(profile_id, actor=request.user)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(PollRunSerializer(run).data, status=201)
