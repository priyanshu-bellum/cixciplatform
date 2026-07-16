"""
Product Catalog integration tests.

Covers: Product CRUD, selling status transitions, compatibility projection
lifecycle, and buyer export job creation.
"""
import pytest
import uuid

from apps.catalog.models import Product, BuyerScopedCompatibilityProjection


@pytest.fixture
def product(buyer_user):
    """A product scoped to buyer_user's company, compatible with a device in their portfolio."""
    from apps.devices.models import Device, DeviceType, Manufacturer
    from apps.devices.services import add_device_to_portfolio
    from apps.catalog.models import ProductCompatibilityAssertion

    p = Product.objects.create(
        name="Test Accessory",
        sku="ACC-001",
        brand="TestBrand",
        product_type="accessory",
        status="active",
        selling_status="for_sale",
        launch_date="2026-06-18",
        compatibility_status="complete",
        company_scope_reference=buyer_user.entity.company_id,
        vendor_company_reference=uuid.uuid4(),
    )

    dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone")
    mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
    device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)

    add_device_to_portfolio(buyer_user, device.id)

    ProductCompatibilityAssertion.objects.create(
        product=p,
        device_reference=device.id,
        is_compatible=True,
        is_excluded=False
    )
    return p


@pytest.mark.django_db
class TestProductEndpoints:
    def test_list_products(self, buyer_client, product):
        resp = buyer_client.get("/api/v1/catalog/products/")
        assert resp.status_code == 200
        assert any(p["name"] == "Test Accessory" for p in resp.data["results"])

    def test_retrieve_product(self, buyer_client, product):
        resp = buyer_client.get(f"/api/v1/catalog/products/{product.id}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Test Accessory"
        assert resp.data["sku"] == "ACC-001"

    def test_create_product(self, buyer_client, buyer_user):
        resp = buyer_client.post("/api/v1/catalog/products/", {
            "name": "New Charger",
            "sku": "CHG-001",
            "brand": "ChargeBrand",
            "product_type": "accessory",
            "launch_date": "2026-06-18",
            "vendor_company_reference": str(uuid.uuid4()),
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "New Charger"
        # Verify company_scope_reference was auto-set correctly by fetching the object
        from apps.catalog.models import Product as P
        created = P.objects.get(sku="CHG-001")
        assert created.company_scope_reference == buyer_user.entity.company_id

    def test_unauthenticated_cannot_list_products(self, api_client):
        resp = api_client.get("/api/v1/catalog/products/")
        assert resp.status_code == 401

    def test_search_by_name(self, buyer_client, product):
        resp = buyer_client.get("/api/v1/catalog/products/?search=Test+Acce")
        assert resp.status_code == 200
        assert any(p["sku"] == "ACC-001" for p in resp.data["results"])

    def test_filter_by_selling_status(self, buyer_client, product):
        resp = buyer_client.get("/api/v1/catalog/products/?selling_status=for_sale")
        assert resp.status_code == 200
        for p in resp.data["results"]:
            assert p["selling_status"] == "for_sale"

    def test_filter_by_status(self, buyer_client, product):
        resp = buyer_client.get("/api/v1/catalog/products/?status=active")
        assert resp.status_code == 200
        for p in resp.data["results"]:
            assert p["status"] == "active"

    def test_filter_by_device_id(self, buyer_client, buyer_user, product):
        from apps.devices.models import BuyerDevicePortfolioReference
        portfolio_ref = BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=buyer_user.id,
            active_flag=True
        ).first()
        device_id = portfolio_ref.device_id
        resp = buyer_client.get(f"/api/v1/catalog/products/?device_id={device_id}")
        assert resp.status_code == 200
        assert any(p["id"] == str(product.id) for p in resp.data["results"])

        # Test comma-separated list of UUIDs
        resp_multi = buyer_client.get(f"/api/v1/catalog/products/?device_id={device_id},{uuid.uuid4()}")
        assert resp_multi.status_code == 200
        assert any(p["id"] == str(product.id) for p in resp_multi.data["results"])

        resp2 = buyer_client.get(f"/api/v1/catalog/products/?device_id={uuid.uuid4()}")
        assert resp2.status_code == 200
        assert len(resp2.data["results"]) == 0


@pytest.mark.django_db
class TestSellingStatusTransition:
    def test_set_selling_status_to_stop_selling(self, buyer_client, product):
        resp = buyer_client.post(
            f"/api/v1/catalog/products/{product.id}/set_selling_status/",
            {"selling_status": "stop_selling"},
        )
        assert resp.status_code == 200
        assert resp.data["selling_status"] == "stop_selling"
        product.refresh_from_db()
        assert product.selling_status == "stop_selling"

    def test_set_selling_status_to_for_sale(self, buyer_client, product):
        resp = buyer_client.post(
            f"/api/v1/catalog/products/{product.id}/set_selling_status/",
            {"selling_status": "for_sale"},
        )
        assert resp.status_code == 200
        assert resp.data["selling_status"] == "for_sale"

    def test_set_invalid_selling_status_rejected(self, buyer_client, product):
        resp = buyer_client.post(
            f"/api/v1/catalog/products/{product.id}/set_selling_status/",
            {"selling_status": "not_a_real_status"},
        )
        assert resp.status_code == 400

    def test_selling_status_not_auto_changed_by_portfolio(self, buyer_user, product):
        """
        Architecture rule: portfolio removal does NOT auto-update selling status.
        Product Catalog owns commercial state.
        """
        from apps.devices.models import Device, DeviceType, Manufacturer
        from apps.devices.services import add_device_to_portfolio, remove_device_from_portfolio

        dt = DeviceType.objects.create(name="Phone2", code="phone2")
        mfr = Manufacturer.objects.create(name="Mfr2")
        device = Device.objects.create(name="Dev2", device_type=dt, manufacturer=mfr)

        add_device_to_portfolio(buyer_user, device.id)
        remove_device_from_portfolio(buyer_user, device.id)

        product.refresh_from_db()
        assert product.selling_status == "for_sale"  # unchanged — Product Catalog owns this


@pytest.mark.django_db
class TestCompatibilityProjection:
    def test_my_projection_returns_404_when_none(self, buyer_client):
        resp = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")
        assert resp.status_code == 404

    def test_my_projection_returns_data_when_exists(self, buyer_client, buyer_user):
        proj = BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_user.entity.company_id,
            buyer_entity_reference=buyer_user.entity_id,
            status="active",
            compatible_product_count=3,
            portfolio_snapshot_reference=uuid.uuid4(),
        )
        resp = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")
        assert resp.status_code == 200
        assert resp.data["compatible_product_count"] == 3
        assert resp.data["status"] == "active"


@pytest.mark.django_db
class TestExportJobs:
    def test_create_export_job(self, buyer_client, buyer_user):
        resp = buyer_client.post("/api/v1/catalog/export-jobs/create_job/", {
            "format": "csv",
            "include_incompatible": False,
        })
        assert resp.status_code == 201
        assert resp.data["format"] == "csv"
        assert resp.data["status"] == "pending"

    def test_list_export_jobs(self, buyer_client, buyer_user):
        # Create two jobs
        buyer_client.post("/api/v1/catalog/export-jobs/create_job/", {"format": "csv"})
        buyer_client.post("/api/v1/catalog/export-jobs/create_job/", {"format": "csv"})
        resp = buyer_client.get("/api/v1/catalog/export-jobs/list_jobs/")
        assert resp.status_code == 200
        assert len(resp.data) >= 2

    def test_export_job_processing_and_api_key_scoping(self, buyer_client, api_client, buyer_user, vendor_company):
        from apps.catalog.models import Product, BuyerProductExportJob, BuyerProductExportSelectionSnapshot
        from apps.media.models import MediaAsset
        from apps.catalog.tasks import process_buyer_export_job
        from apps.integration.models import CompanyAPIKey
        from django.conf import settings
        import os
        import uuid

        # Create a device and category config
        from apps.devices.models import Device, DeviceType, Manufacturer
        from apps.catalog.models import ProductCompatibilityAssertion, DynamicDropdownConfig

        dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone")
        dt.status = "active"
        dt.save()

        mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
        device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)
        device.lifecycle_status = "available"
        device.save()

        cfg, _ = DynamicDropdownConfig.objects.get_or_create(
            field_name="product_category",
            value="Chargers and Cables"
        )
        cfg.status = "active"
        cfg.compatibility_mode = "explicit"
        cfg.save()

        # 1. Create a product
        product = Product.objects.create(
            name="Exportable Charger",
            sku="EXP-CHG-001",
            brand="ChargeBrand",
            product_type="accessory",
            product_category="Chargers and Cables",
            launch_date="2026-06-18",
            status="active",
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_user.entity.company_id,
        )
        ProductCompatibilityAssertion.objects.create(
            product=product,
            device_reference=device.id,
            is_compatible=True,
            is_excluded=False
        )
        product.compatibility_status = "complete"
        product.save()

        # 2. Create another product (not exported)
        non_exported_product = Product.objects.create(
            name="Unexported Cable",
            sku="UNEXP-CBL-002",
            brand="CableBrand",
            product_type="accessory",
            product_category="Chargers and Cables",
            launch_date="2026-06-18",
            status="active",
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_user.entity.company_id,
        )
        ProductCompatibilityAssertion.objects.create(
            product=non_exported_product,
            device_reference=device.id,
            is_compatible=True,
            is_excluded=False
        )
        non_exported_product.compatibility_status = "complete"
        non_exported_product.save()

        # 3. Create the export job
        job = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_user.entity.company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            format="csv"
        )
        snapshot = BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=[str(product.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )

        # 4. Process the export job
        process_buyer_export_job(job.id)

        # Refresh from DB
        job.refresh_from_db()
        assert job.status == "completed"
        assert job.product_count == 1
        assert job.output_file_reference is not None

        # Verify MediaAsset and file on disk
        asset = MediaAsset.objects.get(id=job.output_file_reference)
        assert asset.status == "ready"
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        assert os.path.exists(full_path)

        # Clean up file after check
        try:
            os.remove(full_path)
        except OSError:
            pass

        # 5. Verify API Key Scoping
        # Create an API Key for the buyer's company
        api_key = CompanyAPIKey.objects.create(
            label="Test Buyer Key",
            token="cixci_key_test_buyer_token_12345",
            company_scope_reference=buyer_user.entity.company_id,
            is_active=True
        )

        # Call product list with API Key auth
        headers = {"HTTP_AUTHORIZATION": f"Api-Key {api_key.token}"}
        resp = api_client.get("/api/v1/catalog/products/", **headers)
        assert resp.status_code == 200, resp.data
        
        # Verify that ONLY the exported product is returned
        results = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        product_ids = [p["id"] for p in results]
        assert str(product.id) in product_ids, f"Expected {product.id} in {product_ids}"
        assert str(non_exported_product.id) not in product_ids

        # Call retrieve with API Key auth for the exported product (should succeed)
        resp_retrieve_exp = api_client.get(f"/api/v1/catalog/products/{product.id}/", **headers)
        assert resp_retrieve_exp.status_code == 200, resp_retrieve_exp.data

        # Call retrieve with API Key auth for the unexported product (should fail/404)
        resp_retrieve_unexp = api_client.get(f"/api/v1/catalog/products/{non_exported_product.id}/", **headers)
        assert resp_retrieve_unexp.status_code == 404


@pytest.mark.django_db
class TestOutOfStockStatus:
    def test_inventory_zero_triggers_out_of_stock(self, product):
        """Setting inventory to 0 on an Active product changes status to out_of_stock."""
        product.inventory_level = 0
        product.save()
        assert product.status == "out_of_stock"
        
        # Verify audit log exists
        from apps.audit.models import AuditRecord
        log = AuditRecord.objects.filter(
            source_record_id=product.id,
            event_code="catalog.product.updated"
        ).order_by("created_at").first()
        assert log is not None
        assert "due to Inventory Level reaching zero (System Automation)" in log.event_description

    def test_inventory_replenishment_reactivates(self, product, buyer_user):
        """Setting inventory to > 0 on an out_of_stock product reactivates it if all eligibility checks pass."""
        # Setup out of stock status
        product.status = "out_of_stock"
        product.inventory_level = 0
        product.save()
        
        # Ensure we have price, launch date today or past, and compatibility assertions
        product.vendor_wholesale_price_amount = 10.00
        # Add primary image
        product.primary_image_reference = uuid.uuid4()
        # Add compatibility assertion
        from apps.catalog.models import ProductCompatibilityAssertion
        ProductCompatibilityAssertion.objects.create(
            product=product,
            device_reference=uuid.uuid4(),
            is_compatible=True
        )
        product.inventory_level = 5
        product.save()
        assert product.status == "active"
        
        # Verify audit log exists
        from apps.audit.models import AuditRecord
        log = AuditRecord.objects.filter(
            source_record_id=product.id,
            event_code="catalog.product.updated"
        ).order_by("created_at").last()
        assert "due to inventory replenishment (System Automation)" in log.event_description

    def test_pre_launch_out_of_stock_fails(self, buyer_user):
        """A product with a future Launch Date cannot be saved as Out of Stock."""
        from django.core.exceptions import ValidationError
        import datetime
        future_date = (datetime.date.today() + datetime.timedelta(days=5)).strftime("%Y-%m-%d")
        
        p = Product(
            name="Future Accessory",
            sku="ACC-FUT",
            brand="TestBrand",
            product_type="accessory",
            status="out_of_stock",
            launch_date=future_date,
            release_date=future_date,
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=uuid.uuid4(),
        )
        with pytest.raises(ValidationError) as excinfo:
            p.save()
        assert "Products with a future Launch Date must remain Inactive unless an approved exception exists." in str(excinfo.value)

    def test_eol_to_out_of_stock_rules(self, product, buyer_user):
        """Non-admins cannot change EOL products to Out of Stock, but CIXCI admins can."""
        from django.core.exceptions import ValidationError
        import datetime
        from django.utils import timezone
        import pytz
        
        # Make product EOL
        product.status = "eol"
        est = pytz.timezone("US/Eastern")
        product.eol_date = timezone.now().astimezone(est).date().strftime("%Y-%m-%d")
        product.save()
        
        # Attempt to change to out_of_stock without admin privileges
        product.status = "out_of_stock"
        with pytest.raises(ValidationError) as excinfo:
            product.save(actor_id=buyer_user.id)
        assert "EOL products cannot be changed to Out of Stock without CIXCI Admin approval." in str(excinfo.value)
        
        # Make buyer_user an admin
        buyer_user.is_cixci_admin = True
        buyer_user.save()
        
        # Attempt with admin privileges should succeed
        product.status = "out_of_stock"
        product.save(actor_id=buyer_user.id)
        assert product.status == "out_of_stock"

    def test_order_placement_out_of_stock_fails(self, product):
        """Creating a new PurchaseOrderLine with an out_of_stock product fails validation."""
        from django.core.exceptions import ValidationError
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
        
        # Make product out_of_stock
        product.status = "out_of_stock"
        product.save()
        
        po = PurchaseOrder.objects.create(
            company_scope_reference=product.company_scope_reference,
            buyer_reference=uuid.uuid4(),
            vendor_company_reference=product.vendor_company_reference,
            status="draft"
        )
        
        line = PurchaseOrderLine(
            purchase_order=po,
            product_reference=product.id,
            quantity=2,
            unit_price_snapshot=10.00,
            line_total=20.00
        )
        with pytest.raises(ValidationError) as excinfo:
            line.save()
        assert f"Product SKU '{product.sku}' is currently Out of Stock and cannot be ordered." in str(excinfo.value)

    def test_is_tied_to_activity(self, product, buyer_user):
        """Test is_tied_to_activity helper when product is referenced in activity."""
        from apps.catalog.models import BuyerProductExportSelectionSnapshot, BuyerProductExportJob
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine

        # Initially False
        assert product.is_tied_to_activity is False

        # Create a PO line
        po = PurchaseOrder.objects.create(
            company_scope_reference=product.company_scope_reference,
            buyer_reference=uuid.uuid4(),
            vendor_company_reference=product.vendor_company_reference,
            status="draft"
        )
        po_line = PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=1,
            unit_price_snapshot=10.00,
            line_total=10.00
        )
        assert product.is_tied_to_activity is True

        # Clean up PO line to reset activity status
        po_line.delete()
        assert product.is_tied_to_activity is False

        # Create export selection snapshot
        export_job = BuyerProductExportJob.objects.create(
            buyer_reference=uuid.uuid4(),
            company_scope_reference=product.company_scope_reference,
            buyer_entity_reference=uuid.uuid4(),
            requested_by=buyer_user.id,
            format="csv"
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=export_job,
            product_ids=[str(product.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )
        assert product.is_tied_to_activity is True

    def test_state_based_update_restrictions(self, product, buyer_user, admin_user):
        """Standard vendors cannot modify Brand or critical pricing/logistics columns on active sold products."""
        from django.core.exceptions import ValidationError
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine

        # Tie product to activity
        po = PurchaseOrder.objects.create(
            company_scope_reference=product.company_scope_reference,
            buyer_reference=uuid.uuid4(),
            vendor_company_reference=product.vendor_company_reference,
            status="draft"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=1,
            unit_price_snapshot=10.00,
            line_total=10.00
        )

        # Standard non-admin attempts to change Brand
        product.brand = "NewBrand"
        with pytest.raises(ValidationError) as excinfo:
            product.save(actor_id=buyer_user.id)
        assert "Brand" in str(excinfo.value)
        product.refresh_from_db()

        # Standard non-admin attempts to change MSRP
        product.msrp = 999.00
        with pytest.raises(ValidationError) as excinfo:
            product.save(actor_id=buyer_user.id)
        assert "MSRP" in str(excinfo.value)
        product.refresh_from_db()

        # Admin attempts to change MSRP: succeeds
        product.msrp = 999.00
        product.save(actor_id=admin_user.id)
        assert product.msrp == 999.00

    def test_ai_review_trigger_on_content_change(self, product, buyer_user):
        """Updates to content-related fields like description on an active product keep status active (CIXCI admin review bypassed)."""
        # Non-admin changes description
        product.description = "New description with no color"
        product.save(actor_id=buyer_user.id)
        
        # Product status remains active
        assert product.status == "active"

    def test_compatibility_additive_and_permissions(self, buyer_client, admin_user, buyer_user, product):
        """Check compatibility API action for additive updates and permissions."""
        from apps.catalog.models import ProductCompatibilityAssertion

        ProductCompatibilityAssertion.objects.filter(product=product).delete()

        # Prepare first assertion
        device_id = str(uuid.uuid4())
        resp = buyer_client.post(
            f"/api/v1/catalog/products/{product.id}/compatibility/",
            {
                "compatibility_update_type": "add",
                "assertions": [{"device_id": device_id, "is_compatible": True}]
            },
            format="json"
        )
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["device_reference"] == device_id

        # Non-admin attempts to replace/remove on active product: returns 400
        resp = buyer_client.post(
            f"/api/v1/catalog/products/{product.id}/compatibility/",
            {
                "compatibility_update_type": "replace",
                "assertions": []
            },
            format="json"
        )
        assert resp.status_code == 400
        assert "Replacing or removing device compatibility assertions" in resp.data["error"]

    def test_bulk_upload_modes(self, buyer_client, buyer_user, product):
        """Test bulk upload endpoint with different update modes and UPC checks."""
        import io
        from apps.catalog.models import DynamicDropdownConfig

        # Setup vendor company reference and approved dropdowns
        product.vendor_company_reference = buyer_user.entity.company_id
        product.save()

        DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="TestBrand", display_name="TestBrand")
        DynamicDropdownConfig.objects.get_or_create(field_name="product_category", value="Cases", display_name="Cases")

        # We want to test create_only, update_only, and upsert modes.
        # Let's create a CSV file format string.
        # Headers: SKU, Brand, Product Category, UPC, Launch Date, Vendor Wholesale Price, MSRP, Product Name, Product Description, Product Status
        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status\n"
            f"{product.sku},TestBrand,Cases,{product.upc or '012345678901'},06/18/2026,10.00,20.00,Test Accessory,Premium description with no color,Active\n"
        )
        
        # Send bulk upload in create_only mode: should fail because product exists
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_create.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert resp.data["rows_failed"] == 1
        assert "already exists for this vendor" in resp.data["errors"][0]["validation_error"]

        # Send bulk upload in update_only mode for a non-existent SKU: should fail
        csv_data_new = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status\n"
            "NEW-SKU-999,TestBrand,Cases,012345678901,06/18/2026,10.00,20.00,New Accessory,Premium description,Active\n"
        )
        file_obj = io.BytesIO(csv_data_new.encode("utf-8"))
        file_obj.name = "catalog_update.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "update_only"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert resp.data["rows_failed"] == 1
        assert "was not found for this vendor" in resp.data["errors"][0]["validation_error"]

    def test_bulk_upload_compatibility_fields(self, buyer_client, buyer_user):
        """Test bulk upload endpoint parsing separate compatibility columns and validation."""
        import io
        from apps.catalog.models import DynamicDropdownConfig, Product

        # Setup drop down configs
        DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="TestBrand", display_name="TestBrand")
        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category",
            value="Memory",
            defaults={
                "display_name": "Memory",
                "status": "active",
                "compatibility_mode": "feature_based",
                "eligible_device_types": ["smartphone"],
                "match_logic": "AND",
                "accessory_fields": ["storage_expansion_compatibility", "memory_capacity"],
                "compatibility_rules": {
                    "storage_expansion_compatibility": {"mode": "required"},
                    "memory_capacity": {
                        "mode": "conditional",
                        "condition_field": "storage_expansion_compatibility",
                        "condition_values": ["microSDXC", "microSDHC"]
                    }
                }
            }
        )

        # 1. Upload valid Memory product with separate columns
        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Storage Expansion Compatibility,Memory Capacity\n"
            "MEM-SKU-100,TestBrand,Memory,123456789012,06/18/2026,10.00,20.00,Test Memory,Premium memory,Active,microSDXC,2TB\n"
        )
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 200
        assert resp.data["rows_failed"] == 0
        assert resp.data["rows_staged"] + resp.data["rows_passed"] == 1
        
        # Verify created product compatibility fields
        prod = Product.objects.get(sku="MEM-SKU-100")
        assert prod.storage_expansion_compatibility == "microSDXC"
        assert prod.memory_capacity == "2TB"

        # 2. Upload invalid Memory product (microSDXC + 1.5TB is invalid)
        csv_data_invalid = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Storage Expansion Compatibility,Memory Capacity\n"
            "MEM-SKU-200,TestBrand,Memory,123456789013,06/18/2026,10.00,20.00,Test Memory 2,Premium memory,Active,microSDXC,1.5TB\n"
        )
        file_obj = io.BytesIO(csv_data_invalid.encode("utf-8"))
        file_obj.name = "catalog_import_fail.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert resp.data["rows_failed"] == 1
        assert "must match allowed list" in resp.data["errors"][0]["validation_error"]


class TestGovernanceAndCompatibilityImport:
    @pytest.mark.django_db
    def test_bulk_upload_rollback_on_error(self, buyer_client):
        """Verify that any row error rolls back the entire bulk upload transaction."""
        import io
        from apps.catalog.models import Product, DynamicDropdownConfig
        
        # Verify initial count
        initial_count = Product.objects.count()
        
        # Row 1 is valid, Row 2 has an invalid price (0)
        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status\n"
            "ROLLBACK-1,TestBrand,Memory,123456789012,06/18/2026,10.00,20.00,Rollback 1,Premium memory,Active\n"
            "ROLLBACK-2,TestBrand,Memory,123456789013,06/18/2026,0.00,20.00,Rollback 2,Premium memory,Active\n"
        )
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert resp.data["rows_failed"] == 1
        # Transaction must have rolled back completely, so ROLLBACK-1 is NOT in the database
        assert not Product.objects.filter(sku="ROLLBACK-1").exists()
        assert Product.objects.count() == initial_count

    @pytest.mark.django_db
    def test_bulk_upload_active_product_compatibility_update_type_restrictions(self, buyer_client, buyer_user):
        """Verify non-admin cannot use replace/remove compatibility mode on active products."""
        import io
        from apps.catalog.models import Product, ProductStatus
        import datetime
        
        # Create an active product
        product = Product.objects.create(
            sku="ACTIVE-SKU-1",
            brand="TestBrand",
            product_category="Memory",
            upc="123456789014",
            launch_date=datetime.date.today() - datetime.timedelta(days=1),
            vendor_wholesale_price_amount=10.00,
            msrp=20.00,
            name="Active Memory",
            status=ProductStatus.ACTIVE,
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=buyer_user.entity.company_id,
        )
        
        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Device Compatibility,Storage Expansion Compatibility,Memory Capacity\n"
            "ACTIVE-SKU-1,TestBrand,Memory,123456789014,06/18/2026,10.00,20.00,Active Memory,Premium memory,Active,iPhone 16,microSDXC,128GB\n"
        )
        
        # 1. Try with compatibility_update_type=replace as vendor (non-admin)
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "update_only", "compatibility_update_type": "replace"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert "Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval." in resp.data["errors"][0]["validation_error"]

        # 2. Try with compatibility_update_type=remove as vendor (non-admin)
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "update_only", "compatibility_update_type": "remove"},
            format="multipart"
        )
        assert resp.status_code == 207
        assert "Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval." in resp.data["errors"][0]["validation_error"]

    @pytest.mark.django_db
    def test_bulk_upload_media_asset_conversion(self, buyer_client):
        """Verify image URLs are converted to MediaAsset records during bulk upload."""
        import io
        from apps.catalog.models import Product
        from apps.media.models import MediaAsset
        
        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,ImageUrl1,ImageUrl2,Storage Expansion Compatibility,Memory Capacity\n"
            "MEDIA-SKU,TestBrand,Memory,123456789015,06/18/2026,10.00,20.00,Media Memory,Premium memory,Active,https://some-vendor.com/images/accessory1.jpg,https://some-vendor.com/images/accessory2.png,microSDXC,128GB\n"
        )
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 200
        
        # Verify product and media assets
        prod = Product.objects.get(sku="MEDIA-SKU")
        assert prod.primary_image_reference is not None
        
        # Verify MediaAsset records
        assets = MediaAsset.objects.filter(owner_record_id=prod.id)
        assert assets.count() == 2
        
        # Verify first asset details
        first_asset = assets.get(id=prod.primary_image_reference)
        assert first_asset.original_filename == "accessory1.jpg"
        assert first_asset.file_extension == "jpg"
        assert first_asset.mime_type == "image/jpeg"
        assert first_asset.storage_key.endswith("/accessory1.jpg")

    @pytest.mark.django_db
    def test_product_upc_validation(self, buyer_client, buyer_user):
        """Verify UPC format, uniqueness, and non-emptiness constraints."""
        # 1. Invalid UPC format (non-numeric or not 12 chars)
        resp = buyer_client.post("/api/v1/catalog/products/", {
            "name": "Invalid UPC Product",
            "sku": "SKU-UPC-1",
            "brand": "Brand",
            "product_type": "accessory",
            "launch_date": "2026-06-18",
            "upc": "abc123456789",  # non-numeric
            "vendor_company_reference": str(uuid.uuid4()),
        })
        assert resp.status_code == 400
        assert "UPC must follow valid UPC-A format" in str(resp.data)

        resp = buyer_client.post("/api/v1/catalog/products/", {
            "name": "Invalid UPC Product 2",
            "sku": "SKU-UPC-2",
            "brand": "Brand",
            "product_type": "accessory",
            "launch_date": "2026-06-18",
            "upc": "12345",  # too short
            "vendor_company_reference": str(uuid.uuid4()),
        })
        assert resp.status_code == 400
        assert "UPC must follow valid UPC-A format" in str(resp.data)

        # 2. Valid UPC creation
        resp = buyer_client.post("/api/v1/catalog/products/", {
            "name": "Valid Product 1",
            "sku": "SKU-VALID-1",
            "brand": "Brand",
            "product_type": "accessory",
            "launch_date": "2026-06-18",
            "upc": "012345678905",  # valid
            "vendor_company_reference": str(uuid.uuid4()),
        })
        assert resp.status_code == 201

        # 3. Duplicate UPC validation
        resp = buyer_client.post("/api/v1/catalog/products/", {
            "name": "Valid Product 2",
            "sku": "SKU-VALID-2",
            "brand": "Brand",
            "product_type": "accessory",
            "launch_date": "2026-06-18",
            "upc": "012345678905",  # duplicate UPC
            "vendor_company_reference": str(uuid.uuid4()),
        })
        assert resp.status_code == 400
        assert "UPC must be unique per product" in str(resp.data)

    @pytest.mark.django_db
    def test_vendor_admin_delete_product_restrictions(self, buyer_client, buyer_user):
        """Verify vendor admins cannot delete Active products tied to commercial activity."""
        # Setup vendor company for user
        from apps.tenant.models import CompanyType
        buyer_user.company.company_type = CompanyType.VENDOR
        buyer_user.company.save()

        # Create active product
        prod = Product.objects.create(
            name="Restricted Delete Product",
            sku="DEL-SKU-1",
            brand="Brand",
            product_type="accessory",
            status="active",
            selling_status="for_sale",
            launch_date="2026-06-18",
            upc="098765432101",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=buyer_user.company.id,
        )

        # Mock tied to activity by creating PurchaseOrder and PurchaseOrderLine
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
        po = PurchaseOrder.objects.create(
            company_scope_reference=prod.company_scope_reference,
            buyer_reference=uuid.uuid4(),
            vendor_company_reference=prod.vendor_company_reference,
            status="draft"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=prod.id,
            quantity=1,
            unit_price_snapshot=10.00,
            line_total=10.00
        )
        assert prod.is_tied_to_activity is True

        # Try to delete as vendor admin
        resp = buyer_client.delete(f"/api/v1/catalog/products/{prod.id}/")
        assert resp.status_code == 400
        assert "Active products that are live and being sold by buyers cannot be deleted." in resp.data["detail"]

        # Ensure product still exists
        assert Product.objects.filter(id=prod.id).exists()

    @pytest.mark.django_db
    def test_sale_price_buyer_wholesale_validation(self, buyer_client, buyer_user):
        """Verify sale price cannot be lower than calculated buyer wholesale price."""
        from django.core.exceptions import ValidationError
        
        # MSRP = 100.00, Vendor Wholesale = 50.00
        # Buyer Wholesale = 50.00 + 100.00 * 0.14 = 64.00
        prod = Product(
            name="Sale Price Test Product",
            sku="SALE-SKU-1",
            brand="Brand",
            product_type="accessory",
            status="draft",
            upc="012345678912",
            launch_date="2026-06-18",
            vendor_wholesale_price_amount=50.00,
            msrp=100.00,
            sale_price=60.00,  # lower than 64.00
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=buyer_user.company.id,
        )
        with pytest.raises(ValidationError) as excinfo:
            prod.clean()
        assert "Sale Price must not be lower than buyer Wholesale Price" in str(excinfo.value)

        # Correcting sale_price to 65.00 (>= 64.00) should pass clean()
        prod.sale_price = 65.00
        prod.clean()  # should not raise ValidationError

    @pytest.mark.django_db
    def test_extended_vendor_search(self, buyer_client, buyer_user):
        """Verify searching by category, wholesale price, color, status, MSRP, and SKU is supported."""
        from apps.tenant.models import CompanyType
        buyer_user.company.company_type = CompanyType.VENDOR
        buyer_user.company.save()

        # Create products with specific searchable fields
        Product.objects.create(
            name="Alpha Product",
            sku="SEARCH-SKU-123",
            brand="Brand A",
            product_type="accessory",
            product_category="Cases",
            color="Vibrant Red",
            status="draft",
            launch_date="2026-06-18",
            msrp=19.99,
            vendor_wholesale_price_amount=10.00,
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=buyer_user.company.id,
        )
        Product.objects.create(
            name="Beta Product",
            sku="SEARCH-SKU-456",
            brand="Brand B",
            product_type="accessory",
            product_category="Screen Protection",
            color="Glossy White",
            status="active",
            launch_date="2026-06-18",
            msrp=29.99,
            vendor_wholesale_price_amount=15.00,
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=buyer_user.company.id,
        )

        # 1. Search by category
        resp = buyer_client.get("/api/v1/catalog/products/?search=Cases")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["sku"] == "SEARCH-SKU-123"

        # 2. Search by color
        resp = buyer_client.get("/api/v1/catalog/products/?search=white")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["sku"] == "SEARCH-SKU-456"

        # 3. Search by status
        resp = buyer_client.get("/api/v1/catalog/products/?search=draft")
        assert resp.status_code == 200
        assert any(p["sku"] == "SEARCH-SKU-123" for p in resp.data["results"])

        # 4. Search by MSRP
        resp = buyer_client.get("/api/v1/catalog/products/?search=29.99")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["sku"] == "SEARCH-SKU-456"

        # 5. Search by Wholesale Price
        resp = buyer_client.get("/api/v1/catalog/products/?search=10")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["sku"] == "SEARCH-SKU-123"

    @pytest.mark.django_db
    def test_bulk_upload_comma_separated_device_compatibility(self, buyer_client, buyer_user):
        """Verify that comma-separated compatibility fields split and associate correct devices."""
        import io
        from apps.devices.models import Device, Manufacturer, DeviceType
        from apps.catalog.models import Product, ProductCompatibilityAssertion, DynamicDropdownConfig
        
        # Setup dropdown config for Cases category
        DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="TestBrand", display_name="TestBrand")
        DynamicDropdownConfig.objects.get_or_create(field_name="product_category", value="Cases", display_name="Cases")

        # Setup manufacturer and devices
        mfg, _ = Manufacturer.objects.get_or_create(name="Apple")
        dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone")
        dev1, _ = Device.objects.get_or_create(name="Apple iPhone 17", manufacturer=mfg, device_type=dt, lifecycle_status="available")
        dev2, _ = Device.objects.get_or_create(name="Apple iPhone 16 Pro", manufacturer=mfg, device_type=dt, lifecycle_status="available")

        csv_data = (
            "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Device Compatibility\n"
            'CASE-SKU-777,TestBrand,Cases,123456789099,06/18/2026,12.00,24.00,Test Cases,Premium case,Active,"iPhone 17, iPhone 16 Pro"\n'
        )
        file_obj = io.BytesIO(csv_data.encode("utf-8"))
        file_obj.name = "catalog_import.csv"
        
        resp = buyer_client.post(
            "/api/v1/catalog/products/bulk_upload/",
            {"file": file_obj, "update_mode": "create_only"},
            format="multipart"
        )
        assert resp.status_code == 200
        assert resp.data["rows_failed"] == 0
        
        # Verify both compatibility assertions were created
        prod = Product.objects.get(sku="CASE-SKU-777")
        assertions = ProductCompatibilityAssertion.objects.filter(product=prod)
        assert assertions.count() == 2
        
        device_names = {Device.objects.get(id=a.device_reference).name for a in assertions}
        assert device_names == {"Apple iPhone 17", "Apple iPhone 16 Pro"}

    @pytest.mark.django_db
    def test_manual_media_asset_linking(self, buyer_client, buyer_user):
        """Verify that when a product is created or updated manually, referenced MediaAssets get linked."""
        from apps.media.models import MediaAsset
        from apps.catalog.models import Product, DynamicDropdownConfig
        import uuid

        # Create DynamicDropdownConfig to pass validation
        DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="TestBrand", display_name="TestBrand")
        DynamicDropdownConfig.objects.get_or_create(field_name="product_category", value="Cases", display_name="Cases")

        # Create some media assets with owner_record_id = None
        asset_primary = MediaAsset.objects.create(
            id=uuid.uuid4(),
            asset_type="product_image",
            status="ready",
            owner_module="catalog",
            owner_record_id=None,
            company_scope_reference=uuid.uuid4(),
            original_filename="primary.png",
            file_extension="png",
            mime_type="image/png"
        )
        asset_ref1_id = uuid.uuid4()
        asset_ref1 = MediaAsset.objects.create(
            id=asset_ref1_id,
            asset_type="product_image",
            status="ready",
            owner_module="catalog",
            owner_record_id=None,
            company_scope_reference=uuid.uuid4(),
            original_filename="ref1.png",
            file_extension="png",
            mime_type="image/png",
            storage_key=f"test-company/product_image/{asset_ref1_id}/ref1.png"
        )

        payload = {
            "name": "Test Product Link",
            "sku": "LINK-SKU-123",
            "brand": "TestBrand",
            "product_type": "accessory",
            "product_category": "Cases",
            "vendor_wholesale_price_amount": 10.00,
            "vendor_wholesale_price_currency": "USD",
            "status": "active",
            "upc": "123456789012",
            "vendor_company_reference": str(uuid.uuid4()),
            "launch_date": "2026-06-18",
            "primary_image_reference": str(asset_primary.id),
            "media_references": [
                f"http://localhost:8000/media/{asset_ref1.storage_key}"
            ]
        }

        resp = buyer_client.post(
            "/api/v1/catalog/products/",
            payload,
            format="json"
        )
        assert resp.status_code == 201, f"Create failed: {resp.content.decode()}"
        
        prod_id = resp.data["id"]
        
        # Check that owner_record_id of both media assets was updated
        asset_primary.refresh_from_db()
        asset_ref1.refresh_from_db()
        
        assert str(asset_primary.owner_record_id) == str(prod_id)
        assert str(asset_ref1.owner_record_id) == str(prod_id)






