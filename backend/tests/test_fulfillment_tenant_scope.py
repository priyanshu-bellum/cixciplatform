"""Fulfillment lists are tenant scoped: a user outside the owning vendor or buyer
company sees nothing, whatever capabilities the account holds."""
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.fulfillment.models import (
    FulfillmentHandoff, SLAEvaluationRecord, VendorFulfillmentResponseSLAPolicy, VendorReturnImportLog,
    VendorShippingImportLog, ReturnRequest,
)
from apps.tenant.models import Company, CompanyEntity, User

pytestmark = pytest.mark.django_db

CAPABILITIES = ["fulfillment.handoff.list", "fulfillment.handoff.read", "fulfillment.sla.list", "fulfillment.sla.read",
    "fulfillment.return.list", "fulfillment.return.read"]
LISTS = ["handoffs", "sla-evaluations", "sla-policies", "sla-overrides", "shipping-import-logs", "return-import-logs", "return-requests"]


@pytest.fixture
def records(buyer_company, vendor_company):
    handoff = FulfillmentHandoff.objects.create(routed_suborder_reference=uuid.uuid4(), vendor_company_reference=vendor_company.pk,
        company_scope_reference=buyer_company.pk, status="shipped")
    policy = VendorFulfillmentResponseSLAPolicy.objects.create(vendor_company_reference=vendor_company.pk, status="active", response_window_hours=24)
    SLAEvaluationRecord.objects.create(handoff=handoff, sla_policy=policy, delivery_evidence_reference=uuid.uuid4(),
        expected_response_by=timezone.now() + timedelta(hours=24))
    VendorShippingImportLog.objects.create(vendor_company_reference=vendor_company.pk, company_scope_reference=buyer_company.pk, csv_content="x")
    VendorReturnImportLog.objects.create(vendor_company_reference=vendor_company.pk, company_scope_reference=buyer_company.pk, csv_content="x")
    ReturnRequest.objects.create(ran="RAN-SCOPE-1", suborder_reference=handoff.routed_suborder_reference, buyer_reference=buyer_company.pk,
        sku="SCOPE-SKU", upc="1")
    return handoff


def client_for(user, cap_factory):
    for code in CAPABILITIES:
        capability = cap_factory(code)
        user.capabilities.add(capability)
        if user.company:
            user.company.capabilities.add(capability)
    client = APIClient()
    client.force_authenticate(user)
    return client


def rows(response):
    data = response.data
    return data["results"] if isinstance(data, dict) and "results" in data else data


def outsider(company_type, slug):
    company = Company.objects.create(name="Outside " + slug, slug=slug, company_type=company_type, status="active")
    entity = CompanyEntity.objects.filter(company=company).first() or CompanyEntity.objects.create(company=company, name="HQ", status="active")
    return User.objects.create_user(email=f"{slug}@outside.test", password="test-only", entity=entity)


@pytest.mark.parametrize("company_type", ["manufacturer", "partner", "device_distributor"])
def test_other_company_types_see_no_fulfillment_records(company_type, records, cap_factory):
    client = client_for(outsider(company_type, "scope-" + company_type.replace("_", "-")), cap_factory)
    for name in LISTS:
        response = client.get(f"/api/v1/fulfillment/{name}/")
        assert response.status_code == 403 or rows(response) == [], (name, response.status_code)
    assert client.get(f"/api/v1/fulfillment/handoffs/{records.pk}/").status_code in (403, 404)


def test_another_vendor_and_another_buyer_see_nothing(records, cap_factory):
    for company_type in ("vendor", "buyer"):
        client = client_for(outsider(company_type, "scope-other-" + company_type), cap_factory)
        for name in LISTS:
            response = client.get(f"/api/v1/fulfillment/{name}/")
            assert response.status_code == 403 or rows(response) == [], (company_type, name)


def test_owning_vendor_and_buyer_still_see_their_handoff(records, vendor_user, buyer_user, cap_factory):
    for user in (vendor_user, buyer_user):
        response = client_for(user, cap_factory).get("/api/v1/fulfillment/handoffs/")
        assert response.status_code == 200 and [row["id"] for row in rows(response)] == [str(records.pk)]
    policies = client_for(vendor_user, cap_factory).get("/api/v1/fulfillment/sla-policies/")
    assert policies.status_code == 200 and len(rows(policies)) == 1
    assert rows(client_for(buyer_user, cap_factory).get("/api/v1/fulfillment/sla-policies/")) == []


def test_debug_order_is_for_cixci_admins_only(records, vendor_user, buyer_user, admin_client, cap_factory):
    for user in (vendor_user, buyer_user):
        assert client_for(user, cap_factory).get("/api/v1/fulfillment/handoffs/debug-order/", {"order_id": str(uuid.uuid4())}).status_code == 403
    assert admin_client.get("/api/v1/fulfillment/handoffs/debug-order/", {"order_id": str(uuid.uuid4())}).status_code == 200
