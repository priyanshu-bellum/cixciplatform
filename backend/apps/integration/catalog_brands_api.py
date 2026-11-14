"""Reusable Brands and explicitly approved supplier relationships."""
import json
import uuid
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from apps.catalog.models import Brand, VendorBrandRelationship
from apps.audit.models import AuditRecord


def log_brand_change(actor, record, fields, company_id=None):
    AuditRecord.objects.create(event_code='catalog.brand.configuration_changed',
        event_description=json.dumps({'changed_fields': sorted(fields)}), status='success',
        actor_reference=actor.id, company_scope_reference=company_id or uuid.UUID(int=0),
        source_module='catalog', source_record_type=type(record).__name__, source_record_id=record.id)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'canonical_key', 'is_active', 'created_at']
        read_only_fields = ['id', 'canonical_key', 'created_at']

    def validate_name(self, value):
        value = ' '.join(value.split())
        if not value:
            raise serializers.ValidationError('Brand name is required.')
        other = Brand.objects.filter(canonical_key=value.casefold())
        if self.instance:
            other = other.exclude(pk=self.instance.pk)
        if other.exists():
            raise serializers.ValidationError('This Brand already exists. Select its existing record for the supplier relationship.')
        return value


class RelationshipSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)

    class Meta:
        model = VendorBrandRelationship
        fields = ['id', 'vendor_company', 'brand', 'brand_name', 'relationship_type', 'is_active', 'approved_at', 'approved_by', 'updated_at']
        read_only_fields = ['id', 'approved_at', 'approved_by', 'updated_at']

    def validate(self, attrs):
        company = attrs.get('vendor_company') or (self.instance.vendor_company if self.instance else None)
        brand = attrs.get('brand') or (self.instance.brand if self.instance else None)
        if company.company_type != 'vendor':
            raise serializers.ValidationError({'vendor_company': 'A Brand relationship must belong to an Accessory Vendor.'})
        if self.instance and (company.pk != self.instance.vendor_company_id or brand.pk != self.instance.brand_id):
            raise serializers.ValidationError('A saved relationship cannot transfer Vendor or Brand identity. Retire it and create the correct relationship.')
        if attrs.get('is_active', self.instance.is_active if self.instance else True) and not brand.is_active:
            raise serializers.ValidationError({'brand': 'Activate the Brand before approving its supplier relationship.'})
        return attrs


class AdminBrandConfiguration(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.is_cixci_admin:
            from apps.tenant.services import check_access
            if request.method in ('GET', 'HEAD', 'OPTIONS') and request.user.company and request.user.company.company_type == 'vendor' and check_access(request.user, 'catalog.product.read').granted:
                return
            raise PermissionDenied('Brand and supplier relationship configuration requires CIXCI System Admin authority.')

    @transaction.atomic
    def perform_create(self, serializer):
        kwargs = {'approved_by': self.request.user} if serializer.Meta.model == VendorBrandRelationship else {}
        record = serializer.save(**kwargs)
        log_brand_change(self.request.user, record, serializer.validated_data, getattr(record, 'vendor_company_id', None))
        from apps.catalog.services import invalidate_buyer_projection_cache
        invalidate_buyer_projection_cache('supplier_brand_configuration')

    @transaction.atomic
    def perform_update(self, serializer):
        kwargs = {'approved_by': self.request.user} if serializer.Meta.model == VendorBrandRelationship else {}
        record = serializer.save(**kwargs)
        log_brand_change(self.request.user, record, serializer.validated_data, getattr(record, 'vendor_company_id', None))
        from apps.catalog.services import invalidate_buyer_projection_cache
        invalidate_buyer_projection_cache('supplier_brand_configuration')


class BrandViewSet(AdminBrandConfiguration):
    serializer_class = BrandSerializer

    def get_queryset(self):
        rows = Brand.objects.order_by('name', 'id')
        if not self.request.user.is_cixci_admin:
            rows = rows.filter(vendor_relationships__vendor_company=self.request.user.company, vendor_relationships__is_active=True, is_active=True)
        return rows


class VendorBrandRelationshipViewSet(AdminBrandConfiguration):
    serializer_class = RelationshipSerializer
    ordering = ('-approved_at', 'id')

    def get_queryset(self):
        rows = VendorBrandRelationship.objects.select_related('brand', 'vendor_company').order_by('brand__name', 'id')
        if not self.request.user.is_cixci_admin:
            rows = rows.filter(vendor_company=self.request.user.company)
        if self.request.query_params.get('vendor_company'):
            rows = rows.filter(vendor_company_id=self.request.query_params['vendor_company'])
        return rows
