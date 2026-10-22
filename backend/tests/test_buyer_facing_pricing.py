"""
Buyer-facing pricing.

A buyer may only see a price when a BuyerFacingPricingVisibilityEvidence row
grants visibility for their company, and only the buyer-safe fields are
exposed. These tests lock in both rules.
"""
import uuid
from decimal import Decimal

import pytest

from apps.tenant.models import CompanyType
from apps.catalog.models import Product
from apps.pricing.models import (
    EffectivePriceSnapshot, BuyerFacingPricingVisibilityEvidence, PricingProfile,
)


def _make_profile(vendor, buyer, channel="buyer_storefront"):
    return PricingProfile.objects.create(
        vendor_company_reference=vendor.id,
        buyer_company_reference=buyer.id,
        channel=channel,
        status="active",
        vendor_side_commission_rate=Decimal("0.0000"),
        buyer_side_commission_rate=Decimal("0.1400"),
        markup_rate=Decimal("0.5000"),
        currency="USD",
    )


def _make_snapshot(profile, product, buyer_price="24.00", is_current=True):
    return EffectivePriceSnapshot.objects.create(
        pricing_profile=profile,
        product_reference=product.id,
        channel=profile.channel,
        vendor_wholesale_price=Decimal("3.15"),
        vendor_side_commission_amount=Decimal("0.00"),
        buyer_side_commission_amount=Decimal("3.36"),
        buyer_facing_price=Decimal(buyer_price),
        currency="USD",
        bindability_status="order_bindable",
        procurement_bindable=True,
        invoice_bindable=True,
        is_current=is_current,
    )


def _make_evidence(snapshot, buyer, buyer_user, granted=True, redaction="allowed"):
    return BuyerFacingPricingVisibilityEvidence.objects.create(
        snapshot=snapshot,
        buyer_reference=buyer_user.id,
        company_scope_reference=buyer.id,
        channel=snapshot.channel,
        redaction_decision=redaction,
        visibility_granted=granted,
    )


def _make_product(vendor, sku="PRICE-001"):
    from django.utils import timezone
    return Product.objects.create(
        name=f"Product {sku}",
        sku=sku,
        brand="Acme",
        product_type="accessory",
        msrp=Decimal("49.99"),
        vendor_wholesale_price_amount=Decimal("3.15"),
        launch_date=timezone.now().date(),
        compatibility_status="complete",
        company_scope_reference=vendor.id,
        vendor_company_reference=vendor.id,
        status="active",
        selling_status="for_sale",
    )


@pytest.mark.django_db
class TestBuyerFacingPrices:
    def test_buyer_sees_only_granted_prices(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        snapshot = _make_snapshot(profile, product)
        _make_evidence(snapshot, buyer_company, buyer_user, granted=True)

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        assert resp.data["count"] == 1
        row = resp.data["results"][0]
        assert row["product_reference"] == str(product.id)
        assert row["product_name"] == "Product PRICE-001"
        assert row["sku"] == "PRICE-001"
        assert row["buyer_facing_price"] == "24.0000"
        assert row["currency"] == "USD"
        assert row["bindability_status"] == "order_bindable"
        assert row["valid_from"] is not None
        assert row["is_current"] is True

    def test_buyer_response_hides_vendor_commercials(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        snapshot = _make_snapshot(profile, product)
        _make_evidence(snapshot, buyer_company, buyer_user)

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        row = resp.data["results"][0]
        for hidden in (
            "vendor_wholesale_price",
            "vendor_side_commission_amount",
            "buyer_side_commission_amount",
            "pricing_profile",
        ):
            assert hidden not in row

    def test_price_without_visibility_evidence_is_hidden(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        _make_snapshot(profile, product)  # no evidence row

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_evidence_with_visibility_not_granted_is_hidden(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        snapshot = _make_snapshot(profile, product)
        _make_evidence(snapshot, buyer_company, buyer_user, granted=False)

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_evidence_marked_redacted_is_hidden(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        snapshot = _make_snapshot(profile, product)
        _make_evidence(snapshot, buyer_company, buyer_user, granted=True, redaction="redacted")

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_evidence_for_another_buyer_is_hidden(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        from apps.tenant.models import Company
        other_buyer = Company.objects.create(
            name="Other Buyer",
            company_type=CompanyType.BUYER,
            status="active",
            slug="other-buyer",
        )
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, other_buyer)
        snapshot = _make_snapshot(profile, product)
        _make_evidence(snapshot, other_buyer, buyer_user)

        resp = buyer_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_vendor_cannot_read_buyer_prices(
        self, vendor_client, vendor_company, buyer_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        snapshot = _make_snapshot(profile, product)

        resp = vendor_client.get("/api/v1/pricing/buyer-prices/")

        assert resp.status_code in (403, 404)
        assert not resp.data.get("results")

    def test_buyer_cannot_read_raw_snapshots(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        product = _make_product(vendor_company)
        profile = _make_profile(vendor_company, buyer_company)
        _make_snapshot(profile, product)

        resp = buyer_client.get("/api/v1/pricing/snapshots/")

        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_buyer_sees_only_own_pricing_profiles(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        from apps.tenant.models import Company
        other_buyer = Company.objects.create(
            name="Other Buyer",
            company_type=CompanyType.BUYER,
            status="active",
            slug="other-buyer-2",
        )
        mine = _make_profile(vendor_company, buyer_company, channel="buyer_storefront")
        theirs = _make_profile(vendor_company, other_buyer, channel="bulk_po")

        resp = buyer_client.get("/api/v1/pricing/profiles/")

        assert resp.status_code == 200
        ids = {row["id"] for row in resp.data["results"]}
        assert str(mine.id) in ids
        assert str(theirs.id) not in ids

    def test_buyer_cannot_read_vendor_commission_agreements(
        self, buyer_client, buyer_user, buyer_company, vendor_company
    ):
        from apps.pricing.models import VendorCommissionAgreement
        agreement = VendorCommissionAgreement.objects.create(
            vendor_company_reference=vendor_company.id,
            commission_percentage=Decimal("12.00"),
            status="pending",
        )

        resp = buyer_client.get("/api/v1/pricing/agreements/")

        assert resp.status_code == 200
        ids = {row["id"] for row in resp.data["results"]}
        assert str(agreement.id) not in ids
