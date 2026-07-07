"""
Tenant module integration tests.

Covers: company CRUD, entity management, user management,
company relationships, and the check_access endpoint.
"""
import pytest

from apps.tenant.models import (
    Company, CompanyEntity, CompanyType, CompanyStatus, EntityStatus,
    CompanyRelationship, RelationshipStatus,
)


@pytest.mark.django_db
class TestCompanyEndpoints:
    """Company CRUD — requires tenant.company.* capabilities (admin bypasses all)."""

    def test_admin_can_list_companies(self, admin_client, buyer_company, vendor_company):
        resp = admin_client.get("/api/v1/tenant/companies/")
        assert resp.status_code == 200
        names = [c["name"] for c in resp.data["results"]]
        assert "Buyer Corp" in names
        assert "Vendor Inc" in names

    def test_buyer_user_can_list_companies(self, buyer_client):
        resp = buyer_client.get("/api/v1/tenant/companies/")
        assert resp.status_code == 200

    def test_unauthenticated_cannot_list_companies(self, api_client):
        resp = api_client.get("/api/v1/tenant/companies/")
        assert resp.status_code == 401

    def test_admin_can_create_company(self, admin_client):
        resp = admin_client.post("/api/v1/tenant/companies/", {
            "name": "New Company",
            "company_type": "buyer",
            "status": "draft",
            "slug": "new-company",
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "New Company"

    def test_admin_can_filter_by_type(self, admin_client, buyer_company, vendor_company):
        resp = admin_client.get("/api/v1/tenant/companies/?company_type=buyer")
        assert resp.status_code == 200
        for c in resp.data["results"]:
            assert c["company_type"] == "buyer"

    def test_admin_can_retrieve_company(self, admin_client, buyer_company):
        resp = admin_client.get(f"/api/v1/tenant/companies/{buyer_company.id}/")
        assert resp.status_code == 200
        assert resp.data["id"] == str(buyer_company.id)


@pytest.mark.django_db
class TestEntityEndpoints:
    def test_admin_can_list_entities(self, admin_client, buyer_entity):
        resp = admin_client.get("/api/v1/tenant/entities/")
        assert resp.status_code == 200
        ids = [e["id"] for e in resp.data["results"]]
        assert str(buyer_entity.id) in ids

    def test_admin_can_create_entity(self, admin_client, buyer_company):
        resp = admin_client.post("/api/v1/tenant/entities/", {
            "company": str(buyer_company.id),
            "name": "New Entity",
            "status": "draft",
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "New Entity"

    def test_buyer_user_scoped_to_own_company(self, buyer_client, buyer_entity):
        """Buyer users can only see entities from their own company."""
        resp = buyer_client.get("/api/v1/tenant/entities/")
        assert resp.status_code == 200
        for e in resp.data["results"]:
            assert str(e["company"]) == str(buyer_entity.company_id)


@pytest.mark.django_db
class TestUserEndpoints:
    def test_admin_can_list_users(self, admin_client, buyer_user):
        resp = admin_client.get("/api/v1/tenant/users/")
        assert resp.status_code == 200

    def test_user_can_access_own_me(self, buyer_client, buyer_user):
        resp = buyer_client.get("/api/v1/tenant/users/me/")
        assert resp.status_code == 200
        assert resp.data["email"] == buyer_user.email

    def test_admin_me_returns_admin_profile(self, admin_client, admin_user):
        resp = admin_client.get("/api/v1/tenant/users/me/")
        assert resp.status_code == 200
        assert resp.data["is_cixci_admin"] is True

    def test_admin_can_check_access_for_user(self, admin_client, buyer_user):
        """POST to check_access endpoint returns granted/denied result."""
        resp = admin_client.post(
            f"/api/v1/tenant/users/{buyer_user.id}/check_access/",
            {"capability_code": "devices.device.list"},
        )
        assert resp.status_code == 200
        assert resp.data["granted"] is True
        assert resp.data["capability_code"] == "devices.device.list"

    def test_check_access_for_missing_capability(self, admin_client, buyer_user):
        resp = admin_client.post(
            f"/api/v1/tenant/users/{buyer_user.id}/check_access/",
            {"capability_code": "pricing.snapshot.delete"},
        )
        assert resp.status_code == 200
        assert resp.data["granted"] is False
        assert resp.data["reason"] == "capability_missing"


@pytest.mark.django_db
class TestCompanyRelationships:
    def test_create_relationship(self, buyer_client, buyer_company, vendor_company):
        resp = buyer_client.post("/api/v1/tenant/relationships/", {
            "buyer_company": str(buyer_company.id),
            "vendor_company": str(vendor_company.id),
            "status": "pending",
        })
        assert resp.status_code == 201
        assert resp.data["status"] == "pending"

    def test_list_relationships(self, admin_client, buyer_company, vendor_company):
        CompanyRelationship.objects.create(
            buyer_company=buyer_company,
            vendor_company=vendor_company,
            status=RelationshipStatus.PENDING,
        )
        resp = admin_client.get("/api/v1/tenant/relationships/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) >= 1

    def test_approve_relationship(self, admin_client, buyer_company, vendor_company):
        rel = CompanyRelationship.objects.create(
            buyer_company=buyer_company,
            vendor_company=vendor_company,
            status=RelationshipStatus.PENDING,
        )
        resp = admin_client.post(f"/api/v1/tenant/relationships/{rel.id}/approve/")
        assert resp.status_code == 200
        rel.refresh_from_db()
        assert rel.status == RelationshipStatus.ACTIVE
        assert rel.approved_at is not None
        assert rel.approved_by == admin_client.handler._force_user

    def test_filter_relationships_by_status(self, admin_client, buyer_company, vendor_company):
        CompanyRelationship.objects.create(
            buyer_company=buyer_company, vendor_company=vendor_company,
            status=RelationshipStatus.PENDING,
        )
        resp = admin_client.get("/api/v1/tenant/relationships/?status=pending")
        assert resp.status_code == 200
        for r in resp.data["results"]:
            assert r["status"] == "pending"


from django.core.exceptions import ValidationError
from apps.audit.models import AuditRecord
from apps.tenant.models import ChildOnboardingRequest, OnboardingRequestStatus

@pytest.mark.django_db
class TestTenantHierarchyValidation:
    def test_two_level_hierarchy_limit(self, buyer_company):
        # Create child company
        child = Company.objects.create(
            name="Child Company",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            parent_company=buyer_company,
            slug="child-company",
        )
        assert child.parent_company == buyer_company

        # Try to nest a third level (child of child)
        with pytest.raises(ValidationError) as excinfo:
            Company.objects.create(
                name="Grandchild Company",
                company_type=CompanyType.BUYER,
                status=CompanyStatus.PENDING_SETUP,
                parent_company=child,
                slug="grandchild-company",
            )
        assert "Hierarchy cannot exceed 2 levels" in str(excinfo.value)

    def test_child_cannot_be_marked_as_parent(self, buyer_company):
        with pytest.raises(ValidationError) as excinfo:
            Company.objects.create(
                name="Invalid Company",
                company_type=CompanyType.BUYER,
                status=CompanyStatus.PENDING_SETUP,
                parent_company=buyer_company,
                is_parent=True,
                slug="invalid-company",
            )
        assert "A child company cannot be marked as a parent" in str(excinfo.value) or "A company cannot be both a parent and a child" in str(excinfo.value)


@pytest.mark.django_db
class TestCompanyOnboardingAndActivation:
    def test_website_format_validation(self, admin_client):
        resp = admin_client.post("/api/v1/tenant/companies/", {
            "name": "New Company",
            "company_type": "buyer",
            "status": "draft",
            "slug": "new-company",
            "website": "invalid-url-format",
        })
        assert resp.status_code == 400
        assert "website" in resp.data or "website" in resp.data.get("detail", {})

    def test_business_email_domain_validation(self, admin_client):
        resp = admin_client.post("/api/v1/tenant/companies/", {
            "name": "New Company",
            "company_type": "buyer",
            "status": "draft",
            "slug": "new-company",
            "business_email_domain": "gmail.com",
        })
        assert resp.status_code == 400
        assert "business_email_domain" in resp.data or "business_email_domain" in resp.data.get("detail", {})

    def test_prevent_activation_when_setup_incomplete(self, admin_client):
        # Create a company in draft/pending_setup
        company = Company.objects.create(
            name="Incomplete Company",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            slug="incomplete-company",
        )
        
        # Try to activate via patch
        resp = admin_client.patch(f"/api/v1/tenant/companies/{company.id}/", {
            "status": "active"
        })
        assert resp.status_code == 400
        assert "cannot be activated" in str(resp.data) or "cannot be activated" in str(resp.data.get("detail", {}))


@pytest.mark.django_db
class TestLastAdminProtection:
    def test_prevent_deactivating_last_admin(self, buyer_client, buyer_user, cap_factory):
        # Make buyer_user the company admin by giving tenant.company.update and tenant.user.update capabilities
        admin_cap = cap_factory("tenant.company.update")
        update_cap = cap_factory("tenant.user.update")
        buyer_user.capabilities.add(admin_cap, update_cap)
        buyer_user.company.capabilities.add(admin_cap, update_cap)

        # Attempt to deactivate buyer_user (the only active admin)
        resp = buyer_client.patch(f"/api/v1/tenant/users/{buyer_user.id}/", {
            "is_active": False
        })
        assert resp.status_code == 400
        assert "Cannot deactivate or remove the last active administrator" in str(resp.data)

    def test_prevent_deleting_last_admin(self, buyer_client, buyer_user, cap_factory):
        admin_cap = cap_factory("tenant.company.update")
        delete_cap = cap_factory("tenant.user.delete")
        buyer_user.capabilities.add(admin_cap, delete_cap)
        buyer_user.company.capabilities.add(admin_cap, delete_cap)

        # Attempt to delete the only active admin
        resp = buyer_client.delete(f"/api/v1/tenant/users/{buyer_user.id}/")
        assert resp.status_code == 400
        assert "Cannot deactivate or remove the last active administrator" in str(resp.data)


@pytest.mark.django_db
class TestChildOnboardingRequestWorkflow:
    def test_parent_submits_child_request(self, buyer_client, buyer_user, cap_factory):
        # Give permission
        onb_cap = cap_factory("tenant.child_onboarding.create")
        buyer_user.capabilities.add(onb_cap)
        buyer_user.company.capabilities.add(onb_cap)

        resp = buyer_client.post("/api/v1/tenant/child-onboarding-requests/", {
            "company_name": "Child Store A",
            "brand_name": "Child Brand A",
            "website": "https://childstore.com",
            "region": "US",
            "primary_contact": "John Doe",
            "business_email_domain": "childstore.com",
        })
        assert resp.status_code == 201
        assert resp.data["status"] == "submitted"

        # Verify audit trail
        assert AuditRecord.objects.filter(event_code="tenant.child_onboarding_request.submitted").exists()

    def test_admin_approves_child_request(self, admin_client, buyer_user):
        req = ChildOnboardingRequest.objects.create(
            parent_company=buyer_user.company,
            requester=buyer_user,
            company_name="Approved Child",
            brand_name="Approved Brand",
            website="https://approvedchild.com",
            region="US",
            primary_contact="Jane Doe",
            business_email_domain="approvedchild.com",
            status="submitted",
        )
        resp = admin_client.post(f"/api/v1/tenant/child-onboarding-requests/{req.id}/approve/")
        assert resp.status_code == 200
        req.refresh_from_db()
        assert req.status == "approved"

        # Check that the child company was created in Pending Setup
        child_company = Company.objects.get(name="Approved Child")
        assert child_company.status == CompanyStatus.PENDING_SETUP
        assert child_company.parent_company == buyer_user.company

        # Verify audit trail
        assert AuditRecord.objects.filter(event_code="tenant.child_onboarding_request.approved").exists()
        assert AuditRecord.objects.filter(event_code="tenant.company.created").exists()


@pytest.mark.django_db
class TestRegionalVendorDiscovery:
    def test_buyer_vendor_regional_visibility(self, buyer_client, buyer_company, vendor_company):
        # Buyer in Region US
        buyer_company.approved_regions = ["US"]
        buyer_company.save()

        # Vendor A in Region US (active)
        vendor_company.approved_regions = ["US"]
        vendor_company.save()

        # Vendor B in Region EU (active)
        vendor_b = Company.objects.create(
            name="Vendor Europe",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="vendor-europe",
            approved_regions=["EU"],
        )

        resp = buyer_client.get("/api/v1/tenant/companies/")
        assert resp.status_code == 200
        names = [c["name"] for c in resp.data["results"]]
        assert "Vendor Inc" in names
        assert "Vendor Europe" not in names


@pytest.mark.django_db
class TestCapabilityAssignmentRules:
    def test_default_capabilities_assigned_on_company_save(self, cap_factory):
        # We need to make sure the capability records exist for defaulting to find them
        cap_factory("devices.portfolio.self_modify")
        cap_factory("devices.dqe.create")
        cap_factory("devices.dqe.read")
        cap_factory("devices.dqe.list")
        cap_factory("catalog.product.create")
        cap_factory("catalog.product.update")
        cap_factory("catalog.product.delete")
        cap_factory("catalog.product.manage_selling")

        # 1. Buyer company without buyer_type
        company_buyer = Company.objects.create(
            name="Buyer One",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            slug="buyer-one",
        )
        buyer_caps = list(company_buyer.capabilities.values_list("code", flat=True))
        assert "devices.portfolio.self_modify" in buyer_caps
        assert "devices.dqe.create" not in buyer_caps

        # 2. Buyer company with buyer_type=mvno
        company_mvno = Company.objects.create(
            name="MVNO One",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            slug="mvno-one",
            external_id='{"buyer_type": "mvno"}',
        )
        mvno_caps = list(company_mvno.capabilities.values_list("code", flat=True))
        assert "devices.portfolio.self_modify" in mvno_caps
        assert "devices.dqe.create" in mvno_caps
        assert "devices.dqe.read" in mvno_caps
        assert "devices.dqe.list" in mvno_caps

        # 3. Vendor company
        company_vendor = Company.objects.create(
            name="Vendor One",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.PENDING_SETUP,
            slug="vendor-one",
        )
        vendor_caps = list(company_vendor.capabilities.values_list("code", flat=True))
        assert "catalog.product.create" in vendor_caps
        assert "catalog.product.update" in vendor_caps
        assert "catalog.product.delete" in vendor_caps
        assert "catalog.product.manage_selling" in vendor_caps
        assert "devices.portfolio.self_modify" not in vendor_caps

    def test_assign_capability_endpoint_validation(self, admin_client, cap_factory):
        # Setup Capabilities
        cap_factory("devices.portfolio.self_modify")
        cap_factory("devices.dqe.create")
        cap_factory("catalog.product.create")

        # 1. Retailer buyer company
        company_retailer = Company.objects.create(
            name="Retailer One",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            slug="retailer-one",
            external_id='{"buyer_type": "retailer"}',
        )

        # Clear automatically assigned defaults to test manual assignment cleanly
        company_retailer.capabilities.clear()

        # Assign allowed capability (devices.portfolio.self_modify) -> success
        resp = admin_client.post(
            f"/api/v1/tenant/companies/{company_retailer.id}/assign_capability/",
            {"capability_code": "devices.portfolio.self_modify"}
        )
        assert resp.status_code == 200
        assert company_retailer.capabilities.filter(code="devices.portfolio.self_modify").exists()

        # Assign forbidden capability (devices.dqe.create - forbidden for retailer) -> 400
        resp = admin_client.post(
            f"/api/v1/tenant/companies/{company_retailer.id}/assign_capability/",
            {"capability_code": "devices.dqe.create"}
        )
        assert resp.status_code == 400

        # Assign forbidden capability (catalog.product.create - vendor only) -> 400
        resp = admin_client.post(
            f"/api/v1/tenant/companies/{company_retailer.id}/assign_capability/",
            {"capability_code": "catalog.product.create"}
        )
        assert resp.status_code == 400

        # 2. MVNO buyer company
        company_mvno = Company.objects.create(
            name="MVNO Two",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.PENDING_SETUP,
            slug="mvno-two",
            external_id='{"buyer_type": "mvno"}',
        )
        company_mvno.capabilities.clear()

        # Assign allowed DQE capability -> success
        resp = admin_client.post(
            f"/api/v1/tenant/companies/{company_mvno.id}/assign_capability/",
            {"capability_code": "devices.dqe.create"}
        )
        assert resp.status_code == 200

