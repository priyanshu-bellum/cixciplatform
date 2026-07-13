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

        user = User.objects.filter(entity__company_id=api_key.company_scope_reference, email="sklein@telcocellular.com", is_active=True).first()
        if not user:
            user = User.objects.filter(entity__company_id=api_key.company_scope_reference, email="buyer@cixci.com", is_active=True).first()
        if not user:
            user = User.objects.filter(entity__company_id=api_key.company_scope_reference, is_active=True).first()

        if not user:
            raise AuthenticationFailed("No active user found for the company entity associated with this API key")

        return (user, api_key)
