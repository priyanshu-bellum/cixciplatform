"""Vendor Commerce Profile management API — generic for any vendor adapter."""
from copy import deepcopy
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tenant.mixins import CheckAccessMixin
from .commerce_models import (
    VendorCommerceProfile, SupplierOrderDispatch,
    VendorWebhookReceipt, VendorCommercePollRun,
    VendorOutboundDelivery, OUTBOUND_EVENTS, OUTBOUND_EVENT_KEYS,
)
from .commerce_config import (
    GENERIC_COMMERCE_CONFIG, BALAJI_COMMERCE_CONFIG,
    validate_commerce_config,
)
from .catalog_sync import audit
from .webhook_receiver import encrypt_webhook_secret
import secrets


class CommerceProfileSerializer(serializers.ModelSerializer):
    webhook_secret = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_webhook_secret = serializers.SerializerMethodField()
    has_outbound_secret = serializers.SerializerMethodField()
    webhook_url = serializers.SerializerMethodField()
    connection_label = serializers.CharField(source='connection.label', read_only=True)
    vendor_name = serializers.CharField(source='vendor_company.name', read_only=True)
    available_outbound_events = serializers.SerializerMethodField()

    class Meta:
        model = VendorCommerceProfile
        fields = (
            'id', 'connection', 'vendor_company', 'adapter', 'mode',
            'order_enabled', 'webhook_enabled', 'polling_enabled',
            'outbound_enabled', 'outbound_url', 'outbound_events',
            'config', 'config_version', 'receiver_id',
            'webhook_secret', 'has_webhook_secret', 'has_outbound_secret', 'webhook_url',
            'available_outbound_events',
            'next_poll_at', 'connection_label', 'vendor_name',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'config_version', 'receiver_id',
            'connection_label', 'vendor_name',
            'created_at', 'updated_at',
        )

    def get_has_webhook_secret(self, obj):
        return bool(obj.encrypted_webhook_secret)

    def get_has_outbound_secret(self, obj):
        return bool(obj.encrypted_outbound_secret)

    def get_webhook_url(self, obj):
        if obj.webhook_enabled and obj.receiver_id:
            return f'/api/v1/integration/webhooks/{obj.receiver_id}/'
        return None

    def get_available_outbound_events(self, obj):
        return [{'key': k, 'label': v} for k, v in OUTBOUND_EVENTS]

    def validate_outbound_events(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Must be a list of event keys.')
        invalid = set(value) - OUTBOUND_EVENT_KEYS
        if invalid:
            raise serializers.ValidationError(
                f'Unsupported events: {", ".join(sorted(invalid))}')
        return list(set(value))

    def validate(self, data):
        webhook_secret = data.pop('webhook_secret', None)
        if webhook_secret:
            data['encrypted_webhook_secret'] = encrypt_webhook_secret(
                webhook_secret.encode())
        return data

    def create(self, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class DispatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierOrderDispatch
        exclude = ['lease_token', 'encrypted_transport_credentials']
        read_only_fields = [f.name for f in SupplierOrderDispatch._meta.fields]


class WebhookReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorWebhookReceipt
        exclude = ['encrypted_payload']
        read_only_fields = [f.name for f in VendorWebhookReceipt._meta.fields]


class OutboundDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorOutboundDelivery
        fields = (
            'id', 'event_type', 'status', 'attempt_count',
            'last_response_code', 'last_error', 'delivered_at', 'created_at',
        )
        read_only_fields = fields


class PollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCommercePollRun
        exclude = ['lease_token', 'cursor_hashes']
        read_only_fields = [f.name for f in VendorCommercePollRun._meta.fields]


class VendorCommerceProfileViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    serializer_class = CommerceProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    action_capability_map = {
        'list': 'integration.connection.read',
        'retrieve': 'integration.connection.read',
        'dispatches': 'integration.connection.read',
        'webhooks': 'integration.connection.read',
        'polls': 'integration.connection.read',
        'outbound_log': 'integration.connection.read',
        'generate_outbound_secret': 'integration.connection.write',
        'rotate_outbound_secret': 'integration.connection.write',
    }

    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.is_cixci_admin and (
            request.method not in ('GET', 'HEAD', 'OPTIONS')
            or not request.user.company
            or request.user.company.company_type != 'vendor'
        ):
            raise PermissionDenied(
                'Only System Admins may configure Vendor commerce profiles.')

    def get_queryset(self):
        qs = VendorCommerceProfile.objects.select_related(
            'connection', 'vendor_company', 'updated_by'
        ).order_by('-updated_at')
        if not self.request.user.is_cixci_admin:
            qs = qs.filter(vendor_company=self.request.user.company)
        vendor = self.request.query_params.get('vendor_company')
        if vendor:
            qs = qs.filter(vendor_company_id=vendor)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        profile = serializer.save()
        audit('commerce_profile_created', profile.connection,
              self.request.user, profile_id=str(profile.pk),
              adapter=profile.adapter, mode=profile.mode)

    @transaction.atomic
    def perform_update(self, serializer):
        before = {
            'adapter': serializer.instance.adapter,
            'mode': serializer.instance.mode,
            'order_enabled': serializer.instance.order_enabled,
            'webhook_enabled': serializer.instance.webhook_enabled,
            'polling_enabled': serializer.instance.polling_enabled,
        }
        profile = serializer.save()
        after = {
            'adapter': profile.adapter,
            'mode': profile.mode,
            'order_enabled': profile.order_enabled,
            'webhook_enabled': profile.webhook_enabled,
            'polling_enabled': profile.polling_enabled,
        }
        changed = [k for k in before if before[k] != after[k]]
        audit('commerce_profile_updated', profile.connection,
              self.request.user, profile_id=str(profile.pk),
              changed_fields=changed)

    @action(detail=False, methods=['get'])
    def template(self, request):
        if not request.user.is_cixci_admin:
            raise PermissionDenied('Only System Admins may configure commerce profiles.')
        adapter = request.query_params.get('adapter', 'generic_json')
        if adapter not in ('generic_json', 'balaji'):
            raise serializers.ValidationError(
                {'adapter': 'Choose generic_json or balaji.'})
        config = deepcopy(
            BALAJI_COMMERCE_CONFIG if adapter == 'balaji'
            else GENERIC_COMMERCE_CONFIG)
        return Response({
            'adapter': adapter,
            'mode': 'preview',
            'config': config,
            'supported_adapters': [
                {'key': 'generic_json', 'label': 'Generic REST/JSON'},
                {'key': 'balaji', 'label': 'Balaji Wireless'},
            ],
            'supported_modes': [
                {'key': 'preview', 'label': 'Preview (dry-run only)'},
                {'key': 'test', 'label': 'Test (sandbox orders)'},
                {'key': 'live', 'label': 'Live (production orders)'},
            ],
        })

    @action(detail=True, methods=['get'])
    def dispatches(self, request, pk=None):
        profile = self.get_object()
        qs = profile.dispatches.order_by('-created_at')
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            DispatchSerializer(page, many=True).data)

    @action(detail=True, methods=['get'])
    def webhooks(self, request, pk=None):
        profile = self.get_object()
        qs = profile.webhook_receipts.order_by('-received_at')
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            WebhookReceiptSerializer(page, many=True).data)

    @action(detail=True, methods=['get'])
    def polls(self, request, pk=None):
        profile = self.get_object()
        qs = profile.poll_runs.order_by('-created_at')
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            PollRunSerializer(page, many=True).data)

    @action(detail=True, methods=['get'], url_path='outbound-log')
    def outbound_log(self, request, pk=None):
        profile = self.get_object()
        qs = profile.outbound_deliveries.filter(
            vendor_company=profile.vendor_company
        ).order_by('-created_at')
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            OutboundDeliverySerializer(page, many=True).data)

    @action(detail=True, methods=['post'], url_path='generate-outbound-secret')
    def generate_outbound_secret(self, request, pk=None):
        profile = self.get_object()
        if profile.encrypted_outbound_secret:
            raise serializers.ValidationError(
                {'detail': 'An outbound signing secret already exists. Use rotate to replace it.'})
        raw_secret = 'whsec_' + secrets.token_hex(32)
        profile.encrypted_outbound_secret = encrypt_webhook_secret(raw_secret.encode())
        profile.updated_by = request.user
        profile.save(update_fields=['encrypted_outbound_secret', 'updated_by', 'updated_at'])
        audit('outbound_secret_generated', profile.connection, request.user,
              profile_id=str(profile.pk))
        return Response({'secret': raw_secret})

    @action(detail=True, methods=['post'], url_path='rotate-outbound-secret')
    def rotate_outbound_secret(self, request, pk=None):
        profile = self.get_object()
        if not profile.encrypted_outbound_secret:
            raise serializers.ValidationError(
                {'detail': 'No outbound secret to rotate. Generate one first.'})
        raw_secret = 'whsec_' + secrets.token_hex(32)
        profile.encrypted_outbound_secret = encrypt_webhook_secret(raw_secret.encode())
        profile.updated_by = request.user
        profile.save(update_fields=['encrypted_outbound_secret', 'updated_by', 'updated_at'])
        audit('outbound_secret_rotated', profile.connection, request.user,
              profile_id=str(profile.pk))
        return Response({'secret': raw_secret})

    @action(detail=True, methods=['post'])
    def poll_now(self, request, pk=None):
        profile = self.get_object()
        if not profile.polling_enabled:
            raise serializers.ValidationError(
                {'polling_enabled': 'Enable polling before requesting a poll.'})
        from .shipment_poll import request_shipment_poll
        run = request_shipment_poll(profile.pk, actor=request.user)
        return Response(PollRunSerializer(run).data, status=202)
