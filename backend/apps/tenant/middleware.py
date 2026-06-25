"""
Tenant isolation middleware.

Enforces that all authenticated requests are scoped to either:
  - A CIXCI System Admin (platform-wide access)
  - A user whose entity and company are in active status

Also attaches resolved buyer scope to request for downstream use.
"""
import logging
from django.http import JsonResponse
from django.utils.functional import SimpleLazyObject

logger = logging.getLogger(__name__)

# Paths that are always allowed without tenant check
EXEMPT_PATHS = {
    "/admin/",
    "/api/v1/auth/",
    "/api/schema/",
    "/api/docs/",
    "/api/redoc/",
}


class TenantIsolationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Exempt non-API paths and auth endpoints
        if any(request.path.startswith(p) for p in EXEMPT_PATHS):
            return self.get_response(request)

        # Only enforce on authenticated API requests
        if hasattr(request, "user") and request.user.is_authenticated:
            user = request.user

            # Attach lazy buyer scope
            request.buyer_scope = SimpleLazyObject(lambda: self._resolve_scope(user))

        return self.get_response(request)

    def _resolve_scope(self, user):
        from apps.tenant.services import resolve_buyer_scope
        return resolve_buyer_scope(user)
