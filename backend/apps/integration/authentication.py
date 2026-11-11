from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.integration.models import CompanyAPIKey
from apps.tenant.models import User

class CompanyAPIKeyAuthentication(BaseAuthentication):
    """
    Custom Django REST Framework authentication backend.
    Checks for the API key token in 'X-API-Key' or 'Authorization' headers.
    Scopes the authenticated user context to the company's admin/active user.
    """
    keyword = "Api-Key"

    def authenticate(self, request):
        token = request.headers.get("X-API-Key")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ("api-key", "bearer"):
                token = parts[1]

        if not token or not token.startswith("cixci_key_"):
            return None

        try:
            api_key = CompanyAPIKey.objects.get(token=token, is_active=True)
        except CompanyAPIKey.DoesNotExist:
            raise AuthenticationFailed("Invalid or inactive API Key")

        # The credential belongs to the company, never to an individual user.
        # Request context selects an authorized entity without relinking users.
        from uuid import UUID
        from django.db.models import Exists, OuterRef, Q
        from apps.tenant.models import Company, CompanyUserMembership
        from django.utils import timezone
        company_id = api_key.company_scope_reference
        company = Company.objects.filter(pk=company_id, status="active").first()
        if company is None or company.company_type == "cixci_internal":
            raise AuthenticationFailed("The API key company is not an active external company.")
        memberships = CompanyUserMembership.objects.filter(company_id=company_id, user_id=OuterRef("pk"))
        candidates = User.objects.filter(entity__company_id=company_id, entity__status="active", is_active=True, is_cixci_admin=False).select_related("entity__company").annotate(
            _key_membership=Exists(memberships.filter(status="active")),
            _key_has_membership=Exists(memberships),
            _key_company_admin=Exists(memberships.filter(status="active", is_company_admin=True)),
        ).filter(Q(_key_membership=True) | Q(_key_has_membership=False))
        selected_entity = request.headers.get("X-CIXCI-Entity")
        if selected_entity:
            try:
                entity_id = UUID(str(selected_entity))
            except (ValueError, TypeError):
                raise AuthenticationFailed("X-CIXCI-Entity must contain a canonical Entity UUID.") from None
        else:
            entities = list(candidates.order_by().values_list("entity_id", flat=True).distinct()[:2])
            if len(entities) != 1:
                raise AuthenticationFailed("Select an authorized entity using X-CIXCI-Entity for this company API key.")
            entity_id = entities[0]
        user = candidates.filter(entity_id=entity_id).order_by("-_key_company_admin", "id").first()
        if user is None:
            raise AuthenticationFailed("The selected entity has no active authorized user in the API key company.")
        CompanyAPIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())
        return (user, api_key)

    def authenticate_header(self, request):
        """Return the WWW-Authenticate header value so DRF returns 401 (not 403) for unauthenticated requests."""
        return self.keyword


try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    class CompanyAPIKeyScheme(OpenApiAuthenticationExtension):
        target_class = 'apps.integration.authentication.CompanyAPIKeyAuthentication'
        name = 'ApiKeyAuth'

        def get_security_definition(self, auto_schema):
            return {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-API-Key',
                'description': 'Custom B2B API Key authentication header (X-API-Key: cixci_key_...)'
            }
except ImportError:
    pass

