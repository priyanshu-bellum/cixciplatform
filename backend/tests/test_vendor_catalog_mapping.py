"""Provider-neutral source mapping, explicit scope and buyer facet regressions."""
from copy import deepcopy
import io
import uuid
from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.catalog.api import ProductFilterSet
from apps.catalog.compatibility_import import parse_compatibility_row
from apps.catalog.models import Brand, DynamicDropdownConfig, Product, VendorBrandRelationship
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.integration.catalog_compatibility import CatalogDeviceResolver
from apps.integration.catalog_config import BALAJI_CONFIG, GENERIC_CONFIG, validate_config
from apps.integration.catalog_import import ingest_rows, resolved_category
from apps.integration.models import VendorCatalogConnection, VendorCatalogItem, VendorCatalogSyncRun

pytestmark = pytest.mark.django_db


@pytest.fixture
def mapping_setup(vendor_company, admin_user):
    phone = DeviceType.objects.create(name='Phone', code='phone', status='active')
    tablet = DeviceType.objects.create(name='Tablet', code='tablet', status='active')
    maker = Manufacturer.objects.create(name='Canonical Maker')
    devices = [Device.objects.create(name=f'Model {n}', manufacturer=maker, device_type=phone,
        lifecycle_status='available', launch_date=timezone.localdate()) for n in ('One', 'Two')]
    category, _ = DynamicDropdownConfig.objects.update_or_create(field_name='product_category', value='Cases',
        defaults={'status':'active', 'compatibility_mode':'device_specific', 'eligible_device_types':[str(phone.pk)],
            'compatibility_rules':{}, 'accessory_fields':[]})
    brand = Brand.objects.create(name='Source Brand')
    VendorBrandRelationship.objects.create(vendor_company=vendor_company, brand=brand,
        relationship_type='owned', approved_by=admin_user)
    connection = VendorCatalogConnection.objects.create(vendor_company=vendor_company,
        label='Mapping regression', endpoint_url='https://supplier.example/catalog', auth_type='none',
        config=deepcopy(BALAJI_CONFIG), created_by=admin_user, updated_by=admin_user)
    return connection, category, devices, phone, tablet


def source_row(sku='DECLARED', **changes):
    return {'sku':sku, 'name':'Source Brand protective accessory for Model One', 'brand':'Source Brand',
        'category':'Phone Cases', 'upc':'123456789012', 'launch_date':'2026-01-01',
        'msrp_cents':3000, 'unit_price_cents':500, 'currency':'USD', 'quantity_available':10,
        'compatible_devices':[{'id':42, 'name':'Model One', 'slug':'model-one'}], **changes}


def ingest(connection, rows):
    run = VendorCatalogSyncRun.objects.create(connection=connection, requested_by=connection.created_by,
        config_version=connection.config_version, trigger='review', status='completed')
    with transaction.atomic():
        return ingest_rows(connection, run, rows, connection.created_by)


def test_bare_universal_does_not_expand_every_type(mapping_setup):
    _, category, _, _, _ = mapping_setup
    with pytest.raises(ValidationError, match='explicit approved Device Types'):
        parse_compatibility_row({'devicecompatibility':'Universal'}, category)


def test_structured_references_resolve_to_canonical_ids_without_provider_id_guess(mapping_setup):
    connection, category, devices, _, _ = mapping_setup
    declaration = CatalogDeviceResolver(connection.config).declaration(
        [{'id':42,'name':'model one','slug':'model-one'}], category=category.value)
    values, types, ids = parse_compatibility_row({'devicecompatibility':declaration}, category)
    assert ids == [str(devices[0].pk)] and types == []


def test_provider_paths_and_aliases_are_connection_configuration(mapping_setup):
    connection, _, devices, _, _ = mapping_setup
    config = {'compatibility':{'name_path':'model.label','id_path':'remote.key',
        'slug_path':'remote.slug','device_map':{'id:123':str(devices[1].pk)}}}
    raw = [{'model':{'label':'Provider alias'},'remote':{'key':123}}]
    assert CatalogDeviceResolver(config).declaration(raw, category='Cases') == str(devices[1].pk)
    assert CatalogDeviceResolver({}).declaration([{'id':123,'name':'Provider alias'}], category='Cases') == 'Provider alias'


def test_ambiguous_name_requires_explicit_mapping(mapping_setup):
    connection, _, devices, phone, _ = mapping_setup
    Device.objects.create(name=devices[0].name, manufacturer=Manufacturer.objects.create(name='Other Maker'), device_type=phone)
    with pytest.raises(ValidationError, match='Ambiguous'):
        CatalogDeviceResolver(connection.config).declaration([{'name':'Model One'}], category='Cases')
    assert CatalogDeviceResolver(connection.config).declaration(
        [{'name':'Model One','manufacturer':'Canonical Maker'}], category='Cases') == str(devices[0].pk)


def test_explicit_universal_requires_configured_types(mapping_setup):
    connection, _, _, phone, tablet = mapping_setup
    raw = [{'id':1004,'name':'Universal','slug':'universal'}]
    with pytest.raises(ValidationError, match='explicit approved'):
        CatalogDeviceResolver(connection.config).declaration(raw, category='Cases')
    config = {'compatibility':{'universal_type_map':{'Cases':[str(phone.pk)]}}}
    declaration = CatalogDeviceResolver(config).declaration(raw, category='Cases')
    _, types, devices = parse_compatibility_row({'devicecompatibility':declaration}, mapping_setup[1])
    assert types == [str(phone.pk)] and str(tablet.pk) not in types and not devices


@pytest.mark.parametrize('compatibility', [
    {'name_path':'__import__(os)'}, {'device_map':{'source':'not-a-uuid'}},
    {'universal_type_map':{'Cases':[]}}, {'unknown_setting':True},
])
def test_invalid_reference_configuration_is_rejected(compatibility):
    config = deepcopy(BALAJI_CONFIG); config['compatibility'] = compatibility
    with pytest.raises(ValidationError): validate_config(config)


def test_generic_template_has_no_supplier_category_coupling():
    assert GENERIC_CONFIG['category_map'] == {} and GENERIC_CONFIG['default_category'] == ''
    assert resolved_category('Source Group', None, {'source group':{'Cases'}}, {}, '') == ('Cases', [])


def test_ingestion_keeps_device_specific_scope(mapping_setup):
    connection, _, devices, _, _ = mapping_setup
    ingest(connection, [source_row(brand='SOURCE BRAND')])
    source = VendorCatalogItem.objects.select_related('product').get()
    assert source.product is not None, source.review_errors
    product = source.product
    assert product.brand == 'Source Brand'
    assert product.product_category == 'Cases' and product.compatibility_mode == 'direct_device'
    assert product.compatible_device_types == [] and not product.universal_type_scopes.filter(is_active=True).exists()
    assert product.compatibility_assertions.filter(device_reference=devices[0].pk, is_compatible=True).exists()
    assert not any(e['code'] == 'COMPATIBILITY_REVIEW_REQUIRED' for e in source.review_errors)


def test_unknown_source_cannot_create_universal_scope(mapping_setup):
    connection, _, _, _, _ = mapping_setup
    ingest(connection, [source_row(compatible_devices=[{'id':999,'name':'Not in canonical catalog'}])])
    source = VendorCatalogItem.objects.select_related('product').get()
    assert source.review_required
    assert any(e['code'] == 'COMPATIBILITY_REVIEW_REQUIRED' for e in source.review_errors)
    assert not Product.objects.filter(compatibility_mode='universal_device_type').exists()
    if source.product:
        assert not source.product.universal_type_scopes.filter(is_active=True).exists()


def test_exact_source_retires_inferred_universal_history(mapping_setup):
    connection, _, devices, phone, _ = mapping_setup
    old = Product.objects.create(name='Source Brand protective accessory for Model One', sku='DECLARED',
        vendor_company_reference=connection.vendor_company_id, company_scope_reference=connection.vendor_company_id,
        brand='Source Brand', product_category='Cases', upc='123456789012', launch_date=date(2026,1,1),
        msrp=Decimal('30'), vendor_wholesale_price_amount=Decimal('5'), compatibility_mode='universal_device_type',
        compatible_device_types=[str(phone.pk)])
    assert old.compatibility_assertions.filter(device_reference=devices[1].pk,is_compatible=True).exists()
    ingest(connection,[source_row()])
    old.refresh_from_db()
    assert old.compatibility_mode == 'direct_device'
    assert not old.universal_type_scopes.filter(is_active=True).exists()
    assert old.compatibility_assertions.get(device_reference=devices[0].pk).is_compatible
    historical = old.compatibility_assertions.get(device_reference=devices[1].pk)
    assert not historical.is_compatible and historical.match_evidence['universal']['active'] is False


def test_replay_preview_rolls_back_and_apply_is_audited(mapping_setup):
    from django.core.management import call_command
    from apps.audit.models import AuditRecord
    connection, _, _, _, _ = mapping_setup
    ingest(connection,[source_row()])
    before = (VendorCatalogSyncRun.objects.count(),AuditRecord.objects.count())
    preview=io.StringIO()
    call_command('replay_catalog_sources',connection=str(connection.pk),stdout=preview)
    assert '"applied": false' in preview.getvalue()
    assert (VendorCatalogSyncRun.objects.count(),AuditRecord.objects.count()) == before
    applied=io.StringIO()
    call_command('replay_catalog_sources',connection=str(connection.pk),apply=True,stdout=applied)
    assert '"provider_requests": 0' in applied.getvalue()
    assert VendorCatalogSyncRun.objects.count() == before[0]+1
    assert AuditRecord.objects.filter(event_code='integration.vendor_catalog.saved_sources_replayed').exists()


def test_brand_filter_uses_approved_identity_and_case(mapping_setup):
    connection, _, _, _, _ = mapping_setup
    ingest(connection, [source_row()])
    query = ProductFilterSet({'brand':'SOURCE BRAND'}, queryset=Product.objects.all())
    assert query.is_valid() and query.qs.count() == 1


def test_buyer_brand_options_follow_same_visibility_and_device_scope(mapping_setup, buyer_user, buyer_client, settings):
    settings.REGIONAL_VISIBILITY_ENFORCE = False
    settings.MEDIA_READINESS_ENFORCE_BUYER = False
    connection, _, devices, _, _ = mapping_setup
    add_device_to_portfolio(buyer_user, devices[0].pk)
    ingest(connection, [source_row('VISIBLE'), source_row('HIDDEN', compatible_devices=[{'name':'Model Two'}])])
    visible = VendorCatalogItem.objects.get(external_id='VISIBLE')
    hidden = VendorCatalogItem.objects.get(external_id='HIDDEN')
    Product.objects.filter(pk__in=[visible.product_id,hidden.product_id]).update(status='active', compatibility_status='complete')
    VendorCatalogItem.objects.filter(pk__in=[visible.pk,hidden.pk]).update(review_required=False)
    Product.objects.filter(pk=hidden.product_id).update(brand='Unrelated brand')
    response = buyer_client.get('/api/v1/catalog/products/filter-options/')
    assert response.status_code == 200, response.data
    assert response.data['brands'] == ['Source Brand']
    assert buyer_client.get('/api/v1/catalog/products/', {'brand':'SOURCE BRAND'}).data['count'] == 1
    VendorCatalogItem.objects.filter(pk=visible.pk).update(review_required=True)
    assert buyer_client.get('/api/v1/catalog/products/filter-options/').data['brands'] == []
    assert buyer_client.get('/api/v1/catalog/products/', {'brand':'Source Brand'}).data['count'] == 0
