import uuid
from datetime import timedelta
from decimal import Decimal
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.catalog.models import Product, BuyerExportMapping, BuyerProductExportJob
from apps.catalog.offer_services import freeze_export_selection, resolve_exported_line, MappingResolutionError
from apps.integration.models import BuyerStorefront
from apps.tenant.models import Company, CompanyEntity

pytestmark = pytest.mark.django_db


@pytest.fixture
def storefront(buyer_company, buyer_entity):
    return BuyerStorefront.objects.create(company=buyer_company, entity=buyer_entity, code='main-shop', label='Main shop')


@pytest.fixture
def offer(vendor_company):
    return Product.objects.create(name='Exported accessory', sku='SAME-SKU', brand='Supplier Brand', product_type='accessory',
        status='draft', selling_status='not_for_sale', launch_date='2026-01-01',
        vendor_company_reference=vendor_company.pk, company_scope_reference=vendor_company.pk,
        vendor_wholesale_price_amount=Decimal('10'), vendor_wholesale_price_currency='USD', msrp=Decimal('50'))


def selection(offer, storefront, **kwargs):
    return freeze_export_selection(product=offer, company=storefront.company, entity=storefront.entity, storefront=storefront, **kwargs)


def test_exported_mapping_freezes_supplier_and_pricing_and_is_immutable(offer, storefront):
    mapping = selection(offer, storefront)
    assert mapping.status == 'active' and mapping.supplier_reference == offer.vendor_company_reference
    assert mapping.pricing_snapshot_reference
    mapping.supplier_reference = uuid.uuid4()
    with pytest.raises(ValidationError):
        mapping.save()
    mapping.refresh_from_db(); mapping.listing_reference = 'another-listing'
    with pytest.raises(ValidationError):
        mapping.save()


def test_storefront_cannot_cross_entities_or_transfer_ownership(storefront, buyer_company):
    other = Company.objects.create(name='Other Buyer', slug='other-buyer', company_type='buyer', status='active')
    entity = CompanyEntity.objects.create(company=other, name='Foreign store', status='active')
    with pytest.raises(ValidationError):
        BuyerStorefront.objects.create(company=buyer_company, entity=entity, code='bad', label='Bad')
    storefront.entity = entity
    with pytest.raises(ValidationError):
        storefront.save()


def test_same_sku_supplier_resolves_only_explicit_exported_offer(offer, storefront):
    other = Company.objects.create(name='Second Vendor', slug='second-vendor', company_type='vendor', status='active')
    second = Product.objects.create(name='Second vendor offer', sku=offer.sku, brand=offer.brand, status='draft',
        product_type='accessory', launch_date='2026-01-01', vendor_company_reference=other.pk, company_scope_reference=other.pk,
        vendor_wholesale_price_amount=Decimal('11'), msrp=Decimal('50'))
    first_map, second_map = selection(offer, storefront), selection(second, storefront)
    resolved = resolve_exported_line(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront,
        line={'export_mapping_id':str(second_map.pk), 'line_reference':'2'})
    assert resolved.product_id == second.pk and resolved.supplier_reference == other.pk
    with pytest.raises(MappingResolutionError) as error:
        resolve_exported_line(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront, line={'sku':offer.sku})
    assert error.value.code == 'EXPORT_MAPPING_AMBIGUOUS'
    with pytest.raises(MappingResolutionError) as error:
        resolve_exported_line(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront,
            line={'export_mapping_id':str(first_map.pk), 'vendor_id':str(other.pk)})
    assert error.value.code == 'ORDER_LINE_MAPPING_MISMATCH'


def test_foreign_scope_and_unexported_product_cannot_be_resolved(offer, storefront):
    mapping = selection(offer, storefront)
    for company, entity, store in [(uuid.uuid4(), storefront.entity_id, storefront), (storefront.company_id, uuid.uuid4(), storefront),
                                  (storefront.company_id, storefront.entity_id, None)]:
        with pytest.raises(MappingResolutionError) as error:
            resolve_exported_line(company_id=company, entity_id=entity, storefront=store, line={'export_mapping_id':str(mapping.pk)})
        assert error.value.code == 'EXPORT_MAPPING_UNAUTHORIZED'
    with pytest.raises(MappingResolutionError) as error:
        resolve_exported_line(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront, line={'sku':'NOT-EXPORTED'})
    assert error.value.code == 'EXPORT_MAPPING_REQUIRED'


def test_previous_version_requires_purchase_time_from_its_valid_window(offer, storefront):
    previous = selection(offer, storefront)
    new = selection(offer, storefront)
    previous.refresh_from_db()
    assert previous.status == 'superseded' and new.version == 2
    scope = dict(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront,
        line={'export_mapping_id':str(previous.pk)})
    with pytest.raises(MappingResolutionError):
        resolve_exported_line(**scope)
    purchase = previous.exported_at + (previous.superseded_at - previous.exported_at) / 2
    assert resolve_exported_line(**scope, purchased_at=purchase).pk == previous.pk
    with pytest.raises(MappingResolutionError):
        resolve_exported_line(**scope, purchased_at=timezone.now() + timedelta(days=1))


def test_reprocessing_same_export_job_does_not_create_mapping_versions(offer, storefront, buyer_user):
    job = BuyerProductExportJob.objects.create(company_scope_reference=storefront.company_id, buyer_entity_reference=storefront.entity_id,
        buyer_reference=buyer_user.pk, requested_by=buyer_user.pk, storefront=storefront)
    first, second = selection(offer, storefront, job=job), selection(offer, storefront, job=job)
    assert first.pk == second.pk and BuyerExportMapping.objects.count() == 1


def test_missing_verified_price_stays_review_required_instead_of_zero_price(offer, storefront):
    Product.objects.filter(pk=offer.pk).update(msrp=None)
    mapping = selection(offer, storefront)
    assert mapping.status == 'review_required' and not mapping.pricing_snapshot_reference
    with pytest.raises(MappingResolutionError) as error:
        resolve_exported_line(company_id=storefront.company_id, entity_id=storefront.entity_id, storefront=storefront,
            line={'export_mapping_id':str(mapping.pk)})
    assert error.value.code == 'EXPORT_MAPPING_REVIEW_REQUIRED'


def test_listing_supplier_change_is_explicit_versioned_and_keeps_old_purchase_identity(offer, storefront):
    first = selection(offer,storefront,external_listing_id='listing-1',external_variant_id='variant-1')
    other = Company.objects.create(name='Replacement supplier',slug='replacement-supplier',company_type='vendor',status='active')
    replacement = Product.objects.create(name='Same branded item',sku=offer.sku,brand=offer.brand,product_type='accessory',status='draft',
        launch_date='2026-01-01',vendor_company_reference=other.pk,company_scope_reference=other.pk,vendor_wholesale_price_amount=12,msrp=50)
    with pytest.raises(ValidationError):
        selection(replacement,storefront,external_listing_id='listing-1',external_variant_id='variant-1')
    current = selection(replacement,storefront,external_listing_id='listing-1',external_variant_id='variant-1',replaces_mapping_id=first.pk)
    first.refresh_from_db()
    assert first.status=='superseded' and first.supplier_reference==offer.vendor_company_reference
    assert current.version==2 and current.listing_reference==first.listing_reference and current.supplier_reference==other.pk
    purchase=first.exported_at+(first.superseded_at-first.exported_at)/2
    previous = resolve_exported_line(company_id=storefront.company_id,entity_id=storefront.entity_id,storefront=storefront,
        line={'external_variant_id':'variant-1'},purchased_at=purchase)
    assert previous.pk==first.pk


def test_buyer_storefront_api_enforces_scope_and_existing_capability(offer, storefront, buyer_client, buyer_user, cap_factory):
    cap = cap_factory('integration.connection.manage')
    buyer_user.capabilities.add(cap); buyer_user.company.capabilities.add(cap)
    response = buyer_client.post('/api/v1/integration/buyer-storefronts/', {
        'company':str(storefront.company_id), 'entity':str(storefront.entity_id), 'code':'second', 'label':'Second storefront'}, format='json')
    assert response.status_code == 201, response.data
    foreign = Company.objects.create(name='Foreign', slug='foreign', company_type='buyer', status='active')
    response = buyer_client.post('/api/v1/integration/buyer-storefronts/', {
        'company':str(foreign.pk), 'entity':str(storefront.entity_id), 'code':'foreign', 'label':'Foreign'}, format='json')
    assert response.status_code == 403
