import pytest
import uuid
from django.utils import timezone
from apps.catalog.models import Product, BuyerProductExportJob, BuyerProductExportSelectionSnapshot, BuyerProductExportDate
from apps.catalog.tasks import process_buyer_export_job
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, EntityStatus
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.catalog.models import ProductCompatibilityAssertion

@pytest.fixture
def device_setup(buyer_user):
    dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone", defaults={"status": "active"})
    if dt.status != "active":
        dt.status = "active"
        dt.save()
    mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
    device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)
    add_device_to_portfolio(buyer_user, device.id)
    return device

@pytest.fixture
def product_factory(db, device_setup):
    def _create(sku, name, company_id):
        p = Product.objects.create(
            name=name,
            sku=sku,
            brand="TestBrand",
            product_type="accessory",
            status="active",
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=company_id,
            vendor_company_reference=uuid.uuid4(),
        )
        ProductCompatibilityAssertion.objects.create(
            product=p,
            device_reference=device_setup.id,
            is_compatible=True,
            is_excluded=False
        )
        return p
    return _create

@pytest.fixture
def second_buyer(db, cap_factory):
    comp = Company.objects.create(
        name="Buyer Corp 2",
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
        slug="buyer-corp-2",
    )
    ent = CompanyEntity.objects.create(
        company=comp,
        name="Buyer Entity HQ 2",
        status=EntityStatus.ACTIVE,
    )
    user = User.objects.create_user(
        email="buyer2@buyer.test",
        entity=ent,
        password="buyerpass123",
    )
    caps = ["catalog.product.list", "catalog.product.read", "devices.portfolio.self_modify"]
    for code in caps:
        cap = cap_factory(code)
        user.capabilities.add(cap)
        if user.company:
            user.company.capabilities.add(cap)
    return user

@pytest.mark.django_db
class TestBuyerExportHistory:
    def test_successful_export_job_updates_date(self, buyer_user, product_factory):
        company_id = buyer_user.entity.company_id
        p1 = product_factory("EXP-SKU-1", "Product 1", company_id)
        p2 = product_factory("EXP-SKU-2", "Product 2", company_id)

        # Create export job
        job = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            format="csv"
        )
        snapshot = BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=[str(p1.id), str(p2.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )

        # Initially, no export date records exist
        assert not BuyerProductExportDate.objects.filter(product=p1).exists()

        # Process the export job
        process_buyer_export_job(job.id)

        # Refresh job and verify status
        job.refresh_from_db()
        assert job.status == "completed"

        # Verify export dates were saved correctly
        exp_date_1 = BuyerProductExportDate.objects.get(product=p1, company_scope_reference=company_id)
        exp_date_2 = BuyerProductExportDate.objects.get(product=p2, company_scope_reference=company_id)
        assert exp_date_1.exported_at == job.completed_at
        assert exp_date_2.exported_at == job.completed_at

    def test_failed_or_canceled_job_does_not_update_date(self, buyer_user, product_factory):
        company_id = buyer_user.entity.company_id
        p = product_factory("EXP-SKU-3", "Product 3", company_id)

        job = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            status="failed",
            format="csv"
        )
        assert not BuyerProductExportDate.objects.filter(product=p).exists()

    def test_buyer_isolation(self, buyer_user, second_buyer, product_factory):
        p = product_factory("EXP-SKU-COMMON", "Common Product", buyer_user.entity.company_id)

        # Buyer 1 exports the product
        job1 = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_user.entity.company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            format="csv"
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job1,
            product_ids=[str(p.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )
        process_buyer_export_job(job1.id)
        job1.refresh_from_db()

        # Buyer 1 has an export date
        assert BuyerProductExportDate.objects.filter(product=p, company_scope_reference=buyer_user.entity.company_id).exists()
        # Buyer 2 does NOT have an export date
        assert not BuyerProductExportDate.objects.filter(product=p, company_scope_reference=second_buyer.entity.company_id).exists()

    def test_api_returns_exported_date_and_orders_correctly(self, buyer_client, buyer_user, product_factory):
        company_id = buyer_user.entity.company_id
        p1 = product_factory("EXP-SKU-SORT-1", "A Product", company_id)
        p2 = product_factory("EXP-SKU-SORT-2", "B Product", company_id)

        # Export p1 first
        job1 = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            format="csv"
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job1,
            product_ids=[str(p1.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )
        process_buyer_export_job(job1.id)

        # Export p2 second (with a later timestamp)
        job2 = BuyerProductExportJob.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=buyer_user.entity_id,
            requested_by=buyer_user.id,
            format="csv"
        )
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job2,
            product_ids=[str(p2.id)],
            portfolio_snapshot_reference=uuid.uuid4()
        )
        process_buyer_export_job(job2.id)

        # Fetch product list
        resp = buyer_client.get("/api/v1/catalog/products/")
        assert resp.status_code == 200
        results = resp.data["results"]

        # Ensure both products have non-null exported_date in the response
        prod_map = {res["sku"]: res for res in results}
        assert "exported_date" in prod_map["EXP-SKU-SORT-1"]
        assert prod_map["EXP-SKU-SORT-1"]["exported_date"] is not None
        assert "exported_date" in prod_map["EXP-SKU-SORT-2"]
        assert prod_map["EXP-SKU-SORT-2"]["exported_date"] is not None

        # Verify ordering works by ordering by exported_date ascending
        resp_asc = buyer_client.get("/api/v1/catalog/products/?ordering=exported_date")
        assert resp_asc.status_code == 200
        results_asc = resp_asc.data["results"]
        indices_asc = [r["sku"] for r in results_asc if r["sku"] in ["EXP-SKU-SORT-1", "EXP-SKU-SORT-2"]]
        assert indices_asc == ["EXP-SKU-SORT-1", "EXP-SKU-SORT-2"]

        # Verify ordering works by ordering by exported_date descending
        resp_desc = buyer_client.get("/api/v1/catalog/products/?ordering=-exported_date")
        assert resp_desc.status_code == 200
        results_desc = resp_desc.data["results"]
        indices_desc = [r["sku"] for r in results_desc if r["sku"] in ["EXP-SKU-SORT-1", "EXP-SKU-SORT-2"]]
        assert indices_desc == ["EXP-SKU-SORT-2", "EXP-SKU-SORT-1"]
