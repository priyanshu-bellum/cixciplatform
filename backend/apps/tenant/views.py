"""Tenant module ViewSets."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Company, CompanyEntity, User, CompanyRelationship, Capability, CompanyType, CompanyStatus
from .serializers import (
    CompanySerializer, CompanyEntitySerializer,
    UserSerializer, UserCreateSerializer, CompanyRelationshipSerializer,
    ChildOnboardingRequestSerializer, CapabilitySerializer,
)
from .mixins import TenantScopedQuerysetMixin, CheckAccessMixin
from .services import check_access


class CompanyViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Company.objects.select_related("parent_company")
    serializer_class = CompanySerializer
    action_capability_map = {
        "list": "tenant.company.list",
        "retrieve": "tenant.company.read",
        "create": "tenant.company.create",
        "update": "tenant.company.update",
        "partial_update": "tenant.company.update",
        "destroy": "tenant.company.delete",
        "assign_capability": "tenant.company.update",
        "remove_capability": "tenant.company.update",
    }
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["company_type", "status", "parent_company", "is_parent"]
    search_fields = ["name", "display_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return Company.objects.none()
        if user.is_cixci_admin:
            return qs

        company = user.company
        if not company:
            return Company.objects.none()

        from django.db.models import Q
        buyer_regions = company.approved_regions or []
        if not isinstance(buyer_regions, list):
            buyer_regions = [buyer_regions]

        region_filter = Q()
        for r in buyer_regions:
            region_filter |= Q(approved_regions__icontains=f'"{r}"')

        vendor_q = Q(company_type=CompanyType.VENDOR, status=CompanyStatus.ACTIVE) & ~Q(approved_regions=[]) & ~Q(approved_regions__isnull=True) & region_filter
        parent_child_q = Q(id=company.id) | Q(parent_company=company)
        if company.parent_company_id:
            parent_child_q |= Q(id=company.parent_company_id)

        return qs.filter(parent_child_q | vendor_q).distinct()

    def perform_create(self, serializer):
        company = serializer.save()
        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.company.created",
            description=f"Company {company.name} created",
            company_id=company.id,
            actor_id=self.request.user.id,
            source_record_type="Company",
            source_record_id=company.id
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_instance = serializer.save()
        if old_status != updated_instance.status:
            from apps.tenant.services import log_tenant_audit
            log_tenant_audit(
                event_code="tenant.company.status_changed",
                description=f"Company status changed from {old_status} to {updated_instance.status}",
                company_id=updated_instance.id,
                actor_id=self.request.user.id,
                source_record_type="Company",
                source_record_id=updated_instance.id
            )

    @action(detail=True, methods=["post"])
    def assign_capability(self, request, pk=None):
        company = self.get_object()
        capability_code = request.data.get("capability_code")
        if not capability_code:
            return Response({"error": "capability_code is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            capability = Capability.objects.get(code=capability_code)
        except Capability.DoesNotExist:
            return Response({"error": "Capability not found"}, status=status.HTTP_404_NOT_FOUND)

        company.capabilities.add(capability)
        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.company.capability_assigned",
            description=f"Capability {capability_code} assigned to company {company.name}",
            company_id=company.id,
            actor_id=request.user.id,
            source_record_type="Company",
            source_record_id=company.id
        )
        return Response({"success": f"Capability {capability_code} assigned successfully."})

    @action(detail=True, methods=["post"])
    def remove_capability(self, request, pk=None):
        company = self.get_object()
        capability_code = request.data.get("capability_code")
        if not capability_code:
            return Response({"error": "capability_code is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            capability = Capability.objects.get(code=capability_code)
        except Capability.DoesNotExist:
            return Response({"error": "Capability not found"}, status=status.HTTP_404_NOT_FOUND)

        company.capabilities.remove(capability)
        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.company.capability_removed",
            description=f"Capability {capability_code} removed from company {company.name}",
            company_id=company.id,
            actor_id=request.user.id,
            source_record_type="Company",
            source_record_id=company.id
        )
        return Response({"success": f"Capability {capability_code} removed successfully."})


class CompanyEntityViewSet(TenantScopedQuerysetMixin, CheckAccessMixin, viewsets.ModelViewSet):
    queryset = CompanyEntity.objects.select_related("company")
    serializer_class = CompanyEntitySerializer
    company_field = "company__id"   # Override for FK traversal
    action_capability_map = {
        "list": "tenant.entity.list",
        "retrieve": "tenant.entity.read",
        "create": "tenant.entity.create",
        "update": "tenant.entity.update",
        "partial_update": "tenant.entity.update",
        "destroy": "tenant.entity.delete",
    }


class UserViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = User.objects.select_related("entity__company").prefetch_related("capabilities")
    action_capability_map = {
        "list": "tenant.user.list",
        "retrieve": "tenant.user.read",
        "create": "tenant.user.create",
        "update": "tenant.user.update",
        "partial_update": "tenant.user.update",
        "destroy": "tenant.user.delete",
        "me": None,  # Always allowed for authenticated user
        "confirm_email": None,
    }

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return User.objects.none()
        if user.is_cixci_admin:
            return qs
        return qs.filter(entity__company=user.company)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Return the authenticated user's own profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def confirm_email(self, request):
        """Confirm email and set password using the signed onboarding token."""
        token = request.data.get("token")
        password = request.data.get("password")

        if not token or not password:
            return Response(
                {"error": "Both token and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.tenant.services import verify_onboarding_token
        user_id = verify_onboarding_token(token)
        if not user_id:
            return Response(
                {"error": "Activation link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User does not exist."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password)
        user.is_active = True
        user.save()

        return Response({"success": "Account activated successfully. You can now log in."})

    @action(detail=True, methods=["post"])
    def check_access(self, request, pk=None):
        """Perform a check_access call for a user (admin tool)."""
        capability = request.data.get("capability_code")
        if not capability:
            return Response({"error": "capability_code required"}, status=status.HTTP_400_BAD_REQUEST)

        target_user = self.get_object()
        result = check_access(target_user, capability)
        return Response({
            "granted": result.granted,
            "reason": result.reason,
            "capability_code": result.capability_code,
        })

    def perform_destroy(self, instance):
        if not instance.is_cixci_admin and instance.company:
            if instance.capabilities.filter(code="tenant.company.update", is_active=True).exists():
                other_active_admins = User.objects.filter(
                    entity__company=instance.company,
                    is_active=True,
                    capabilities__code="tenant.company.update"
                ).exclude(id=instance.id)
                if not other_active_admins.exists():
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError("Cannot deactivate or remove the last active administrator for the company.")
        instance.delete()


class CompanyRelationshipViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = CompanyRelationship.objects.select_related("buyer_company", "vendor_company")
    serializer_class = CompanyRelationshipSerializer
    action_capability_map = {
        "list": "tenant.relationship.list",
        "retrieve": "tenant.relationship.read",
        "create": "tenant.relationship.create",
        "update": "tenant.relationship.update",
        "partial_update": "tenant.relationship.update",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "buyer_company", "vendor_company"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a pending relationship."""
        result = check_access(request.user, "tenant.relationship.approve")
        if not result.granted:
            return Response({"error": result.reason}, status=status.HTTP_403_FORBIDDEN)

        rel = self.get_object()
        from django.utils import timezone
        rel.status = "active"
        rel.approved_at = timezone.now()
        rel.approved_by = request.user
        rel.save()
        return Response(CompanyRelationshipSerializer(rel).data)


from .models import ChildOnboardingRequest

class ChildOnboardingRequestViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = ChildOnboardingRequest.objects.select_related("parent_company", "requester")
    serializer_class = ChildOnboardingRequestSerializer
    action_capability_map = {
        "list": "tenant.child_onboarding.list",
        "retrieve": "tenant.child_onboarding.read",
        "create": "tenant.child_onboarding.create",
        "approve": "tenant.child_onboarding.approve",
        "reject": "tenant.child_onboarding.reject",
        "withdraw": "tenant.child_onboarding.withdraw",
    }

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return ChildOnboardingRequest.objects.none()
        if user.is_cixci_admin:
            return qs
        return qs.filter(parent_company=user.company)

    def perform_create(self, serializer):
        result = check_access(self.request.user, "tenant.child_onboarding.create")
        if not result.granted:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to submit a child onboarding request.")
            
        req = serializer.save(
            parent_company=self.request.user.company,
            requester=self.request.user,
            status="submitted"
        )
        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.child_onboarding_request.submitted",
            description=f"Child onboarding request submitted for {req.company_name}",
            company_id=req.parent_company_id,
            actor_id=self.request.user.id,
            source_record_type="ChildOnboardingRequest",
            source_record_id=req.id
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        result = check_access(request.user, "tenant.child_onboarding.approve")
        if not result.granted:
            return Response({"error": result.reason}, status=status.HTTP_403_FORBIDDEN)

        req = self.get_object()
        if req.status != "submitted":
            return Response({"error": "Only submitted requests can be approved."}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        req.status = "approved"
        req.decision_by = request.user
        req.decision_timestamp = timezone.now()
        req.save()

        # Create child company in pending_setup
        from apps.tenant.models import BuyerPricingMode
        pricing_mode = BuyerPricingMode.CUSTOM if req.commission_percentage != 14.00 else BuyerPricingMode.STANDARD
        child_company = Company.objects.create(
            name=req.company_name,
            company_type=CompanyType.BUYER if req.parent_company.company_type == CompanyType.BUYER else CompanyType.VENDOR,
            status=CompanyStatus.PENDING_SETUP,
            parent_company=req.parent_company,
            website=req.website,
            business_email_domain=req.business_email_domain,
            primary_contact_name=req.primary_contact,
            slug=f"child-{req.company_name.lower().replace(' ', '-')}",
            commission_percentage=req.commission_percentage,
            buyer_pricing_mode=pricing_mode,
        )

        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.child_onboarding_request.approved",
            description=f"Child onboarding request approved for {req.company_name}",
            company_id=req.parent_company_id,
            actor_id=request.user.id,
            source_record_type="ChildOnboardingRequest",
            source_record_id=req.id
        )
        log_tenant_audit(
            event_code="tenant.company.created",
            description=f"Child company {child_company.name} created via approved request",
            company_id=child_company.id,
            actor_id=request.user.id,
            source_record_type="Company",
            source_record_id=child_company.id
        )

        return Response(ChildOnboardingRequestSerializer(req).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        result = check_access(request.user, "tenant.child_onboarding.reject")
        if not result.granted:
            return Response({"error": result.reason}, status=status.HTTP_403_FORBIDDEN)

        req = self.get_object()
        if req.status != "submitted":
            return Response({"error": "Only submitted requests can be rejected."}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get("rejection_reason", "")
        from django.utils import timezone
        req.status = "rejected"
        req.rejection_reason = reason
        req.decision_by = request.user
        req.decision_timestamp = timezone.now()
        req.save()

        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.child_onboarding_request.rejected",
            description=f"Child onboarding request rejected for {req.company_name}. Reason: {reason}",
            company_id=req.parent_company_id,
            actor_id=request.user.id,
            source_record_type="ChildOnboardingRequest",
            source_record_id=req.id
        )
        return Response(ChildOnboardingRequestSerializer(req).data)

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        result = check_access(request.user, "tenant.child_onboarding.withdraw")
        if not result.granted:
            return Response({"error": result.reason}, status=status.HTTP_403_FORBIDDEN)

        req = self.get_object()
        if req.status != "submitted":
            return Response({"error": "Only submitted requests can be withdrawn."}, status=status.HTTP_400_BAD_REQUEST)

        req.status = "withdrawn"
        req.save()

        from apps.tenant.services import log_tenant_audit
        log_tenant_audit(
            event_code="tenant.child_onboarding_request.withdrawn",
            description=f"Child onboarding request withdrawn for {req.company_name}",
            company_id=req.parent_company_id,
            actor_id=request.user.id,
            source_record_type="ChildOnboardingRequest",
            source_record_id=req.id
        )
        return Response(ChildOnboardingRequestSerializer(req).data)


class CapabilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Capability.objects.filter(is_active=True).order_by('code')
    serializer_class = CapabilitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None



