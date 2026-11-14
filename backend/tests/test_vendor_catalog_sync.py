"""Vendor catalog ingestion: scoped, durable, weekly/manual and failure-safe."""
import copy
import json
from datetime import timedelta
from decimal import Decimal

import pytest
from cryptography.fernet import Fernet
from django.test import override_settings
from django.utils import timezone

from apps.catalog.models import Product
from apps.integration.catalog_config import BALAJI_CONFIG
from apps.integration.catalog_sync import request_sync, process_sync_page, dispatch_due_syncs
from apps.integration.catalog_transport import CatalogTransportError, public_target
from apps.integration.models import VendorCatalogConnection, VendorCatalogItem, VendorCatalogSyncRun

pytestmark = pytest.mark.django_db


@pytest.fixture
def feed(settings, vendor_company, admin_user, monkeypatch):
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]
    vendor_company.external_id = json.dumps({"integration_mode": "api"})
    vendor_company.save()
    monkeypatch.setattr("apps.integration.catalog_sync.publish_job", lambda *args, **kwargs: None)
    config = copy.deepcopy(BALAJI_CONFIG)
    config['fields']['launch_date'] = {'path': 'launch_date'}
    return VendorCatalogConnection.objects.create(vendor_company=vendor_company, label="Test supplier feed",
        endpoint_url="https://supplier.example/api/catalog", auth_type="none", config=config,
        created_by=admin_user, updated_by=admin_user)


def row(sku="REMOTE-1", **changes):
    return {"sku": sku, "upc": "123456789012", "name": "Supplier accessory", "brand": "Source Brand",
        "unit_price_cents": 731, "currency": "USD", "quantity_available": 12, "device": "Universal", "launch_date": "2026-01-01", **changes}


def page(items, cursor=None, watermark="2026-11-12T00:00:00Z"):
    return {"success": True, "data": {"items": items, "next_cursor": cursor, "next_updated_since": watermark}}


def remote(monkeypatch, pages):
    calls = []
    def fetch(connection, params):
        calls.append(dict(params))
        response = pages.pop(0)
        if isinstance(response, Exception):
            raise response
        return response
    monkeypatch.setattr("apps.integration.catalog_sync.fetch_json", fetch)
    return calls


def test_connection_is_vendor_bound_and_credentials_are_write_only(admin_client, buyer_company, vendor_company, settings):
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]
    vendor_company.external_id = json.dumps({"integration_mode": "api"}); vendor_company.save()
    payload = {"vendor_company": str(vendor_company.id), "label": "Supplier connection", "endpoint_url": "https://supplier.example/catalog",
        "auth_type": "bearer", "credential": {"token": "private-test-token"}, "config": copy.deepcopy(BALAJI_CONFIG)}
    response = admin_client.post("/api/v1/integration/vendor-catalog-connections/", payload, format="json")
    assert response.status_code == 201, response.data
    connection = VendorCatalogConnection.objects.get(pk=response.data["id"])
    assert "private-test-token" not in connection.encrypted_credentials
    assert connection.encrypted_credentials and response.data["has_credentials"] is True
    assert "private-test-token" not in json.dumps(response.json())
    assert "encrypted_credentials" not in response.data
    response = admin_client.patch(f"/api/v1/integration/vendor-catalog-connections/{connection.pk}/", {"vendor_company": str(buyer_company.id)}, format="json")
    assert response.status_code == 400
    connection.refresh_from_db(); assert connection.vendor_company_id == vendor_company.id


@pytest.mark.parametrize("url", ["http://supplier.example/catalog", "https://localhost/catalog", "https://127.0.0.1/catalog", "https://user:pass@supplier.example/catalog", "https://supplier.example:8443/catalog", "https://supplier.example/catalog?api_key=private"])
def test_transport_refuses_unsafe_or_credential_urls(url):
    with pytest.raises(CatalogTransportError):
        public_target(url)


def test_short_and_empty_cursor_pages_are_not_terminal(feed, monkeypatch):
    calls = remote(monkeypatch, [page([row()], "cursor-A", None), page([], "cursor-B", None), page([row("REMOTE-2", upc="123456789029")])])
    run = request_sync(feed, feed.created_by)
    for _ in range(3):
        process_sync_page(run.id)
    run.refresh_from_db(); feed.refresh_from_db()
    assert run.status == "completed" and run.rows_seen == 2 and run.review_count == 2
    assert calls[1]["cursor"] == "cursor-A" and calls[2]["cursor"] == "cursor-B"
    assert feed.last_watermark == "2026-11-12T00:00:00Z"
    assert VendorCatalogItem.objects.filter(connection=feed).count() == 2
    assert set(Product.objects.values_list("status", flat=True)) <= {"draft", "pending_review"}
    assert not Product.objects.filter(compatibility_mode="universal_device_type").exists()


def test_repeated_run_updates_one_offer_and_preserves_source_identity(feed, monkeypatch):
    remote(monkeypatch, [page([row()]), page([row()]), page([row(quantity_available=33, unit_price_cents=802)])])
    for _ in range(3):
        run = request_sync(feed, feed.created_by)
        process_sync_page(run.id)
    assert Product.objects.count() == 1 and VendorCatalogItem.objects.count() == 1
    product = Product.objects.get()
    assert product.vendor_company_reference == feed.vendor_company_id
    assert product.company_scope_reference == feed.vendor_company_id
    assert product.brand == "Source Brand"
    assert product.vendor_wholesale_price_amount == Decimal("8.02") and product.inventory_level == 33


def test_manual_mode_blocks_reads_and_does_not_delete_previous_data(feed, monkeypatch):
    calls = remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by)
    process_sync_page(run.id)
    feed.vendor_company.external_id = json.dumps({"integration_mode": "manual"}); feed.vendor_company.save()
    with pytest.raises(ValueError, match="API"):
        request_sync(feed, feed.created_by)
    assert Product.objects.count() == 1 and len(calls) == 1


def test_one_active_run_and_no_watermark_or_removal_after_failure(feed, monkeypatch):
    remote(monkeypatch, [page([row()], "next-A", None), CatalogTransportError("AUTHENTICATION_FAILED", status=401)])
    run = request_sync(feed, feed.created_by)
    assert request_sync(feed, feed.created_by).id == run.id
    process_sync_page(run.id); process_sync_page(run.id)
    run.refresh_from_db(); feed.refresh_from_db()
    assert run.status == "failed" and feed.last_watermark == ""
    assert VendorCatalogItem.objects.get().is_listed is True
    assert run.error_code == "AUTHENTICATION_FAILED"


def test_retry_after_keeps_cursor_and_resumes_same_run(feed, monkeypatch):
    remote(monkeypatch, [page([row()], "next-A", None), CatalogTransportError("RATE_LIMITED", status=429, retry_after=10), page([])])
    run = request_sync(feed, feed.created_by)
    process_sync_page(run.id); process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == "retrying" and run.page_cursor == "next-A" and run.next_retry_at > timezone.now()
    VendorCatalogSyncRun.objects.filter(pk=run.pk).update(next_retry_at=timezone.now() - timedelta(seconds=1))
    process_sync_page(run.id)
    run.refresh_from_db(); assert run.status == "completed"


def test_cursor_loop_fails_without_marking_offers_missing(feed, monkeypatch):
    remote(monkeypatch, [page([row()], "same", None), page([], "same", None)])
    run = request_sync(feed, feed.created_by)
    process_sync_page(run.id); process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == "failed" and run.error_code == "PAGINATION_LOOP"
    assert VendorCatalogItem.objects.get().is_listed is True


def test_completed_full_refresh_marks_absence_but_keeps_product_history(feed, monkeypatch):
    remote(monkeypatch, [page([row()]), page([])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    product_id = VendorCatalogItem.objects.get().product_id
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    source = VendorCatalogItem.objects.get()
    assert source.is_listed is False and source.product_id == product_id
    assert Product.objects.filter(id=product_id).exists()


def test_weekly_dispatch_is_opt_in_and_respects_saved_mode(feed, monkeypatch):
    VendorCatalogConnection.objects.filter(pk=feed.pk).update(schedule_enabled=True, next_sync_at=timezone.now() - timedelta(seconds=1))
    result = dispatch_due_syncs()
    assert result["queued"] == 1 and VendorCatalogSyncRun.objects.count() == 1
    assert dispatch_due_syncs()["queued"] == 0


def test_other_company_cannot_read_or_trigger_connection(feed, buyer_client, vendor_user, cap_factory, monkeypatch):
    from rest_framework.test import APIClient
    capability = cap_factory('integration.connection.read')
    vendor_user.capabilities.add(capability)
    vendor_user.company.capabilities.add(capability)
    assert vendor_user.company.id == feed.vendor_company_id
    assert VendorCatalogConnection.objects.filter(pk=feed.pk, vendor_company=vendor_user.company).exists()
    client = APIClient(); client.force_authenticate(user=vendor_user)
    own = client.get(f"/api/v1/integration/vendor-catalog-connections/{feed.pk}/")
    assert own.status_code == 200, getattr(own, 'data', {})
    remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.pk)
    own_items = client.get(f"/api/v1/integration/vendor-catalog-connections/{feed.pk}/items/")
    assert own_items.status_code == 200 and len(own_items.data['results']) == 1
    assert 'payload' not in own_items.data['results'][0] and 'source_summary' not in own_items.data['results'][0]
    denied = buyer_client.get(f"/api/v1/integration/vendor-catalog-connections/{feed.pk}/")
    assert denied.status_code in (403, 404)
    assert buyer_client.get(f"/api/v1/integration/vendor-catalog-connections/{feed.pk}/items/").status_code in (403, 404)
    denied = client.post(f"/api/v1/integration/vendor-catalog-connections/{feed.pk}/sync/", {}, format="json")
    assert denied.status_code == 403


def test_model_validation_failure_stages_only_affected_source_row(feed, monkeypatch, admin_client):
    remote(monkeypatch, [page([row('NO-DATE', launch_date=None), row('VALID-DRAFT', upc='123456789029')])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == 'completed' and run.rows_seen == 2
    invalid = VendorCatalogItem.objects.get(external_id='NO-DATE')
    assert invalid.product_id is None and invalid.review_required
    assert any(error['field'] == 'launch_date' for error in invalid.review_errors)
    assert VendorCatalogItem.objects.get(external_id='VALID-DRAFT').product_id is not None
    visible = admin_client.get(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/items/').data['results']
    staged = next(item for item in visible if item['external_id'] == 'NO-DATE')
    assert staged['product'] is None and staged['source_summary']['sku'] == 'NO-DATE'
    assert any(issue['field'] == 'launch_date' for issue in staged['review_errors'])
    catalog = admin_client.get('/api/v1/catalog/products/?search=NO-DATE')
    assert catalog.status_code == 200 and catalog.data['results'] == []
    draft = admin_client.get('/api/v1/catalog/products/?search=VALID-DRAFT')
    assert draft.status_code == 200 and len(draft.data['results']) == 1


def test_source_hold_preserves_approved_data_and_blocks_only_that_offer(feed, monkeypatch):
    from apps.catalog.models import Brand, VendorBrandRelationship
    brand = Brand.objects.create(name='Source Brand')
    VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company, brand=brand, relationship_type='owned', approved_by=feed.created_by)
    remote(monkeypatch, [page([row()]), page([row(unit_price_cents=-100, name='Invalid update')])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    source = VendorCatalogItem.objects.get()
    Product.objects.filter(pk=source.product_id).update(status='active')
    VendorCatalogItem.objects.filter(pk=source.pk).update(review_required=False)
    previous = Product.objects.get(pk=source.product_id)
    from apps.catalog.source_visibility import eligible_vendor_sources
    assert eligible_vendor_sources(Product.objects.all()).filter(pk=previous.pk).exists()
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    source.refresh_from_db(); previous.refresh_from_db()
    assert source.review_required and source.product_id == previous.id
    assert previous.name == 'Supplier accessory' and previous.vendor_wholesale_price_amount == Decimal('7.31')
    assert not eligible_vendor_sources(Product.objects.all()).filter(pk=previous.pk).exists()


def test_item_and_run_history_are_paginated_without_internal_secrets(feed, monkeypatch, admin_client):
    remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    response = admin_client.get(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/items/')
    assert response.status_code == 200, response.data
    assert len(response.data['results']) == 1
    response = admin_client.get(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/runs/')
    assert response.status_code == 200 and len(response.data['results']) == 1
    assert 'lease_token' not in response.data['results'][0] and 'page_cursor' not in response.data['results'][0]


def test_conflicting_identity_across_pages_is_held_without_last_row_overwrite(feed, monkeypatch):
    remote(monkeypatch, [page([row()], 'next'), page([row(unit_price_cents=999)])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id); process_sync_page(run.id)
    source = VendorCatalogItem.objects.get()
    assert source.review_required and any(error['code'] == 'CONFLICTING_DUPLICATE' for error in source.review_errors)
    assert source.product.vendor_wholesale_price_amount == Decimal('7.31')


def test_same_sku_upc_at_a_second_supplier_creates_a_separate_offer(feed, monkeypatch, admin_client):
    remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    first = Product.objects.get()
    from apps.tenant.models import Company
    second = Company.objects.create(name='Independent Supplier', slug='independent-supplier', company_type='vendor')
    response = admin_client.post('/api/v1/catalog/products/', {'product_type':'accessory', 'name':'Second supplier offer', 'sku':first.sku, 'upc':first.upc,
        'brand':'Source Brand', 'vendor_company_reference':str(second.id), 'launch_date':'2026-01-01', 'status':'draft'}, format='json')
    assert response.status_code == 201, response.data
    assert Product.objects.filter(sku=first.sku).count() == 2
    first.refresh_from_db(); assert first.vendor_company_reference == feed.vendor_company_id and first.name == 'Supplier accessory'


def test_brand_is_reusable_across_confirmed_supplier_relationships(admin_client, buyer_client, vendor_company):
    from apps.tenant.models import Company
    from apps.catalog.models import Brand, VendorBrandRelationship
    response = admin_client.post('/api/v1/integration/catalog-brands/', {'name':'Reusable Brand'}, format='json')
    assert response.status_code == 201, response.data
    brand_id = response.data['id']
    supplier = Company.objects.create(name='Authorized Distributor', slug='authorized-distributor', company_type='vendor')
    for company, relationship in ((vendor_company,'owned'),(supplier,'authorized_distributor')):
        response = admin_client.post('/api/v1/integration/vendor-brand-relationships/', {'vendor_company':str(company.id),'brand':str(brand_id),'relationship_type':relationship}, format='json')
        assert response.status_code == 201, response.data
    assert Brand.objects.filter(name='Reusable Brand').count() == 1
    assert VendorBrandRelationship.objects.filter(brand_id=brand_id).count() == 2
    assert buyer_client.get('/api/v1/integration/catalog-brands/').status_code == 403


def test_approved_brand_backfill_preserves_product_identity_and_never_infers_relationships(feed, monkeypatch):
    remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    from django.apps import apps
    from importlib import import_module
    from apps.catalog.models import DynamicDropdownConfig, VendorBrandRelationship
    product = Product.objects.get(); original_id = product.id
    DynamicDropdownConfig.objects.create(field_name='brand', value='Source Brand', display_name='Source Brand', status='active')
    migration = import_module('apps.catalog.migrations.0035_backfill_approved_brands')
    migration.forwards(apps, None); migration.forwards(apps, None)
    product.refresh_from_db()
    assert product.id == original_id and product.brand == 'Source Brand'
    assert product.brand_reference.name == 'Source Brand'
    assert not VendorBrandRelationship.objects.exists()


def test_admin_cancel_releases_run_without_remote_read_or_data_removal(feed, monkeypatch, admin_client):
    calls = remote(monkeypatch, [])
    run = request_sync(feed, feed.created_by)
    response = admin_client.post(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/cancel/', {}, format='json')
    assert response.status_code == 200 and response.data['cancelled_runs'] == 1
    process_sync_page(run.id)
    run.refresh_from_db(); assert run.status == 'cancelled' and not calls
    assert request_sync(feed, feed.created_by).pk != run.pk


def test_critical_config_change_cancels_old_run_and_rejects_stale_editor(feed, admin_client):
    original_version = str(feed.config_version)
    run = request_sync(feed, feed.created_by)
    url = f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/'
    response = admin_client.patch(url, {'endpoint_url':'https://another.example/catalog'}, format='json', HTTP_IF_MATCH=original_version)
    assert response.status_code == 200, response.data
    run.refresh_from_db(); assert run.status == 'cancelled' and run.error_code == 'CONNECTION_CHANGED'
    response = admin_client.patch(url, {'label':'Stale label'}, format='json', HTTP_IF_MATCH=original_version)
    assert response.status_code == 409
    feed.refresh_from_db(); assert feed.label == 'Test supplier feed'


def test_suspended_supplier_cancels_queued_work_before_provider_read(feed, monkeypatch):
    calls = remote(monkeypatch, [])
    run = request_sync(feed, feed.created_by)
    from apps.tenant.models import Company
    Company.objects.filter(pk=feed.vendor_company_id).update(status='suspended')
    process_sync_page(run.id)
    run.refresh_from_db(); assert run.status == 'cancelled' and not calls


def test_real_task_publication_uses_registered_dedicated_catalog_queue(monkeypatch):
    from uuid import uuid4
    from config.celery import app
    from apps.integration.tasks import process_vendor_catalog_page
    from apps.integration.catalog_sync import publish_job
    calls = []
    monkeypatch.setattr(app, 'send_task', lambda name, **kwargs: calls.append((name, kwargs)))
    identifier = uuid4(); publish_job(identifier, 9)
    assert calls[0][0] == process_vendor_catalog_page.name == 'integration.vendor_catalog.process_page'
    assert calls[0][1]['args'] == [str(identifier)]
    assert calls[0][1]['queue'] == 'vendor_catalog' and calls[0][1]['countdown'] == 9


def test_admin_connection_probe_previews_items_without_claiming_import_success(feed, monkeypatch, admin_client):
    calls = remote(monkeypatch, [page([row(), row('REMOTE-2')], 'more')])
    response = admin_client.post(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/test_connection/', {}, format='json')
    assert response.status_code == 200, response.data
    assert response.data['http_status'] == 200 and response.data['sample_count'] == 2
    assert response.data['samples'][0]['sku'] == 'REMOTE-1'
    assert response.data['imported_count'] == 0 and not Product.objects.exists() and not VendorCatalogItem.objects.exists()
    assert calls[0]['limit'] == 3


def test_generic_connector_defaults_and_template_are_not_supplier_specific(admin_client):
    from apps.integration.catalog_config import default_catalog_config, validate_config
    generic = default_catalog_config()
    assert generic['items_path'] == 'items' and generic['fields']['msrp']['path'] == 'msrp'
    assert validate_config(generic) == generic
    response = admin_client.get('/api/v1/integration/vendor-catalog-connections/template/?provider=generic')
    assert response.status_code == 200 and response.data['endpoint_url'] == '' and response.data['label'] == ''
    assert 'launch_date' in response.data['supported_fields']
    assert admin_client.get('/api/v1/integration/vendor-catalog-connections/template/?provider=unknown').status_code == 400


def test_other_provider_uses_its_own_paths_identity_and_price_units(feed, monkeypatch):
    from apps.catalog.models import Brand, VendorBrandRelationship
    brand = Brand.objects.create(name='Independent Provider Brand')
    VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company, brand=brand, relationship_type='authorized_distributor')
    config = copy.deepcopy(feed.config)
    config.update(items_path='records', next_cursor_path='paging.next', success_path='', watermark_path='')
    config['fields'] = {'external_id':{'path':'remote_id'}, 'sku':{'path':'code'}, 'name':{'path':'title'},
        'brand':{'path':'maker'}, 'vendor_wholesale_price_amount':{'path':'price'}, 'launch_date':{'path':'launch'}}
    feed.config = config; feed.save()
    remote(monkeypatch, [{'records':[{'remote_id':'vendor-record-91','code':'PROVIDER-91','title':'Different provider offer',
        'maker':brand.name,'price':'9.45','launch':'2026-01-01'}], 'paging':{'next':None}}])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    run.refresh_from_db()
    product = Product.objects.get(sku='PROVIDER-91')
    assert run.status == 'completed' and product.vendor_wholesale_price_amount == Decimal('9.45')
    assert product.brand_reference_id == brand.id and product.vendor_company_reference == feed.vendor_company_id
    assert VendorCatalogItem.objects.get().external_id == 'vendor-record-91'


@pytest.mark.parametrize('mode', ['cursor', 'page', 'offset', 'none'])
def test_generic_provider_sync_exposes_saved_data_and_progress_for_every_pagination(mode, feed, monkeypatch, admin_client):
    from apps.integration.catalog_config import default_catalog_config
    config = default_catalog_config()
    config.update(items_path='payload.offers', pagination=mode, page_size=2,
                  next_cursor_path='paging.next', has_more_path='paging.more', page_param='page', offset_param='offset')
    config['fields'] = {target: {'path': source} for target, source in {
        'external_id': 'remote', 'sku': 'code', 'name': 'title', 'brand': 'maker',
        'vendor_wholesale_price_amount': 'pricing.net', 'inventory_level': 'stock', 'launch_date': 'launch',
    }.items()}
    feed.config = config; feed.save()
    rows = [{'remote': f'record-{index}', 'code': f'GENERIC-{index}', 'title': f'Generic offer {index}',
             'maker': 'Source Brand', 'pricing': {'net': '9.45'}, 'stock': index, 'launch': '2026-01-01'} for index in (1, 2)]
    pages = [{'payload': {'offers': rows}, 'paging': {'next': None, 'more': False}}] if mode == 'none' else [
        {'payload': {'offers': rows[:1]}, 'paging': {'next': 'next-page', 'more': True}},
        {'payload': {'offers': rows[1:]}, 'paging': {'next': None, 'more': False}},
    ]
    calls = remote(monkeypatch, pages)
    run = request_sync(feed, feed.created_by)
    base = f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/'
    process_sync_page(run.pk)
    first = admin_client.get(base + 'items/').data['results']
    assert len(first) == (2 if mode == 'none' else 1)
    if mode != 'none':
        run.refresh_from_db()
        assert run.status == 'queued' and run.rows_seen == 1
        process_sync_page(run.pk)
    run.refresh_from_db()
    assert run.status == 'completed' and run.rows_seen == 2
    items = admin_client.get(base + 'items/').data['results']
    assert {item['source_summary']['name'] for item in items} == {'Generic offer 1', 'Generic offer 2'}
    assert {item['source_summary']['vendor_wholesale_price_amount'] for item in items} == {'9.45'}
    assert {item['source_summary']['inventory_level'] for item in items} == {'1', '2'}
    assert Product.objects.filter(vendor_company_reference=feed.vendor_company_id, sku__startswith='GENERIC-').count() == 2
    history = admin_client.get(base + 'runs/').data['results'][0]
    assert history['status'] == 'completed' and history['rows_seen'] == 2
    if mode == 'page':
        assert [call['page'] for call in calls] == [1, 2]
    elif mode == 'offset':
        assert [call['offset'] for call in calls] == [0, 2]
    elif mode == 'cursor':
        assert 'cursor' not in calls[0] and calls[1]['cursor'] == 'next-page'
    else:
        assert calls == [{'limit': 2}]


@pytest.mark.parametrize('mode,extra', [('cursor', {}), ('page', {'page': 1}), ('offset', {'offset': 0}), ('none', {})])
def test_generic_provider_probe_uses_same_initial_pagination_as_sync(mode, extra, feed, monkeypatch, admin_client):
    from apps.integration.catalog_config import default_catalog_config
    config = default_catalog_config()
    config.update(pagination=mode, has_more_path='more', page_param='page', offset_param='offset')
    feed.config = config; feed.save()
    calls = remote(monkeypatch, [{'items': [{'sku': 'SAMPLE', 'name': 'Supplier sample'}]}])
    response = admin_client.post(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/test_connection/', {}, format='json')
    assert response.status_code == 200, response.data
    assert calls == [{'limit': 3, **extra}]
    assert response.data['imported_count'] == 0 and not VendorCatalogItem.objects.exists()


@pytest.mark.parametrize('changes', [{'sku': []}, {'vendor_category': ['unexpected']}])
def test_malformed_source_field_is_held_without_rolling_back_valid_rows(changes, feed, monkeypatch):
    feed.config['fields']['vendor_category'] = {'path':'vendor_category'}
    feed.save()
    malformed = row('INVALID-SHAPE'); malformed.update(changes)
    remote(monkeypatch, [page([malformed, row('VALID-AFTER-BAD', upc='123456789029')])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == 'completed' and run.rows_seen == 2 and run.error_code == ''
    assert Product.objects.filter(sku='VALID-AFTER-BAD').exists()
    assert VendorCatalogItem.objects.filter(review_required=True).count() == 2


def test_two_remote_identities_for_one_supplier_sku_are_reviewed_without_last_row_overwrite(feed, monkeypatch):
    feed.config['fields']['external_id'] = {'path':'remote_id'}
    feed.save()
    remote(monkeypatch, [page([row('SAME-OFFER', remote_id='first'), row('SAME-OFFER', remote_id='second', unit_price_cents=999)])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == 'completed' and run.review_count == 2 and run.error_count == 2
    assert not Product.objects.filter(sku='SAME-OFFER').exists()
    assert VendorCatalogItem.objects.filter(product__isnull=True, review_required=True).count() == 2


def test_changed_remote_identity_does_not_rebind_or_overwrite_existing_offer(feed, monkeypatch):
    feed.config['fields']['external_id'] = {'path':'remote_id'}
    feed.save()
    remote(monkeypatch, [page([row('STABLE-OFFER', remote_id='original')]), page([row('STABLE-OFFER', remote_id='replacement', unit_price_cents=999)])])
    first = request_sync(feed, feed.created_by); process_sync_page(first.id)
    original = VendorCatalogItem.objects.get(external_id='original')
    product_id = original.product_id
    second = request_sync(feed, feed.created_by); process_sync_page(second.id)
    second.refresh_from_db(); original.refresh_from_db()
    assert second.status == 'completed' and second.error_code == ''
    assert Product.objects.get(pk=product_id).vendor_wholesale_price_amount == Decimal('7.31')
    assert original.product_id == product_id and original.review_required
    replacement = VendorCatalogItem.objects.get(external_id='replacement')
    assert replacement.product_id is None and replacement.review_required


def test_new_mapping_configuration_reprocesses_unchanged_source_payload(feed, monkeypatch, admin_client):
    from apps.catalog.models import Brand, VendorBrandRelationship
    brand = Brand.objects.create(name='Source Brand')
    VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company, brand=brand, relationship_type='owned')
    payload = row(alternate_name='Name from newly configured source path')
    remote(monkeypatch, [page([payload]), page([payload])])
    first = request_sync(feed, feed.created_by); process_sync_page(first.id)
    source = VendorCatalogItem.objects.get()
    # Simulate a separately completed readiness review; this test isolates
    # unchanged-source optimization from changes to the connector mapping.
    VendorCatalogItem.objects.filter(pk=source.pk).update(review_required=False)
    updated = copy.deepcopy(feed.config); updated['fields']['name'] = {'path':'alternate_name'}
    response = admin_client.patch(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/', {'config':updated}, format='json')
    assert response.status_code == 200, response.data
    feed.refresh_from_db()
    second = request_sync(feed, feed.created_by); process_sync_page(second.id)
    source.refresh_from_db()
    assert source.product.name == 'Name from newly configured source path'
    assert source.applied_config_version == feed.config_version


def test_incomplete_source_page_uses_bounded_queries_instead_of_per_row_catalog_validation(feed, monkeypatch):
    from django.db import connection
    from django.test.utils import CaptureQueriesContext
    remote(monkeypatch, [page([row(f'NEEDS-SETUP-{index}', launch_date=None) for index in range(50)])])
    run = request_sync(feed, feed.created_by)
    with CaptureQueriesContext(connection) as captured:
        process_sync_page(run.id)
    run.refresh_from_db()
    assert run.status == 'completed' and run.review_count == 50 and not Product.objects.exists()
    assert len(captured) < 150, f'Invalid setup must not repeatedly run full catalog validation: {len(captured)} queries'


def test_supplier_normalized_sku_update_does_not_become_an_identity_change(feed, monkeypatch):
    remote(monkeypatch, [page([row('TRIMMED-SKU')]), page([row(' TRIMMED-SKU ', unit_price_cents=802)])])
    first = request_sync(feed, feed.created_by); process_sync_page(first.id)
    second = request_sync(feed, feed.created_by); process_sync_page(second.id)
    assert Product.objects.get(sku='TRIMMED-SKU').vendor_wholesale_price_amount == Decimal('8.02')
    assert VendorCatalogItem.objects.count() == 1


def test_supplier_brand_display_normalization_preserves_approved_identity(feed, monkeypatch):
    from apps.catalog.models import Brand, VendorBrandRelationship
    brand = Brand.objects.create(name='Source Brand')
    VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company, brand=brand, relationship_type='owned')
    remote(monkeypatch, [page([row()]), page([row(brand='SOURCE BRAND', unit_price_cents=802)])])
    first = request_sync(feed, feed.created_by); process_sync_page(first.id)
    second = request_sync(feed, feed.created_by); process_sync_page(second.id)
    product = Product.objects.get()
    assert product.brand_reference_id == brand.id and product.vendor_wholesale_price_amount == Decimal('8.02')


def test_supplier_price_input_changes_have_scoped_before_after_audit_evidence(feed, monkeypatch):
    from apps.audit.models import AuditRecord
    remote(monkeypatch,[page([row()]),page([row(unit_price_cents=802)])])
    for _ in range(2):
        run=request_sync(feed,feed.created_by);process_sync_page(run.id)
    source=VendorCatalogItem.objects.get()
    observations=AuditRecord.objects.filter(event_code='integration.vendor_catalog.source_processed',source_record_id=source.pk).order_by('created_at')
    assert observations.count()==2
    latest=observations.last();payload=json.loads(latest.event_description)
    assert Decimal(payload['before']['vendor_wholesale_price_amount'])==Decimal('7.31')
    assert Decimal(payload['after']['vendor_wholesale_price_amount'])==Decimal('8.02')
    assert latest.company_scope_reference==feed.vendor_company_id and latest.source_record_type=='VendorCatalogItem'
    assert payload['run_id']==str(run.pk) and payload['applied_config_version']==str(feed.config_version)
    assert 'encrypted_credentials' not in payload


def test_supplier_sync_preserves_saved_admin_category_override(feed, monkeypatch):
    import uuid
    from apps.catalog.models import DynamicDropdownConfig
    from apps.devices.models import DeviceType
    kind = DeviceType.objects.create(name='Phone', code='phone', status='active')
    for name in ('Admin governed category', 'Feed category'):
        DynamicDropdownConfig.objects.create(field_name='product_category', value=name, status='active',
            compatibility_mode='device_specific', eligible_device_types=[str(kind.id)])
    feed.config['default_category'] = 'Admin governed category'; feed.save()
    remote(monkeypatch, [page([row(device='')]), page([row(device='', unit_price_cents=802)])])
    first = request_sync(feed, feed.created_by); process_sync_page(first.id)
    product = Product.objects.get()
    Product.objects.filter(pk=product.pk).update(product_category_override='Admin governed category')
    feed.config['default_category'] = 'Feed category'; feed.config_version = uuid.uuid4(); feed.save()
    second = request_sync(feed, feed.created_by); process_sync_page(second.id)
    product.refresh_from_db()
    assert product.product_category == product.product_category_override == 'Admin governed category'


def test_conflicting_source_compatibility_evidence_is_held_without_inventing_a_match(feed, monkeypatch):
    from apps.catalog.models import DynamicDropdownConfig
    from apps.devices.models import DeviceType
    kind = DeviceType.objects.create(name='Phone', code='phone', status='active')
    DynamicDropdownConfig.objects.create(field_name='product_category', value='Conflicting source category', status='active', compatibility_mode='feature_based',
        eligible_device_types=[str(kind.id)], accessory_fields=['headphone_jack_compatibility'],
        compatibility_rules={'headphone_jack_compatibility':{'mode':'optional','comparison':'equals'}})
    feed.config['default_category'] = 'Conflicting source category'
    feed.config['fields']['headphone_jack_compatibility'] = {'path':'jack'}; feed.save()
    remote(monkeypatch, [page([row(device='Lightning', jack='Type-C')])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    source = VendorCatalogItem.objects.get()
    assert source.review_required and any(error['code']=='COMPATIBILITY_REVIEW_REQUIRED' for error in source.review_errors)
    assert not Product.objects.exists()


@pytest.mark.parametrize('conflict', [False, True])
def test_supplier_feed_reuses_canonical_category_mapping_and_holds_conflicts(conflict, feed, monkeypatch):
    from apps.catalog.models import DynamicDropdownConfig, VendorCategoryMapping
    from apps.devices.models import DeviceType
    kind=DeviceType.objects.create(name='Phone',code='phone',status='active')
    for name in ('Canonical category','Conflicting category'):
        DynamicDropdownConfig.objects.create(field_name='product_category',value=name,status='active',compatibility_mode='device_specific',eligible_device_types=[str(kind.id)])
    VendorCategoryMapping.objects.create(vendor_company_reference=feed.vendor_company_id,company_scope_reference=feed.vendor_company_id,
        vendor_category='Supplier Group',cixci_category='Canonical category',status='active')
    feed.config['fields']['vendor_category']={'path':'category'}
    if conflict:
        feed.config['category_map']={'Supplier Group':'Conflicting category'}
    feed.save()
    remote(monkeypatch,[page([row(device='',category=' supplier group ')])])
    run=request_sync(feed,feed.created_by);process_sync_page(run.id)
    if conflict:
        assert not Product.objects.exists()
        assert any(error['code']=='CATEGORY_MAPPING_CONFLICT' for error in VendorCatalogItem.objects.get().review_errors)
    else:
        assert Product.objects.get().product_category=='Canonical category'
        assert Product.objects.get().category_validation_status=='resolved'


@pytest.mark.parametrize('method', ['device_specific','feature_based','hybrid','universal'])
@pytest.mark.parametrize('code', ['phone','tablet','smartwatch'])
def test_external_supplier_mapping_pipeline_uses_shared_rules_for_every_current_type(method, code, feed, monkeypatch, vendor_client):
    from apps.catalog.models import Brand, VendorBrandRelationship, DynamicDropdownConfig
    from apps.devices.models import DeviceType, Device, Manufacturer
    kinds = {value:DeviceType.objects.create(name=value.title(),code=value,status='active') for value in ('phone','tablet','smartwatch')}
    maker = Manufacturer.objects.create(name='External feed matrix maker')
    devices = [Device.objects.create(name=f'{code} matrix {index}', manufacturer=maker, device_type=kinds[code], bluetooth_compatibility='Yes') for index in (1,2)]
    for other in set(kinds)-{code}:
        Device.objects.create(name=other+' other type',manufacturer=maker,device_type=kinds[other],bluetooth_compatibility='Yes')
    name = 'External matrix '+method
    DynamicDropdownConfig.objects.create(field_name='product_category',value=name,status='active',compatibility_mode=method,
        eligible_device_types=[str(kind.id) for kind in kinds.values()] if method=='universal' else [str(kinds[code].id)],
        accessory_fields=['bluetooth_compatibility'] if method in ('feature_based','hybrid') else [],
        compatibility_rules={'bluetooth_compatibility':{'mode':'optional','comparison':'is_true'}} if method in ('feature_based','hybrid') else {})
    brand = Brand.objects.create(name='Source Brand')
    VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company,brand=brand,relationship_type='owned')
    feed.config['default_category']=name
    feed.config['fields'].update(msrp={'path':'msrp'},bluetooth_compatibility={'path':'bluetooth'})
    feed.save()
    declaration=f'Universal, {kinds[code].name}' if method=='universal' else str(devices[0].id) if method in ('device_specific','hybrid') else ''
    remote(monkeypatch,[page([row('EXTERNAL-MATRIX',device=declaration,msrp='20',bluetooth='No' if method=='universal' else 'Yes')])])
    run=request_sync(feed,feed.created_by);process_sync_page(run.id)
    product=Product.objects.get(sku='EXTERNAL-MATRIX')
    expected={devices[0].id} if method=='device_specific' else {device.id for device in devices}
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list('device_reference',flat=True))==expected
    assert product.vendor_company_reference==feed.vendor_company_id and product.product_category==name
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list('match_source',flat=True))=={'Vendor API Sync'}
    listed=vendor_client.get('/api/v1/catalog/products/',{'sku':product.sku})
    assert listed.status_code==200 and [record['id'] for record in listed.data['results']]==[str(product.id)]


@pytest.mark.parametrize('error', [CatalogTransportError('AUTHENTICATION_FAILED', status=401), CatalogTransportError('RATE_LIMITED', status=429, retry_after=60)])
def test_admin_connection_probe_returns_actionable_provider_error_without_false_success(error, feed, monkeypatch, admin_client):
    remote(monkeypatch, [error])
    response = admin_client.post(f'/api/v1/integration/vendor-catalog-connections/{feed.pk}/test_connection/', {}, format='json')
    assert response.status_code == 400 and error.code in str(response.data), response.data
    assert not Product.objects.exists() and not VendorCatalogSyncRun.objects.exists()


@pytest.mark.parametrize('retired', ['brand', 'relationship'])
def test_retired_supplier_brand_blocks_future_source_reads_and_restore_preserves_identity(retired, feed, monkeypatch, admin_client):
    from apps.catalog.models import Brand, VendorBrandRelationship
    from apps.catalog.source_visibility import eligible_vendor_sources
    brand = Brand.objects.create(name='Source Brand')
    link = VendorBrandRelationship.objects.create(vendor_company=feed.vendor_company, brand=brand, relationship_type='authorized_distributor', approved_by=feed.created_by)
    remote(monkeypatch, [page([row()])])
    run = request_sync(feed, feed.created_by); process_sync_page(run.id)
    source = VendorCatalogItem.objects.get()
    VendorCatalogItem.objects.filter(pk=source.pk).update(review_required=False)
    original = source.product_id
    assert eligible_vendor_sources(Product.objects.all()).filter(pk=original).exists()
    url = f'/api/v1/integration/catalog-brands/{brand.pk}/' if retired == 'brand' else f'/api/v1/integration/vendor-brand-relationships/{link.pk}/'
    response = admin_client.patch(url, {'is_active': False}, format='json')
    assert response.status_code == 200, response.data
    assert not eligible_vendor_sources(Product.objects.all()).filter(pk=original).exists()
    assert Product.objects.get(pk=original).brand == 'Source Brand'
    response = admin_client.patch(url, {'is_active': True}, format='json')
    assert response.status_code == 200, response.data
    assert eligible_vendor_sources(Product.objects.all()).filter(pk=original).exists()
