"""Rule-derived matches are not manual selections, and batched writes keep the same results.

Regression for the Vendor Audit report: a Universal product switched to
"Use category compatibility rules" kept every former Universal device, including
models whose own Device Catalog evidence did not satisfy the category rule.
"""
from datetime import date
from decimal import Decimal
import uuid
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext

from apps.audit.models import AuditRecord
from apps.catalog.compatibility_engine import run_devices_remapping
from apps.catalog.compatibility_import import parse_compatibility_row
from apps.catalog.models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from apps.devices.models import Device, DeviceType, Manufacturer

pytestmark = pytest.mark.django_db

BASE = '/api/v1/catalog/products/'
CATEGORY = 'Selection Test Chargers'


@pytest.fixture
def phone():
    kind, _ = DeviceType.objects.update_or_create(code='phone', defaults={'name': 'Phone', 'status': 'active', 'is_active': True})
    return kind


@pytest.fixture
def maker():
    return Manufacturer.objects.create(name='Selection Maker')


def device(maker, kind, name, **fields):
    return Device.objects.create(name=name, manufacturer=maker, device_type=kind, lifecycle_status='available',
        launch_date=date(2026, 1, 1), **fields)


def category(kind, mode='hybrid'):
    return DynamicDropdownConfig.objects.create(field_name='product_category', value=CATEGORY, status='active',
        compatibility_mode=mode, match_logic='OR', eligible_device_types=[str(kind.pk)],
        accessory_fields=['compatible_charging_interface', 'wireless_charging_compatibility'],
        compatibility_rules={'compatible_charging_interface': {'mode': 'optional', 'comparison': 'equals'},
            'wireless_charging_compatibility': {'mode': 'optional', 'comparison': 'intersects'}})


def product(vendor_company, sku='SEL-1', **changes):
    values = dict(name='Selection item ' + sku, sku=sku, vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id, product_type='accessory', product_category=CATEGORY,
        launch_date='2026-01-01', status='draft', msrp=Decimal('30'), vendor_wholesale_price_amount=Decimal('5'),
        compatibility_mode='direct_device')
    values.update(changes)
    return Product.objects.create(**values)


def compatible(item):
    return set(item.compatibility_assertions.filter(is_compatible=True, is_excluded=False).values_list('device_reference', flat=True))


def audit_row(client, vendor_company, item):
    response = client.get(BASE + 'vendor-audit/', {'vendor': str(vendor_company.id)})
    assert response.status_code == 200, response.data
    return next(row for row in response.data['results'] if row['id'] == str(item.pk))


def test_audit_reports_rule_derived_matches_as_not_explicit(admin_client, vendor_company, phone, maker):
    category(phone)
    wireless = device(maker, phone, 'Wireless Model', wireless_charging_compatibility='MagSafe')
    plain = device(maker, phone, 'Unconfigured Model')
    item = product(vendor_company, compatibility_mode='universal_device_type', compatible_device_types=[str(phone.pk)])
    assert compatible(item) == {wireless.pk, plain.pk}
    row = audit_row(admin_client, vendor_company, item)
    assert {entry['device_id'] for entry in row['device_assertions']} == {str(wireless.pk), str(plain.pk)}
    assert not any(entry['explicit'] for entry in row['device_assertions'])


def test_audit_reports_a_manual_selection_as_explicit(admin_client, vendor_company, phone, maker):
    category(phone)
    wireless = device(maker, phone, 'Wireless Model', wireless_charging_compatibility='MagSafe')
    plain = device(maker, phone, 'Unconfigured Model')
    item = product(vendor_company, wireless_charging_compatibility='MagSafe')
    assert compatible(item) == {wireless.pk}
    response = admin_client.post(BASE + str(item.pk) + '/map-devices/', {'device_ids': [str(plain.pk)], 'update_type': 'add'}, format='json')
    assert response.status_code == 200, response.data
    flags = {entry['device_id']: entry['explicit'] for entry in audit_row(admin_client, vendor_company, item)['device_assertions']}
    assert flags == {str(wireless.pk): False, str(plain.pk): True}


def test_universal_product_switched_to_category_rules_keeps_only_rule_matches(admin_client, vendor_company, phone, maker):
    """The exact client flow, sending what the corrected editor sends."""
    category(phone)
    wireless = device(maker, phone, 'Wireless Model', wireless_charging_compatibility='MagSafe')
    plain = device(maker, phone, 'Unconfigured Model')
    item = product(vendor_company, compatibility_mode='universal_device_type', compatible_device_types=[str(phone.pk)])
    assert compatible(item) == {wireless.pk, plain.pk}
    row = audit_row(admin_client, vendor_company, item)
    selected = [entry['device_id'] for entry in row['device_assertions'] if entry['explicit']]
    assert selected == []
    response = admin_client.patch(BASE + str(item.pk) + '/', {'product_category': CATEGORY, 'compatibility_mode': 'direct_device',
        'compatible_device_types': [], 'wireless_charging_compatibility': 'MagSafe', 'compatible_charging_interface': 'Not Compatible',
        'device_ids': selected, 'compatibility_update_type': 'replace'}, format='json')
    assert response.status_code == 200, response.data
    assert compatible(item) == {wireless.pk}
    archived = item.compatibility_assertions.get(device_reference=plain.pk)
    assert archived.match_status == 'Archived' and not archived.match_evidence.get('explicit', {}).get('active')
    row = audit_row(admin_client, vendor_company, item)
    assert [entry['device_id'] for entry in row['device_assertions']] == [str(wireless.pk)]


def test_universal_mapping_is_written_in_a_bounded_number_of_statements(vendor_company, phone, maker):
    category(phone)
    devices = [device(maker, phone, f'Batch Model {index}') for index in range(25)]
    with CaptureQueriesContext(connection) as queries:
        item = product(vendor_company, compatibility_mode='universal_device_type', compatible_device_types=[str(phone.pk)])
    assert compatible(item) == {row.pk for row in devices}
    # One audit row per changed mapping is preserved; only the statements are batched.
    assert AuditRecord.objects.filter(event_code='catalog.compatibility.changed',
        source_record_id__in=item.compatibility_assertions.values('pk')).count() == 25
    assert len(queries) < 40, len(queries)


def test_device_batch_remap_restores_the_same_mappings_as_single_device_remaps(vendor_company, phone, maker):
    category(phone, mode='feature_based')
    matching = [device(maker, phone, f'Remap Model {index}', wireless_charging_compatibility='Qi2') for index in range(3)]
    other = device(maker, phone, 'Remap Other')
    items = [product(vendor_company, f'REMAP-{index}', wireless_charging_compatibility='Qi2') for index in range(2)]
    expected = {row.pk for row in matching}
    assert all(compatible(item) == expected for item in items)
    ProductCompatibilityAssertion.objects.all().delete()
    before = AuditRecord.objects.filter(event_code='catalog.compatibility.changed').count()
    assert run_devices_remapping([*matching, other]) == 6
    assert all(compatible(item) == expected for item in items)
    assert AuditRecord.objects.filter(event_code='catalog.compatibility.changed').count() == before + 6
    assert run_devices_remapping([*matching, other]) == 0


def test_explicit_replace_is_batched_and_keeps_history(admin_client, vendor_company, phone, maker):
    category(phone)
    devices = [device(maker, phone, f'Explicit Model {index}') for index in range(12)]
    item = product(vendor_company)
    url = BASE + str(item.pk) + '/map-devices/'
    response = admin_client.post(url, {'device_ids': [str(row.pk) for row in devices], 'update_type': 'replace'}, format='json')
    assert response.status_code == 200, response.data
    assert compatible(item) == {row.pk for row in devices}
    with CaptureQueriesContext(connection) as queries:
        response = admin_client.post(url, {'device_ids': [str(devices[0].pk)], 'update_type': 'replace'}, format='json')
    assert response.status_code == 200, response.data
    assert compatible(item) == {devices[0].pk}
    assert item.compatibility_assertions.count() == 12
    assert item.compatibility_assertions.filter(match_status='Archived').count() == 11
    assert len(queries) < 60, len(queries)


def test_declared_canonical_ids_resolve_without_per_device_lookups(phone, maker):
    devices = [device(maker, phone, f'Declared Model {index}') for index in range(10)]
    declaration = '; '.join(str(row.pk) for row in devices)
    with CaptureQueriesContext(connection) as queries:
        values, types, resolved = parse_compatibility_row({'devicecompatibility': declaration}, None)
    assert resolved == [str(row.pk) for row in devices] and types == []
    assert len(queries) <= 3, len(queries)
    with pytest.raises(ValidationError):
        parse_compatibility_row({'devicecompatibility': str(uuid.uuid4())}, None)


def test_dropdown_list_counts_linked_products_with_grouped_queries(admin_client, vendor_company, phone, maker):
    category(phone)
    DynamicDropdownConfig.objects.create(field_name='product_category', value='Unused Category', status='setup_required')
    for index in range(3):
        DynamicDropdownConfig.objects.create(field_name='brand', value=f'Brand {index}', display_name=f'Brand {index}')
    product(vendor_company, 'COUNT-1', brand='Brand 1')
    product(vendor_company, 'COUNT-2', brand='Brand 1')
    with CaptureQueriesContext(connection) as queries:
        response = admin_client.get('/api/v1/catalog/dropdown-configs/')
    assert response.status_code == 200, response.data
    counts = {(row['field_name'], row['value']): row['linked_product_count'] for row in response.data}
    assert counts[('product_category', CATEGORY)] == 2
    assert counts[('product_category', 'Unused Category')] == 0
    assert counts[('brand', 'Brand 1')] == 2 and counts[('brand', 'Brand 0')] == 0
    statements = [query for query in queries if 'catalog_product' in query['sql'] and 'COUNT' in query['sql'].upper()]
    assert len(statements) <= 3, len(statements)


@override_settings(MEDIA_ROOT='')
def test_deferred_images_download_each_url_once_and_keep_declared_order(vendor_company, phone, maker):
    from apps.integration.catalog_sync import _process_deferred_images
    category(phone)
    first, second = product(vendor_company, 'IMG-1'), product(vendor_company, 'IMG-2')
    jpeg = b'\xff\xd8\xff\xe0'
    calls = []

    def download(url, timeout=15):
        calls.append(url)
        if url.endswith('broken.jpg'):
            raise ValueError('unreachable')
        return jpeg + url.encode(), url.rsplit('/', 1)[-1], 'image/jpeg'

    with patch('apps.integration.catalog_media.download_vendor_image', side_effect=download):
        _process_deferred_images([
            (first.pk, ['https://img.example/broken.jpg', 'https://img.example/a.jpg', 'https://img.example/b.jpg'], vendor_company.id, None),
            (second.pk, ['https://img.example/c.jpg'], vendor_company.id, None),
            (uuid.uuid4(), ['https://img.example/missing-product.jpg'], vendor_company.id, None),
        ])
    assert sorted(calls) == sorted(['https://img.example/broken.jpg', 'https://img.example/a.jpg',
        'https://img.example/b.jpg', 'https://img.example/c.jpg'])
    from apps.media.models import MediaAsset
    first.refresh_from_db(); second.refresh_from_db()
    assert MediaAsset.objects.get(pk=first.primary_image_reference).original_filename == 'a.jpg'
    assert len(first.media_references) == 2
    assert MediaAsset.objects.get(pk=second.primary_image_reference).original_filename == 'c.jpg'
