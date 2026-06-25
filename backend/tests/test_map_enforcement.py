import pytest
import uuid
from decimal import Decimal
from django.core.exceptions import ValidationError
from apps.tenant.models import Company, CompanyType
from apps.catalog.models import Product, ProductStatus
from apps.pricing.models import EffectivePriceSnapshot, SnapshotBindability, MapException
from apps.pricing.services import create_effective_price_snapshot
from apps.procurement.models import PurchaseOrder

@pytest.mark.django_db
class TestMapPricingEnforcement:
    
    @pytest.fixture
    def setup_data(self, buyer_user):
        # Create a vendor company
        vendor = Company.objects.create(
            name="Test Vendor Corp",
            company_type=CompanyType.VENDOR,
            status="active",
            slug="test-vendor",
            map_pricing_enforced=False
        )
        
        # Create products in a compliant state first
        p_missing_map = Product.objects.create(
            name="No MAP Price Product",
            sku="NOMAP-001",
            brand="BrandA",
            product_type="accessory",
            status=ProductStatus.ACTIVE,
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=vendor.id,
            vendor_wholesale_price_amount=Decimal("10.00"),
            msrp=Decimal("50.00"),
            map_price=Decimal("30.00"),
        )
        
        p_violating_price = Product.objects.create(
            name="Low MAP Price Product",
            sku="VIOL-002",
            brand="BrandB",
            product_type="accessory",
            status=ProductStatus.ACTIVE,
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=vendor.id,
            vendor_wholesale_price_amount=Decimal("20.00"),
            msrp=Decimal("50.00"),
            map_price=Decimal("40.00"),
            sale_price=Decimal("45.00"),
        )
        
        p_compliant = Product.objects.create(
            name="Compliant Product",
            sku="COMP-003",
            brand="BrandC",
            product_type="accessory",
            status=ProductStatus.ACTIVE,
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=vendor.id,
            vendor_wholesale_price_amount=Decimal("20.00"),
            msrp=Decimal("50.00"),
            map_price=Decimal("40.00"),
        )
        
        # Bypass Product.clean() validation to set up invalid states
        Product.objects.filter(id=p_missing_map.id).update(map_price=None)
        Product.objects.filter(id=p_violating_price.id).update(sale_price=Decimal("35.00")) # 35.00 < 40.00 (MAP Price)
        
        # Refresh from DB
        p_missing_map.refresh_from_db()
        p_violating_price.refresh_from_db()
        
        # Enforce MAP pricing now
        vendor.map_pricing_enforced = True
        vendor.save()
        
        return {
            "vendor": vendor,
            "p_missing_map": p_missing_map,
            "p_violating_price": p_violating_price,
            "p_compliant": p_compliant,
            "buyer_company": buyer_user.entity.company,
        }

    def test_product_catalog_filtering(self, buyer_client, setup_data):
        """Violating products should be filtered out of the catalog for buyers."""
        resp = buyer_client.get("/api/v1/catalog/products/")
        assert resp.status_code == 200
        product_skus = [p["sku"] for p in resp.data["results"]]
        
        # Compliant should be in
        assert "COMP-003" in product_skus
        # Missing MAP and violating pricing should be excluded
        assert "NOMAP-001" not in product_skus
        assert "VIOL-002" not in product_skus

    def test_product_catalog_filtering_with_exception(self, buyer_client, setup_data):
        """If a MAP exception exists for the violating product/buyer, it should be visible."""
        from datetime import date
        MapException.objects.create(
            vendor_company_reference=setup_data["vendor"].id,
            buyer_company_reference=setup_data["buyer_company"].id,
            sku="VIOL-002",
            approved_minimum_price=Decimal("30.00"),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status="approved"
        )
        
        resp = buyer_client.get("/api/v1/catalog/products/")
        assert resp.status_code == 200
        product_skus = [p["sku"] for p in resp.data["results"]]
        
        # COMP-003 and VIOL-002 (with approved exception) should be present
        assert "COMP-003" in product_skus
        assert "VIOL-002" in product_skus
        # NOMAP-001 still excluded
        assert "NOMAP-001" not in product_skus

    def test_export_job_validation_gate(self, buyer_client, setup_data):
        """Creating an export job with a MAP-violating product should fail."""
        resp = buyer_client.post("/api/v1/catalog/export-jobs/create_job/", {
            "format": "csv",
            "product_ids": [str(setup_data["p_missing_map"].id), str(setup_data["p_compliant"].id)]
        }, format="json")
        assert resp.status_code == 400
        assert "product_ids" in resp.data["detail"]
        assert any("missing a MAP price" in msg for msg in resp.data["detail"]["product_ids"])

    def test_effective_price_snapshot_bindability(self, setup_data):
        """Snapshot generation should mark violating products as NOT_BINDABLE."""
        # Compliant
        snap_comp = create_effective_price_snapshot(setup_data["p_compliant"], setup_data["buyer_company"], "portal")
        assert snap_comp.bindability_status == SnapshotBindability.ORDER_BINDABLE
        
        # Missing MAP
        snap_missing = create_effective_price_snapshot(setup_data["p_missing_map"], setup_data["buyer_company"], "portal")
        assert snap_missing.bindability_status == SnapshotBindability.NOT_BINDABLE
        
        # Violating price
        snap_viol = create_effective_price_snapshot(setup_data["p_violating_price"], setup_data["buyer_company"], "portal")
        assert snap_viol.bindability_status == SnapshotBindability.NOT_BINDABLE

    def test_purchase_order_validation(self, setup_data):
        """PurchaseOrder save should fail if it references a non-bindable snapshot."""
        # Non-bindable snapshot
        snap_viol = create_effective_price_snapshot(setup_data["p_violating_price"], setup_data["buyer_company"], "portal")
        
        po = PurchaseOrder(
            company_scope_reference=setup_data["buyer_company"].id,
            buyer_reference=setup_data["buyer_company"].id,
            vendor_company_reference=setup_data["vendor"].id,
            status="draft",
            pricing_snapshot_reference=snap_viol.id
        )
        
        with pytest.raises(ValidationError) as excinfo:
            po.save()
            
        assert "not bindable due to MAP policy violations" in str(excinfo.value)
