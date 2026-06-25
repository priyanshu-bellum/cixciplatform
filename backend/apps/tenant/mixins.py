"""
Tenant-scoped queryset mixins.

These mixins enforce the buyer-scope triad and company isolation at the ORM level.
Every view that operates on buyer-scoped data must use one of these.

Architecture rule: No cross-tenant reads. No cross-buyer mutations.
"""
from rest_framework.exceptions import PermissionDenied


class TenantScopedQuerysetMixin:
    """
    Restricts queryset to the current user's company.
    Use on ViewSets for non-buyer-scoped entities (e.g., vendor data, admin data).
    """
    company_field = "company_id"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_cixci_admin:
            return qs  # System admins see everything

        if user.entity is None:
            raise PermissionDenied("User has no company scope.")

        return qs.filter(**{self.company_field: user.entity.company_id})


class BuyerScopedQuerysetMixin:
    """
    Restricts queryset to the current buyer's scope triad.
    Use on ViewSets for buyer-scoped entities (Portfolio, Projections, Export Jobs, etc.)

    Enforces:
      buyer_reference = user.id
      company_scope_reference = user.entity.company_id
      buyer_entity_reference = user.entity_id

    Cross-buyer reads are architecturally impossible via this mixin.
    """
    buyer_reference_field = "buyer_reference"
    company_scope_field = "company_scope_reference"
    entity_scope_field = "buyer_entity_reference"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_cixci_admin:
            return qs  # System admins see all buyers

        if user.entity is None:
            raise PermissionDenied("User has no buyer entity scope.")

        return qs.filter(**{
            self.buyer_reference_field: user.id,
            self.company_scope_field: user.entity.company_id,
            self.entity_scope_field: user.entity_id,
        })


class CheckAccessMixin:
    """
    Mixin that enforces check_access() before allowing any action.

    Subclasses define `required_capability` (str) or
    `action_capability_map` (dict mapping action name → capability_code).
    """
    required_capability: str = None
    action_capability_map: dict = {}

    def get_required_capability(self):
        action = getattr(self, "action", None)
        if self.action_capability_map and action:
            return self.action_capability_map.get(action, self.required_capability)
        return self.required_capability

    def check_permissions(self, request):
        super().check_permissions(request)

        capability = self.get_required_capability()
        if capability is None:
            return  # No capability required (subclass omitted it — be explicit)

        from apps.tenant.services import check_access
        result = check_access(request.user, capability)
        if not result.granted:
            raise PermissionDenied(
                detail=f"Access denied: {result.reason} (required: {capability})"
            )
