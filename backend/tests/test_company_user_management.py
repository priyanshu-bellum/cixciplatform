import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.tenant.models import (
    Company, CompanyEntity, User, Capability, UserInvitation,
    CompanyUserMembership, CompanyType, CompanyStatus, InvitationStatus, MembershipStatus
)
from apps.tenant.services import (
    seed_company_user_management_capabilities, check_access,
    create_user_invitation, resend_user_invitation, revoke_user_invitation,
    accept_user_invitation, update_user_lifecycle, grant_company_admin,
    revoke_company_admin, system_admin_hierarchy_transfer,
    ensure_effective_local_company_admin_invariant
)


@pytest.fixture
def setup_user_mgmt_data(db):
    seed_company_user_management_capabilities()

    # Create Buyer Company
    buyer_company = Company.objects.create(
        name="Test Buyer Corp",
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
        slug="test-buyer-corp"
    )
    buyer_entity = CompanyEntity.objects.filter(company=buyer_company).first()

    # Create Buyer Admin
    buyer_admin = User.objects.create_user(
        email="admin@buyer.com",
        entity=buyer_entity,
        password="Password123!",
        first_name="Buyer",
        last_name="Admin",
        is_active=True
    )
    buyer_membership = CompanyUserMembership.objects.create(
        user=buyer_admin,
        company=buyer_company,
        entity=buyer_entity,
        status=MembershipStatus.ACTIVE,
        role_bundle="company_admin",
        is_company_admin=True
    )

    # Assign all 5 capabilities to Buyer Admin
    caps = Capability.objects.filter(module="tenant")
    buyer_admin.capabilities.set(caps)
    buyer_membership.assigned_capabilities.set(caps)

    # Create System Admin
    sys_admin = User.objects.create_superuser(
        email="sysadmin@cixci.com",
        password="Password123!",
        first_name="System",
        last_name="Admin"
    )

    # Create Vendor Company
    vendor_company = Company.objects.create(
        name="Test Vendor Accessories",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug="test-vendor-accessories"
    )
    vendor_entity = CompanyEntity.objects.filter(company=vendor_company).first()
    vendor_admin = User.objects.create_user(
        email="admin@vendor.com",
        entity=vendor_entity,
        password="Password123!",
        first_name="Vendor",
        last_name="Admin",
        is_active=True
    )
    vendor_membership = CompanyUserMembership.objects.create(
        user=vendor_admin,
        company=vendor_company,
        entity=vendor_entity,
        status=MembershipStatus.ACTIVE,
        role_bundle="company_admin",
        is_company_admin=True
    )
    vendor_admin.capabilities.set(caps)
    vendor_membership.assigned_capabilities.set(caps)

    return {
        "buyer_company": buyer_company,
        "buyer_admin": buyer_admin,
        "buyer_membership": buyer_membership,
        "vendor_company": vendor_company,
        "vendor_admin": vendor_admin,
        "vendor_membership": vendor_membership,
        "sys_admin": sys_admin
    }


@pytest.mark.django_db
class TestCompanyUserManagement:

    def test_seed_capabilities(self, setup_user_mgmt_data):
        c1 = Capability.objects.filter(code="company_user_management.read_users").first()
        c2 = Capability.objects.filter(code="company_user_management.manage_invitations").first()
        c3 = Capability.objects.filter(code="company_user_management.manage_user_access").first()
        c4 = Capability.objects.filter(code="company_user_management.manage_user_lifecycle").first()
        c5 = Capability.objects.filter(code="company_user_management.grant_company_admin").first()

        assert c1 is not None
        assert c2 is not None
        assert c3 is not None
        assert c4 is not None
        assert c5 is not None

    def test_check_access_core_capabilities(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]

        res = check_access(admin, "company_user_management.read_users", company_id=data["buyer_company"].id)
        assert res.granted is True

        res2 = check_access(admin, "company_user_management.grant_company_admin", company_id=data["buyer_company"].id)
        assert res2.granted is True

    def test_invitation_creation_and_acceptance(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]
        company = data["buyer_company"]

        # Create invitation
        inv = create_user_invitation(
            actor=admin,
            target_company=company,
            email="newuser@buyer.com",
            first_name="New",
            last_name="User",
            role_bundle="standard_user"
        )
        assert inv.status == InvitationStatus.PENDING
        assert inv.expires_at > timezone.now()

        # Accept invitation
        user = accept_user_invitation(token=inv.token, password="NewPassword123!")
        assert user is not None
        assert user.email == "newuser@buyer.com"

        inv.refresh_from_db()
        assert inv.status == InvitationStatus.ACCEPTED

        membership = CompanyUserMembership.objects.filter(user=user).first()
        assert membership is not None
        assert membership.company == company

    def test_invitation_resend_token_rotation(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]
        company = data["buyer_company"]

        inv = create_user_invitation(
            actor=admin,
            target_company=company,
            email="resenduser@buyer.com",
            first_name="Resend",
            last_name="User"
        )
        old_token = inv.token

        resent_inv = resend_user_invitation(actor=admin, invitation_id=inv.id)
        assert resent_inv.token != old_token
        assert resent_inv.status == InvitationStatus.PENDING

    def test_invitation_revocation(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]
        company = data["buyer_company"]

        inv = create_user_invitation(
            actor=admin,
            target_company=company,
            email="revokeuser@buyer.com",
            first_name="Revoke",
            last_name="User"
        )
        revoked_inv = revoke_user_invitation(actor=admin, invitation_id=inv.id)
        assert revoked_inv.status == InvitationStatus.REVOKED

        with pytest.raises(ValidationError, match="INVITATION_REVOKED"):
            accept_user_invitation(token=inv.token, password="Password123!")

    def test_final_local_company_admin_invariant(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]
        company = data["buyer_company"]

        # Attempt to revoke Company Admin when only 1 active admin exists -> Raised ValidationError
        with pytest.raises(ValidationError, match="FINAL_COMPANY_ADMIN_REQUIRED"):
            revoke_company_admin(actor=admin, target_user_id=admin.id)

        # Attempt to deactivate last admin -> Raised ValidationError
        with pytest.raises(ValidationError, match="FINAL_COMPANY_ADMIN_REQUIRED"):
            update_user_lifecycle(actor=admin, target_user_id=admin.id, new_status=MembershipStatus.DEACTIVATED)

    def test_grant_admin_and_subsequent_revocation(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        admin = data["buyer_admin"]
        company = data["buyer_company"]

        # Add second user
        inv = create_user_invitation(actor=admin, target_company=company, email="user2@buyer.com", first_name="User2", last_name="Test")
        u2 = accept_user_invitation(token=inv.token, password="Password123!")

        # Grant admin to u2
        mem2 = grant_company_admin(actor=admin, target_user_id=u2.id)
        assert mem2.is_company_admin is True

        # Now revoking admin from u2 should succeed because admin remains
        mem2_revoked = revoke_company_admin(actor=admin, target_user_id=u2.id)
        assert mem2_revoked.is_company_admin is False

    def test_unrelated_hierarchy_rejection(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        vendor_admin = data["vendor_admin"]
        vendor_company = data["vendor_company"]

        # Attempt to invite an existing Buyer user email to Vendor company -> Rejected
        with pytest.raises(ValidationError, match="IDENTITY_IN_UNRELATED_HIERARCHY"):
            create_user_invitation(
                actor=vendor_admin,
                target_company=vendor_company,
                email="admin@buyer.com",
                first_name="Buyer",
                last_name="Admin"
            )

    def test_system_admin_hierarchy_transfer(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        sys_admin = data["sys_admin"]
        buyer_company = data["buyer_company"]
        vendor_company = data["vendor_company"]

        # Create user in Buyer company with 2 admins
        inv = create_user_invitation(actor=data["buyer_admin"], target_company=buyer_company, email="transferuser@buyer.com", first_name="Transfer", last_name="User")
        u = accept_user_invitation(token=inv.token, password="Password123!")

        # Execute system admin hierarchy transfer to vendor company
        transferred_mem = system_admin_hierarchy_transfer(
            system_admin=sys_admin,
            target_user_id=u.id,
            new_company_id=vendor_company.id,
            reason="Approved company transition"
        )
        assert transferred_mem.company == vendor_company
        assert transferred_mem.status == MembershipStatus.ACTIVE

    def test_api_endpoints_invitation_flow(self, setup_user_mgmt_data):
        data = setup_user_mgmt_data
        client = APIClient()
        client.force_authenticate(user=data["buyer_admin"])

        # 1. API Post Invite
        response = client.post("/api/v1/tenant/invitations/invite/", {
            "target_company": str(data["buyer_company"].id),
            "email": "apiuser@buyer.com",
            "first_name": "API",
            "last_name": "User",
            "role_bundle": "standard_user"
        }, format="json")
        assert response.status_code == 201
        inv_id = response.data["id"]

        # 2. API List Invitations
        response_list = client.get("/api/v1/tenant/invitations/")
        assert response_list.status_code == 200
        assert len(response_list.data["results"]) >= 1

        # 3. API Resend Invite
        response_resend = client.post(f"/api/v1/tenant/invitations/{inv_id}/resend/")
        assert response_resend.status_code == 200
