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

        # Update last used timestamp
        from django.utils import timezone
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at"])

        # Prefer a company admin, then fall back to any active user in the company
        from apps.tenant.models import CompanyUserMembership
        company_id = api_key.company_scope_reference
        admin_membership = CompanyUserMembership.objects.filter(
            company_id=company_id, is_company_admin=True, user__is_active=True,
        ).select_related("user").first()
        user = admin_membership.user if admin_membership else None
        if not user:
            membership = CompanyUserMembership.objects.filter(
                company_id=company_id, user__is_active=True,
            ).select_related("user").first()
            user = membership.user if membership else None
        if not user:
            user = User.objects.filter(entity__company_id=company_id, is_active=True).first()

        if not user:
            raise AuthenticationFailed("No active user found for the company entity associated with this API key")

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

