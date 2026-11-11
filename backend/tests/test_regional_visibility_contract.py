"""Region document acceptance: canonical entity scope, current gates, history."""
from datetime import timedelta
import uuid
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit.models import AuditRecord
from apps.catalog.models import Product, ProductCompatibilityAssertion
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.pricing.models import VendorRegionalShippingFee
from apps.tenant.models import CompanyEntity, CompanyRelationship, OperatingRegion
from apps.tenant.regional_visibility import filter_buyer_regional_products, regional_setup_status

pytestmark = pytest.mark.django_db


@pytest.fixture
def regional(settings, buyer_user, vendor_company):
    settings.REGIONAL_VISIBILITY_ENFORCE = True
    settings.MEDIA_READINESS_ENFORCE_BUYER = False
    region = OperatingRegion.objects.create(code="US", name="United States")
    entity = buyer_user.entity
    entity.country_code = "US"
    entity.save()
    vendor_company.approved_regions = [region.code]
    vendor_company.save()
    relationship = CompanyRelationship.objects.create(buyer_company=buyer_user.company, vendor_company=vendor_company, status="active")
    fee = VendorRegionalShippingFee.objects.create(vendor_company_reference=vendor_company.id, region_code=region.code, fee_amount="5", currency="USD", status="active")
    product = Product.objects.create(name="Regional accessory", sku="REGIONAL", product_type="case", company_scope_reference=vendor_company.id, vendor_company_reference=vendor_company.id, launch_date=timezone.localdate())
    kind = DeviceType.objects.create(code="phone", name="Phone", status="active")
    device = Device.objects.create(name="Regional phone", device_type=kind, manufacturer=Manufacturer.objects.create(name="Region Test Maker"))
    add_device_to_portfolio(buyer_user, device.id)
    ProductCompatibilityAssertion.objects.create(product=product, device_reference=device.id, is_compatible=True, compatibility_basis="manufacturer_assertion")
    Product.objects.filter(pk=product.pk).update(status="active", compatibility_status="complete")
    return buyer_user, vendor_company, entity, region, relationship, fee, product


def visible(state, entity=None):
    buyer, _, selected, _, _, _, product = state
    return list(filter_buyer_regional_products(Product.objects.filter(pk=product.id), buyer.company.id, (entity or selected).id).values_list("id", flat=True))


def test_region_matches_need_all_independent_gates(regional):
    buyer, vendor, entity, region, relationship, fee, product = regional
    assert visible(regional) == [product.id]
    assert regional_setup_status(buyer.company.id, entity.id)["status"] == "ready"
    relationship.status = "pending"; relationship.save()
    assert visible(regional) == []
    relationship.status = "active"; relationship.save()
    fee.status = "draft"; fee.save()
    assert visible(regional) == []
    fee.status = "active"; fee.save()
    vendor.approved_regions = []; vendor.save()
    assert visible(regional) == []


def test_no_address_or_parent_inheritance_and_entity_isolation(regional, vendor_entity):
    buyer, _, entity, region, _, _, product = regional
    child = CompanyEntity.objects.create(company=buyer.company, name="Another store", status="active", country_code="CA", region_code="US")
    assert visible(regional, child) == []
    assert visible(regional, vendor_entity) == []
    entity.region_code = "NY"; entity.country_code = ""; entity.save()
    assert visible(regional) == []
    assert regional_setup_status(buyer.company.id, entity.id)["reason"] == "buyer_operating_region_required"


def test_retired_region_and_product_relationship_scope(regional):
    _, _, _, region, relationship, _, product = regional
    relationship.eligible_product_types = ["different_type"]; relationship.save()
    assert visible(regional) == []
    relationship.eligible_product_types = [product.product_type]; relationship.save()
    assert visible(regional) == [product.id]
    relationship.eligible_regions = ["CA"]; relationship.save()
    assert visible(regional) == []
    relationship.eligible_regions = []; relationship.save()
    region.is_active = False; region.save()
    assert visible(regional) == []


def test_fee_effective_period_and_ambiguous_configuration_hold(regional):
    _, vendor, _, region, _, fee, _ = regional
    fee.effective_from = timezone.now() + timedelta(days=1); fee.save()
    assert visible(regional) == []
    fee.effective_from = timezone.now() - timedelta(days=1); fee.save()
    assert visible(regional)
    VendorRegionalShippingFee.objects.create(vendor_company_reference=vendor.id, region_code=region.code, fee_amount="9", currency="USD", status="active")
    assert visible(regional) == []


def test_admin_and_own_vendor_source_catalog_unchanged(regional, admin_client, vendor_client, buyer_client):
    buyer, _, entity, _, _, _, product = regional
    entity.country_code = ""; entity.save()
    assert buyer_client.get("/api/v1/catalog/products/", {"sku": product.sku}).data["results"] == []
    for client in (admin_client, vendor_client):
        response = client.get("/api/v1/catalog/products/", {"sku": product.sku})
        assert response.status_code == 200
        assert [row["id"] for row in response.data["results"]] == [str(product.id)]


def test_region_api_governance_audits_and_immutable_identity(admin_client, buyer_client, cap_factory, buyer_user):
    response = admin_client.post("/api/v1/tenant/operating-regions/", {"code": "CA", "name": "Canada"}, format="json")
    assert response.status_code == 201, response.data
    identifier = response.data["id"]
    assert AuditRecord.objects.filter(source_record_id=identifier, event_code="tenant.operating_region.configured").exists()
    assert admin_client.patch(f"/api/v1/tenant/operating-regions/{identifier}/", {"code": "US"}, format="json").status_code == 400
    buyer_user.capabilities.add(cap_factory("tenant.company.update"))
    assert buyer_client.post("/api/v1/tenant/operating-regions/", {"code": "XX", "name": "Unauthorized"}, format="json").status_code == 403


def test_admin_setup_journey_persists_region_and_only_selected_entity(admin_client, buyer_entity):
    """Company onboarding registers country and HQ region without another setup step."""
    assert admin_client.get("/api/v1/tenant/operating-regions/").data == []
    created = admin_client.post("/api/v1/tenant/companies/", {"name": "Country Onboard Buyer", "slug": "country-onboard-buyer", "company_type": "buyer", "country_code": "USA", "region_code": "NY", "status": "draft"}, format="json")
    assert created.status_code == 201, created.data
    assert created.data["country_code"] == "US"
    hq = CompanyEntity.objects.get(company_id=created.data["id"])
    region_id = str(hq.operating_region_id)
    reloaded = admin_client.get(f"/api/v1/tenant/entities/{hq.id}/")
    assert reloaded.json()["operating_region"] == region_id
    assert reloaded.json()["operating_region_detail"]["code"] == "US"
    sibling = CompanyEntity.objects.create(company=hq.company, name="Canadian store", country_code="CAN", status="active")
    assert sibling.operating_region.code == "CA"
    assert (hq.region_code, hq.country_code) == ("NY", "US")
    assert AuditRecord.objects.filter(source_record_id=hq.id, event_code="tenant.entity.region_from_country").exists()


def test_setup_rejects_retired_or_unknown_region_and_duplicate_code(admin_client, buyer_entity):
    region = OperatingRegion.objects.create(code="US", name="Retired test region", is_active=False)
    for identifier in (str(region.id), str(uuid.uuid4())):
        rejected = admin_client.patch(f"/api/v1/tenant/entities/{buyer_entity.id}/", {"operating_region": identifier}, format="json")
        assert rejected.status_code == 400, rejected.data
    duplicate = admin_client.post("/api/v1/tenant/operating-regions/", {"code": region.code, "name": "Duplicate"}, format="json")
    assert duplicate.status_code == 400
    invalid = admin_client.post("/api/v1/tenant/operating-regions/", {"code": "invalid code", "name": "Invalid code"}, format="json")
    assert invalid.status_code == 400
    buyer_entity.country_code = "USA"; buyer_entity.save()
    assert buyer_entity.operating_region_id == region.id
    region.refresh_from_db()
    assert not region.is_active
    assert admin_client.patch(f"/api/v1/tenant/entities/{buyer_entity.id}/", {"country_code": "ZZ"}, format="json").status_code == 400
    buyer_entity.refresh_from_db()
    assert buyer_entity.operating_region_id == region.id


@pytest.mark.parametrize("value,expected", [("US", "US"), ("USA", "US"), (" us ", "US"), ("CAN", "CA"), ("CA", "CA"), ("GBR", "GB")])
def test_country_code_identity_aliases(value, expected):
    from apps.tenant.country_regions import normalize_country_code
    assert normalize_country_code(value, strict=True) == expected


def test_missing_country_does_not_default_a_buyer_to_us(buyer_company):
    assert buyer_company.country_code == ""
    default = buyer_company.entities.get()
    assert default.country_code == "" and default.operating_region_id is None


def test_country_change_recalculates_current_entity_without_changing_sibling(regional, admin_client):
    buyer, _, entity, _, _, _, _ = regional
    sibling = CompanyEntity.objects.create(company=buyer.company, name="Independent US store", country_code="US", status="active")
    response = admin_client.patch(f"/api/v1/tenant/entities/{entity.id}/", {"country_code": "CAN"}, format="json")
    assert response.status_code == 200
    entity.refresh_from_db(); sibling.refresh_from_db()
    assert entity.country_code == "CA" and entity.operating_region.code == "CA"
    assert sibling.country_code == "US" and sibling.operating_region.code == "US"
    assert visible(regional) == []


def test_entity_configuration_authorization(regional, admin_client, buyer_client, buyer_user, cap_factory):
    _, _, entity, region, _, _, _ = regional
    buyer_user.capabilities.add(cap_factory("tenant.entity.update"))
    assert buyer_client.patch(f"/api/v1/tenant/entities/{entity.id}/", {"operating_region": None}, format="json").status_code == 400
    assert admin_client.patch(f"/api/v1/tenant/entities/{entity.id}/", {"operating_region": None}, format="json").status_code == 400
    response = admin_client.patch(f"/api/v1/tenant/entities/{entity.id}/", {"country_code": "CAN"}, format="json")
    assert response.status_code == 200, response.data
    assert AuditRecord.objects.filter(source_record_id=entity.id, event_code="tenant.entity.operating_region_changed").exists()


def test_entity_creation_cannot_cross_company(regional, buyer_client, buyer_user, vendor_company, cap_factory):
    buyer_user.capabilities.add(cap_factory("tenant.entity.create"))
    response = buyer_client.post("/api/v1/tenant/entities/", {"company": str(vendor_company.id), "name": "Foreign injected store", "status": "active"}, format="json")
    assert response.status_code == 403
    assert not CompanyEntity.objects.filter(name="Foreign injected store").exists()


def test_region_activation_requires_fee_and_no_automatic_address_backfill(regional, admin_user):
    from apps.tenant.services import handle_vendor_region_change
    from rest_framework.exceptions import ValidationError
    _, vendor, entity, region, _, fee, _ = regional
    another = OperatingRegion.objects.create(code="CA", name="Canada")
    with pytest.raises(ValidationError):
        handle_vendor_region_change(vendor.id, another.code, "activate", actor_reference=admin_user.id)
    vendor.refresh_from_db()
    assert another.code not in vendor.approved_regions
    fee.refresh_from_db()
    fee_before = (fee.fee_amount, fee.currency)
    handle_vendor_region_change(vendor.id, region.code, "deactivate", actor_reference=admin_user.id)
    fee.refresh_from_db()
    assert (fee.fee_amount, fee.currency) == fee_before
    entity.refresh_from_db()
    assert entity.operating_region_id == region.id


def test_vendor_fee_api_cannot_spoof_other_company_or_default_currency(regional, vendor_client, vendor_user, cap_factory, buyer_company):
    _, vendor, _, region, _, _, _ = regional
    vendor_user.capabilities.add(cap_factory("pricing.shipping_fee.create"))
    payload = {"region_code": region.code, "fee_amount": "7", "status": "draft"}
    assert vendor_client.post("/api/v1/pricing/shipping-fees/", payload, format="json").status_code == 400
    payload.update(currency="USD", vendor_company_reference=str(buyer_company.id))
    assert vendor_client.post("/api/v1/pricing/shipping-fees/", payload, format="json").status_code == 400
    payload.pop("vendor_company_reference")
    response = vendor_client.post("/api/v1/pricing/shipping-fees/", payload, format="json")
    assert response.status_code == 201, response.data
    assert response.data["vendor_company_reference"] == str(vendor.id)


def test_release_hold_preserves_existing_reads_without_fabricated_configuration(regional, settings):
    _, _, entity, _, relationship, _, product = regional
    entity.country_code = ""; entity.save()
    relationship.status = "pending"; relationship.save()
    settings.REGIONAL_VISIBILITY_ENFORCE = False
    assert visible(regional) == [product.id]
    assert regional_setup_status(entity.company_id, entity.id)["enforced"] is False


def test_buyer_fee_history_uses_order_entity_not_other_entities(regional, buyer_client, buyer_user, cap_factory):
    from apps.routing.models import Order
    from apps.pricing.models import ShippingFeeSnapshot
    _, vendor, entity, region, _, fee, _ = regional
    buyer_user.capabilities.add(cap_factory("pricing.shipping_fee_snapshot.list"))
    own_order = Order.objects.create(company_scope_reference=buyer_user.company.id, buyer_reference=buyer_user.id, buyer_entity_reference=entity.id, status="placed")
    other_entity = CompanyEntity.objects.create(company=buyer_user.company, name="Another billing store", status="active")
    other_order = Order.objects.create(company_scope_reference=buyer_user.company.id, buyer_reference=buyer_user.id, buyer_entity_reference=other_entity.id, status="placed")
    captured = []
    for order in (own_order, other_order):
        captured.append(ShippingFeeSnapshot.objects.create(source_fee=fee, vendor_company_reference=vendor.id, region_code=region.code,
            fee_amount=fee.fee_amount, currency=fee.currency, fee_type=fee.fee_type, order_reference=order.id, applied_amount=fee.fee_amount))
    response = buyer_client.get("/api/v1/pricing/shipping-fee-snapshots/")
    assert response.status_code == 200, response.data
    assert [row["id"] for row in response.data["results"]] == [str(captured[0].id)]
    fee.fee_amount = "6"; fee.save()
    captured[0].refresh_from_db()
    assert captured[0].applied_amount == 5
