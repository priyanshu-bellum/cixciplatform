from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from apps.tenant.mixins import CheckAccessMixin
from .models import BuyerStorefront


def request_storefront(request, *, required=False):
    from uuid import UUID
    from .models import CompanyAPIKey
    user = request.user
    if not user.entity_id or user.entity.company.company_type != 'buyer':
        return None
    body = request.data if isinstance(getattr(request, 'data', None), dict) else {}
    references = {str(value) for value in (request.headers.get('X-CIXCI-Storefront'),
        request.query_params.get('integration_scope_id'), body.get('integration_scope_id')) if value}
    if len(references) > 1:
        raise serializers.ValidationError({'integration_scope_id':'Conflicting storefront references.'})
    owned = BuyerStorefront.objects.filter(company_id=user.entity.company_id, entity_id=user.entity_id, is_active=True)
    if not references:
        if (required or isinstance(request.auth, CompanyAPIKey)) and owned.exists():
            raise serializers.ValidationError({'integration_scope_id':'Select this request storefront using X-CIXCI-Storefront or integration_scope_id.'})
        return None
    try:
        return owned.get(pk=UUID(references.pop()))
    except (ValueError, TypeError, BuyerStorefront.DoesNotExist):
        raise serializers.ValidationError({'integration_scope_id':'Select an authorized active storefront in this Buyer Entity.'}) from None


class BuyerStorefrontSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerStorefront
        fields = ['id', 'company', 'entity', 'external_connection', 'code', 'label', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        company = attrs.get('company', self.instance.company if self.instance else None)
        entity = attrs.get('entity', self.instance.entity if self.instance else None)
        if not user.is_cixci_admin and (not user.entity_id or company.pk != user.entity.company_id or entity.pk != user.entity_id):
            raise PermissionDenied('Configure storefronts only inside your authorized Buyer Entity.')
        candidate = BuyerStorefront(**{field.name: getattr(self.instance, field.name) for field in BuyerStorefront._meta.fields}) if self.instance else BuyerStorefront()
        if self.instance:
            candidate._state.adding = False
        for name, value in attrs.items():
            setattr(candidate, name, value)
        try:
            candidate.clean()
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return attrs


class BuyerStorefrontViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    serializer_class = BuyerStorefrontSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    action_capability_map = {'list':'integration.connection.read', 'retrieve':'integration.connection.read',
        'create':'integration.connection.manage', 'partial_update':'integration.connection.manage'}

    def get_queryset(self):
        user = self.request.user
        query = BuyerStorefront.objects.select_related('company', 'entity').order_by('label', 'id')
        if not user.is_cixci_admin:
            if not user.entity_id or user.entity.company.company_type != 'buyer':
                return query.none()
            query = query.filter(company_id=user.entity.company_id, entity_id=user.entity_id)
        for name in ('company', 'entity'):
            if self.request.query_params.get(name):
                query = query.filter(**{name + '_id': self.request.query_params[name]})
        return query

    def _audit(self, instance, action):
        import json
        from apps.audit.models import AuditRecord
        AuditRecord.objects.create(event_code='integration.storefront.' + action, actor_reference=self.request.user.pk,
            company_scope_reference=instance.company_id, source_module='integration', source_record_type='BuyerStorefront',
            source_record_id=instance.pk, event_description=json.dumps({'entity_id':str(instance.entity_id), 'code':instance.code, 'active':instance.is_active}))

    def perform_create(self, serializer):
        self._audit(serializer.save(), 'created')

    def perform_update(self, serializer):
        self._audit(serializer.save(), 'configured')
