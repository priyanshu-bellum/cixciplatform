"""
Custom throttle classes for role-based API rate limiting.
"""
from rest_framework.throttling import UserRateThrottle


class VendorRateThrottle(UserRateThrottle):
    """
    Rate limiting for vendor users.
    Vendors typically perform bulk operations (CSV uploads, product updates).
    """
    scope = 'vendor'

    def allow_request(self, request, view):
        # Only apply to authenticated vendor users
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'company') and request.user.company:
                if request.user.company.company_type == 'vendor':
                    return super().allow_request(request, view)
        # If not a vendor, don't apply this throttle (will use default)
        return True


class BuyerRateThrottle(UserRateThrottle):
    """
    Rate limiting for buyer users.
    Buyers perform product searches, exports, and order operations.
    """
    scope = 'buyer'

    def allow_request(self, request, view):
        # Only apply to authenticated buyer users
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'company') and request.user.company:
                if request.user.company.company_type == 'buyer':
                    return super().allow_request(request, view)
        # If not a buyer, don't apply this throttle (will use default)
        return True


class AdminRateThrottle(UserRateThrottle):
    """
    Rate limiting for CIXCI admin users.
    Admins have higher limits for system management operations.
    """
    scope = 'admin'

    def allow_request(self, request, view):
        # Only apply to authenticated admin users
        if request.user and request.user.is_authenticated:
            if getattr(request.user, 'is_cixci_admin', False):
                return super().allow_request(request, view)
        # If not an admin, don't apply this throttle (will use default)
        return True


class CSVImportThrottle(UserRateThrottle):
    """
    Strict rate limiting for CSV import operations.
    These are resource-intensive operations that should be limited.
    """
    scope = 'csv_import'


class ExportThrottle(UserRateThrottle):
    """
    Rate limiting for export operations (CSV, Excel).
    These operations are resource-intensive and should be limited.
    """
    scope = 'export'


class WebhookThrottle(UserRateThrottle):
    """
    Rate limiting for webhook endpoints.
    Prevents abuse of webhook handlers.
    """
    scope = 'webhook'
