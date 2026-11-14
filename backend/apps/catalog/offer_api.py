from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.tenant.mixins import CheckAccessMixin
from .models import BuyerExportMapping
from .offer_services import freeze_export_selection


class ExportMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerExportMapping
        fields = '__all__'
        read_only_fields = [field.name for field in BuyerExportMapping._meta.fields]


class ExportMappingViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ExportMappingSerializer
    permission_classes = [IsAuthenticated]
    action_capability_map = {'list':'catalog.product.read', 'retrieve':'catalog.product.read', 'bind_listing':'catalog.product.read'}

    def get_queryset(self):
        query = BuyerExportMapping.objects.select_related('product', 'company', 'entity', 'storefront').order_by('-exported_at', 'id')
        user = self.request.user
        if not user.is_cixci_admin:
            if not user.entity_id or user.entity.company.company_type != 'buyer':
                return query.none()
            query = query.filter(company_id=user.entity.company_id, entity_id=user.entity_id)
        for name in ('storefront', 'product', 'export_job'):
            if self.request.query_params.get(name):
                query = query.filter(**{name + '_id':self.request.query_params[name]})
        return query

    @action(detail=True, methods=['post'])
    def bind_listing(self, request, pk=None):
        previous = self.get_object()
        if not previous.storefront_id or previous.status != 'active':
            raise serializers.ValidationError('Bind an active, storefront-scoped export selection.')
        if not request.user.is_cixci_admin:
            from .services import ensure_buyer_compatibility_projection
            projection = ensure_buyer_compatibility_projection(request.user, trigger='listing_bind', force=True)
            if not projection or str(previous.product_id) not in projection.compatible_product_ids:
                raise PermissionDenied('This offer is no longer eligible in the current Buyer portfolio.')
        listing, variant = request.data.get('external_listing_id', ''), request.data.get('external_variant_id', '')
        if any(not isinstance(value,str) or len(value)>500 for value in (listing,variant)) or not (listing or variant):
            raise serializers.ValidationError('Supply an external listing or variant reference of at most 500 characters.')
        reference = request.data.get('listing_reference', previous.listing_reference)
        if not isinstance(reference,str) or not reference.strip() or len(reference)>500:
            raise serializers.ValidationError('Supply a valid listing reference.')
        try:
            mapping = freeze_export_selection(product=previous.product, company=previous.company, entity=previous.entity,
                storefront=previous.storefront, actor=request.user, listing_reference=reference,
                external_listing_id=listing, external_variant_id=variant, replaces_mapping_id=request.data.get('replaces_mapping_id'))
        except DjangoValidationError as error:
            raise serializers.ValidationError(getattr(error,'message_dict',error.messages)) from error
        return Response(ExportMappingSerializer(mapping).data, status=201)
