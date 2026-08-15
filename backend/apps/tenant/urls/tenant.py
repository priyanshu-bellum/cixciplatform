"""Tenant management URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tenant.views import (
    CompanyViewSet, CompanyEntityViewSet, UserViewSet, CompanyRelationshipViewSet,
    ChildOnboardingRequestViewSet, CapabilityViewSet,
    UserInvitationViewSet, CompanyUserMembershipViewSet,
)

router = DefaultRouter()
router.register("companies", CompanyViewSet, basename="company")
router.register("entities", CompanyEntityViewSet, basename="entity")
router.register("users", UserViewSet, basename="user")
router.register("relationships", CompanyRelationshipViewSet, basename="relationship")
router.register("child-onboarding-requests", ChildOnboardingRequestViewSet, basename="child-onboarding-request")
router.register("capabilities", CapabilityViewSet, basename="capability")
router.register("invitations", UserInvitationViewSet, basename="invitation")
router.register("memberships", CompanyUserMembershipViewSet, basename="membership")

urlpatterns = [
    path("", include(router.urls)),
]
