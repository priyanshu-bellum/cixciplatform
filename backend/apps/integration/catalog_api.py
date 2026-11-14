"""Governed Vendor catalog configuration. Credentials are write-only."""
from copy import deepcopy
import re
import uuid
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, APIException
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.tenant.models import Company
from apps.tenant.mixins import CheckAccessMixin
from apps.catalog.models import Brand, VendorBrandRelationship
from .models import VendorCatalogConnection, VendorCatalogSyncRun, VendorCatalogItem
from .catalog_config import BALAJI_CONFIG, GENERIC_CONFIG, TARGETS, saved_integration_mode, validate_config
from .catalog_secrets import encrypt_credentials
from .catalog_transport import public_target, CatalogTransportError
from .catalog_sync import request_sync, audit


class StaleConnection(APIException):
    status_code = 409
    default_detail = 'This connection changed after it was opened. Reload it before saving.'


def connection_snapshot(connection):
    # Credentials stay entirely outside audit payloads. Config versions remain
    # reconstructable through the existing append-only AuditRecord spine.
    return deepcopy({field: getattr(connection, field) for field in (
        'label', 'vendor_company_id', 'endpoint_url', 'auth_type', 'auth_header',
        'config', 'config_version', 'schedule_enabled', 'is_retired')})


class ConnectionSerializer(serializers.ModelSerializer):
    credential = serializers.JSONField(write_only=True, required=False)
    has_credentials = serializers.SerializerMethodField()
    last_run = serializers.SerializerMethodField()
    saved_integration_mode = serializers.SerializerMethodField()

    class Meta:
        model = VendorCatalogConnection
        fields = ['id', 'vendor_company', 'label', 'endpoint_url', 'auth_type', 'auth_header', 'credential', 'has_credentials', 'config', 'config_version', 'schedule_enabled',
                  'is_retired', 'last_synced_at', 'next_sync_at', 'last_error_code', 'created_at', 'updated_at', 'last_run', 'saved_integration_mode']
        read_only_fields = ['id', 'config_version', 'last_synced_at', 'next_sync_at', 'last_error_code', 'created_at', 'updated_at']

    def get_has_credentials(self, obj):
        return bool(obj.encrypted_credentials) or obj.auth_type == 'none'

    def get_last_run(self, obj):
        # The list view prefetches only the most recent bounded run set.
        prefetched = getattr(obj, 'latest_runs', None)
        run = next(iter(prefetched), None) if prefetched is not None else obj.sync_runs.first()
        return RunSerializer(run).data if run else None

    def get_saved_integration_mode(self, instance):
        return saved_integration_mode(instance.vendor_company)

    def validate_config(self, value):
        try:
            return validate_config(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error

    def validate_endpoint_url(self, value):
        try:
            public_target(value, resolve=False)
        except CatalogTransportError:
            raise serializers.ValidationError('Use a public HTTPS catalog URL on port 443, without credentials, query parameters or fragments.')
        return value

    def validate(self, attrs):
        company = attrs.get('vendor_company') or (self.instance.vendor_company if self.instance else None)
        if self.instance and company.pk != self.instance.vendor_company_id:
            raise serializers.ValidationError({'vendor_company': 'An existing connection cannot change supplier.'})
        if not company or company.company_type != 'vendor':
            raise serializers.ValidationError({'vendor_company': 'Select an existing Vendor company.'})
        if saved_integration_mode(company) != 'api':
            raise serializers.ValidationError({'vendor_company': 'Save Company Profile Integration Mode as API before configuring this connection.'})
        auth_type = attrs.get('auth_type', self.instance.auth_type if self.instance else 'bearer')
        header = attrs.get('auth_header', self.instance.auth_header if self.instance else 'X-API-Key')
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]{1,63}', header) or header.casefold() in {'host', 'cookie', 'connection', 'content-length', 'transfer-encoding', 'proxy-authorization'}:
            raise serializers.ValidationError({'auth_header': 'Use a valid authentication header name.'})
        if 'credential' in attrs:
            try:
                attrs['encrypted_credentials'] = encrypt_credentials(auth_type, attrs.pop('credential'))
            except DjangoValidationError as error:
                raise serializers.ValidationError({'credential': error.messages}) from error
        elif auth_type == 'none':
            attrs['encrypted_credentials'] = ''
        elif not self.instance or self.instance.auth_type != auth_type or not self.instance.encrypted_credentials:
            raise serializers.ValidationError({'credential': 'Supply credentials for the selected authentication method.'})
        return attrs

    def create(self, validated_data):
        actor = self.context['request'].user
        if validated_data.get('schedule_enabled') and not validated_data.get('is_retired'):
            validated_data['next_sync_at'] = timezone.now()
        return super().create({**validated_data, 'created_by': actor, 'updated_by': actor})

    def update(self, instance, validated_data):
        critical = ('endpoint_url', 'auth_type', 'auth_header', 'encrypted_credentials', 'config', 'is_retired')
        if any(field in validated_data and validated_data[field] != getattr(instance, field) for field in critical):
            validated_data['config_version'] = uuid.uuid4()
        validated_data['updated_by'] = self.context['request'].user
        enabled = validated_data.get('schedule_enabled', instance.schedule_enabled)
        retired = validated_data.get('is_retired', instance.is_retired)
        validated_data['next_sync_at'] = (instance.next_sync_at or timezone.now()) if enabled and not retired else None
        return super().update(instance, validated_data)


class RunSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCatalogSyncRun
        exclude = ['lease_token', 'cursor_hashes', 'page_cursor']
        read_only_fields = [field.name for field in VendorCatalogSyncRun._meta.fields]


class ItemSerializer(serializers.ModelSerializer):
    source_summary = serializers.SerializerMethodField()

    def get_source_summary(self, instance):
        # Bounded preview of saved source facts under the current mapping. No
        # Product/connection lookup per row and no raw payload for Vendor users.
        if not self.context['request'].user.is_cixci_admin:
            return {}
        from .catalog_import import mapped_values
        fields, _ = mapped_values(instance.payload, self.context['config'])
        allowed = ('sku', 'name', 'brand', 'vendor_category', 'vendor_wholesale_price_amount',
                   'vendor_wholesale_price_currency', 'inventory_level', 'msrp')
        return {field: str(fields[field])[:240] for field in allowed
                if isinstance(fields.get(field), (str, int, float)) and not isinstance(fields[field], bool)}

    class Meta:
        model = VendorCatalogItem
        fields = ['id', 'external_id', 'product', 'is_listed', 'review_required', 'review_errors', 'payload', 'source_summary', 'applied_config_version', 'first_seen_at', 'last_seen_at']
        read_only_fields = fields


class VendorCatalogConnectionViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    action_capability_map = {'list': 'integration.connection.read', 'retrieve': 'integration.connection.read', 'runs': 'integration.connection.read', 'items': 'integration.connection.read'}

    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.is_cixci_admin and (request.method not in ('GET', 'HEAD', 'OPTIONS') or not request.user.company or request.user.company.company_type != 'vendor'):
            raise PermissionDenied('Only System Admins may configure or synchronize Vendor catalog connections.')

    def get_queryset(self):
        from django.db.models import Prefetch
        runs = VendorCatalogSyncRun.objects.order_by('-created_at')[:1]
        qs = VendorCatalogConnection.objects.select_related('vendor_company').prefetch_related(Prefetch('sync_runs', queryset=runs, to_attr='latest_runs')).order_by('label', 'id')
        if not self.request.user.is_cixci_admin:
            qs = qs.filter(vendor_company=self.request.user.company)
        if self.request.query_params.get('vendor_company'):
            qs = qs.filter(vendor_company_id=self.request.query_params['vendor_company'])
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        connection = serializer.save()
        audit('configured', connection, self.request.user, before=None, after=connection_snapshot(connection),
              changed_fields=sorted(set(serializer.validated_data) - {'encrypted_credentials'}), credentials_changed=True)

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = VendorCatalogConnection.objects.select_for_update().get(pk=serializer.instance.pk)
        expected = self.request.headers.get('If-Match', '').strip('"')
        if expected and expected != str(serializer.instance.config_version):
            raise StaleConnection()
        previous_version = serializer.instance.config_version
        before = connection_snapshot(serializer.instance)
        connection = serializer.save()
        if connection.config_version != previous_version:
            connection.sync_runs.filter(status__in=['queued', 'running', 'retrying']).update(status='cancelled', error_code='CONNECTION_CHANGED', completed_at=timezone.now(), lease_token=None, lease_expires_at=None)
        audit('configured', connection, self.request.user, before=before, after=connection_snapshot(connection),
              changed_fields=sorted(set(serializer.validated_data) - {'encrypted_credentials'}), credentials_changed='encrypted_credentials' in serializer.validated_data)

    @action(detail=False, methods=['get'])
    def template(self, request):
        if not request.user.is_cixci_admin:
            raise PermissionDenied('Only System Admins may configure catalog connections.')
        provider = request.query_params.get('provider', 'balaji')
        if provider not in ('generic', 'balaji'):
            raise serializers.ValidationError({'provider': 'Choose Generic REST/JSON or Balaji Wireless.'})
        generic = provider == 'generic'
        return Response({'label': '' if generic else 'Balaji Wireless',
            'endpoint_url': '' if generic else 'https://shop.balajibrands.com/api/v1/catalog',
            'auth_type': 'bearer', 'config': deepcopy(GENERIC_CONFIG if generic else BALAJI_CONFIG),
            'supported_fields': sorted(TARGETS), 'provider': provider})

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        return self._queue(request, 'manual')

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        from .catalog_sync import test_catalog_connection
        try:
            return Response(test_catalog_connection(self.get_object(), request.user))
        except CatalogTransportError as error:
            raise serializers.ValidationError({'code': error.code, 'provider_http_status': error.status,
                'detail': 'API test failed. Check saved credentials, endpoint, mapping and provider limits.'}) from error
        except DjangoValidationError as error:
            raise serializers.ValidationError({'configuration': error.messages}) from error

    @action(detail=True, methods=['post'])
    def recheck(self, request, pk=None):
        return self._queue(request, 'review')

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        connection = self.get_object()
        VendorCatalogConnection.objects.select_for_update().get(pk=connection.pk)
        rows = connection.sync_runs.filter(status__in=['queued', 'running', 'retrying'])
        identifiers = list(rows.values_list('id', flat=True))
        rows.update(status='cancelled', error_code='ADMIN_CANCELLED', completed_at=timezone.now(), lease_token=None, lease_expires_at=None)
        audit('cancelled', connection, request.user, run_ids=identifiers)
        return Response({'cancelled_runs': len(identifiers)})

    def _queue(self, request, trigger):
        connection = self.get_object()
        try:
            run = request_sync(connection, request.user, trigger)
        except (ValueError, DjangoValidationError) as error:
            raise serializers.ValidationError({'configuration': str(error)}) from error
        return Response(RunSerializer(run).data, status=202)

    @action(detail=True, methods=['get'])
    def runs(self, request, pk=None):
        if request.query_params.get('paginate') == 'false':
            raise serializers.ValidationError('Keep pagination enabled for catalog history.')
        rows = self.get_object().sync_runs.order_by('-created_at')
        page = self.paginate_queryset(rows)
        return self.get_paginated_response(RunSerializer(page, many=True).data)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        if request.query_params.get('paginate') == 'false':
            raise serializers.ValidationError('Keep pagination enabled for source items.')
        connection = self.get_object()
        rows = connection.source_items.order_by('-review_required', 'external_id')
        if request.query_params.get('review_required') == 'true':
            rows = rows.filter(review_required=True)
        self.paginator.ordering = '-last_seen_at'
        page = self.paginate_queryset(rows)
        result = ItemSerializer(page, many=True, context={'request': request, 'config': connection.config}).data
        if not request.user.is_cixci_admin:
            for item in result:
                item.pop('payload', None)
                item.pop('source_summary', None)
        return self.get_paginated_response(result)
