"""A deployed Universal declaration must rebuild through the shared engine."""
import json
import uuid
from datetime import timedelta
import pytest
from django.utils import timezone
from apps.audit.models import AuditRecord
from apps.catalog.models import Product, DynamicDropdownConfig, BuyerProductExportJob, BuyerProductExportSelectionSnapshot
from apps.devices.models import DeviceType, Device, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('method', ['device_specific','feature_based','hybrid','universal'])
def test_durable_rebuild_is_category_independent_and_preserves_controls_history(method, vendor_company, buyer_user):
    from apps.catalog.compatibility_rebuild import process_pending_rebuilds, REQUEST_EVENT, COMPLETE_EVENT
    kinds=[DeviceType.objects.create(name=code.title(),code=code,status='active') for code in ('phone','tablet','smartwatch')]
    maker=Manufacturer.objects.create(name='Deployment rebuild maker')
    devices=[Device.objects.create(name=kind.code,device_type=kind,manufacturer=maker) for kind in kinds]
    excluded=Device.objects.create(name='Excluded model',device_type=kinds[0],manufacturer=maker)
    locked=Device.objects.create(name='Locked model',device_type=kinds[1],manufacturer=maker)
    config=DynamicDropdownConfig.objects.create(field_name='product_category',value='Deployment '+method,status='active',compatibility_mode=method,eligible_device_types=[str(kind.id) for kind in kinds])
    product=Product.objects.create(name='Declared Universal offer',sku='DEPLOY-'+method,product_type='accessory',product_category=config.value,
        vendor_company_reference=vendor_company.id,company_scope_reference=vendor_company.id,launch_date=timezone.localdate()-timedelta(days=1),
        compatibility_mode='universal_device_type',compatible_device_types=[str(kind.id) for kind in kinds])
    product.compatibility_assertions.filter(device_reference__in=[devices[1].id,devices[2].id]).update(is_compatible=False,match_status='Archived')
    product.compatibility_assertions.filter(device_reference=excluded.id).update(is_excluded=True,is_compatible=False,match_status='Excluded')
    product.compatibility_assertions.filter(device_reference=locked.id).update(is_locked=True,is_compatible=False,match_status='Archived')
    job=BuyerProductExportJob.objects.create(buyer_reference=buyer_user.id,company_scope_reference=buyer_user.company.id,buyer_entity_reference=buyer_user.entity_id,requested_by=buyer_user.id,status='completed')
    historical=[{'product_id':str(product.id),'original_names':['Historical device']}]
    snapshot=BuyerProductExportSelectionSnapshot.objects.create(export_job=job,product_ids=[str(product.id)],portfolio_snapshot_reference=uuid.uuid4(),exported_products_snapshot=historical)
    request=AuditRecord.objects.create(event_code=REQUEST_EVENT,event_description=json.dumps({'reason':'Rebuild declared scope after deployment'}),
        status='success',company_scope_reference=vendor_company.id,source_module='catalog',source_record_type='Product',source_record_id=product.id)
    DeviceType.objects.filter(pk=kinds[0].pk).update(name='Renamed Phone')
    assert process_pending_rebuilds() == 1
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list('device_reference',flat=True)) == {device.id for device in devices}
    assert product.compatibility_assertions.get(device_reference=excluded.id).is_excluded
    assert product.compatibility_assertions.get(device_reference=locked.id).is_locked
    assert product.universal_type_scopes.filter(is_active=True).count() == 3
    assert process_pending_rebuilds() == 0
    assert AuditRecord.objects.filter(event_code=COMPLETE_EVENT,service_trigger_reference='compatibility-rebuild:'+str(request.id)).count() == 1
    snapshot.refresh_from_db(); assert snapshot.exported_products_snapshot == historical


def test_approved_source_migration_is_bounded_and_rebuilds_every_declared_offer(vendor_company):
    import importlib
    from types import SimpleNamespace
    from django.apps import apps
    from apps.tenant.models import Company
    migration = importlib.import_module('apps.catalog.migrations.0033_approved_speaker_scopes_and_deployment_rebuild')
    kinds = [DeviceType.objects.create(name=code.title(), code=code, status='active') for code in migration.TYPE_CODES]
    supplier = Company.objects.create(id=migration.SUPPLIER, name='Approved repair supplier', slug='approved-repair-supplier', company_type='vendor')
    category = DynamicDropdownConfig.objects.create(field_name='product_category', value='Migration test category', status='active', compatibility_mode='device_specific', eligible_device_types=[str(kind.id) for kind in kinds])
    approved = [Product.objects.create(id=identifier, sku=sku, name=sku, product_category=category.value, launch_date=timezone.localdate(),
                company_scope_reference=supplier.id, vendor_company_reference=supplier.id)
                for identifier, sku in migration.APPROVED_PRODUCTS.items()]
    untouched = Product.objects.create(sku='NO-APPROVAL', name='Unapproved scope', product_category=category.value, launch_date=timezone.localdate(),
                company_scope_reference=supplier.id, vendor_company_reference=supplier.id)
    unrelated = Product.objects.create(sku='OTHER-CATEGORY', name='Existing Universal', product_category=category.value, launch_date=timezone.localdate(),
                company_scope_reference=vendor_company.id, vendor_company_reference=vendor_company.id,
                compatibility_mode='universal_device_type', compatible_device_types=[str(kinds[0].id)])
    editor = SimpleNamespace(connection=SimpleNamespace(alias='default'))
    migration.forwards(apps, editor)
    migration.forwards(apps, editor)
    for product in approved:
        product.refresh_from_db()
        assert product.compatibility_mode == 'universal_device_type'
        assert set(product.universal_type_scopes.filter(is_active=True).values_list('device_type_id', flat=True)) == {kind.id for kind in kinds}
    untouched.refresh_from_db()
    assert untouched.compatibility_mode == 'direct_device' and not untouched.compatible_device_types
    unrelated.refresh_from_db()
    assert unrelated.compatible_device_types == [kinds[0].code]
    assert list(unrelated.universal_type_scopes.filter(is_active=True).values_list('device_type_id', flat=True)) == [kinds[0].id]
    assert AuditRecord.objects.filter(event_code='catalog.compatibility.approved_scope_declaration').count() == 3
    assert set(AuditRecord.objects.filter(event_code='catalog.compatibility.rebuild_requested').values_list('source_record_id', flat=True)) == {product.id for product in [*approved, unrelated]}


def test_approved_source_migration_requires_complete_canonical_types(vendor_company):
    import importlib
    from types import SimpleNamespace
    from django.apps import apps
    migration = importlib.import_module('apps.catalog.migrations.0033_approved_speaker_scopes_and_deployment_rebuild')
    identifier, sku = next(iter(migration.APPROVED_PRODUCTS.items()))
    product = Product.objects.create(id=identifier, sku=sku, name='Needs canonical setup', launch_date=timezone.localdate(), vendor_company_reference=migration.SUPPLIER, company_scope_reference=migration.SUPPLIER)
    with pytest.raises(RuntimeError, match='no partial scope'):
        migration.forwards(apps, SimpleNamespace(connection=SimpleNamespace(alias='default')))
    product.refresh_from_db()
    assert product.compatibility_mode == 'direct_device'
