"""Explicit user-approved scopes; no category-to-product scope inference.

Queue derived repairs in the existing audit store. post_migrate runs the shared
engine only after the complete schema is ready, including future migrations.
"""
import json
import uuid
from django.db import migrations

SUPPLIER=uuid.UUID('4f5f93da-7d4c-5d5b-b136-e9333e3726cc')
APPROVED_PRODUCTS={
    uuid.UUID('82b99cc9-2969-59f9-8b41-68b89aee6211'):'BAR-SM-BT-SPKR',
    uuid.UUID('139edecc-51b9-5231-94a8-1937a9999fbe'):'BAS-214',
    uuid.UUID('5412acc4-3888-56cf-87e1-db843820dddd'):'BAS-226',
}
TYPE_CODES=('phone','tablet','smartwatch')


def forwards(apps,schema_editor):
    alias=schema_editor.connection.alias
    Product=apps.get_model('catalog','Product')
    Type=apps.get_model('devices','DeviceType')
    Scope=apps.get_model('catalog','ProductUniversalDeviceTypeScope')
    Audit=apps.get_model('audit','AuditRecord')
    candidates=list(Product.objects.using(alias).filter(pk__in=APPROVED_PRODUCTS,vendor_company_reference=SUPPLIER))
    types=list(Type.objects.using(alias).filter(code__in=TYPE_CODES,status='active',is_active=True))
    pending=[product for product in candidates if product.sku==APPROVED_PRODUCTS[product.pk] and product.compatibility_mode=='direct_device' and not product.compatible_device_types]
    if pending and {kind.code for kind in types}!=set(TYPE_CODES):
        raise RuntimeError('Approved speaker scopes require active Phone, Tablet and Smartwatch types. Configure those canonical types, then retry migrate; no partial scope is inferred.')
    for product in pending:
        before={'mode':product.compatibility_mode,'types':product.compatible_device_types}
        Product.objects.using(alias).filter(pk=product.pk).update(compatibility_mode='universal_device_type',compatible_device_types=list(TYPE_CODES),compatibility_status='incomplete')
        for kind in types:
            Scope.objects.using(alias).update_or_create(product_id=product.pk,device_type_id=kind.pk,defaults={'is_active':True})
        Scope.objects.using(alias).filter(product_id=product.pk,is_active=True).exclude(device_type_id__in=[kind.pk for kind in types]).update(is_active=False)
        Audit.objects.using(alias).create(event_code='catalog.compatibility.approved_scope_declaration',event_description=json.dumps({'before':before,'after':{'mode':'universal_device_type','type_ids':[str(kind.pk) for kind in types]},'authority':'User explicitly confirmed these three products as Universal for Phone, Tablet and Smartwatch on 12 November 2026'}),
            status='success',company_scope_reference=product.company_scope_reference or SUPPLIER,source_module='catalog',source_record_type='Product',source_record_id=product.pk,service_trigger_reference='catalog.0033_approved_speaker_scopes')
    # Repair projections for ALL declared Universal offers, irrespective of SKU
    # or category, including pre-existing rules whose deployment omitted remap.
    for product in Product.objects.using(alias).filter(compatibility_mode='universal_device_type').iterator(chunk_size=200):
        Audit.objects.using(alias).get_or_create(
            event_code='catalog.compatibility.rebuild_requested',source_module='catalog',
            source_record_type='Product',source_record_id=product.pk,
            service_trigger_reference='catalog.0033_approved_speaker_scopes',
            defaults={'event_description':json.dumps({'reason':'Rebuild existing explicit Universal declaration after schema deployment; preserve exclusions, locks and completed history.'}),
                      'status':'success','company_scope_reference':product.company_scope_reference or product.vendor_company_reference or uuid.UUID(int=0)})


class Migration(migrations.Migration):
    dependencies=[('catalog','0032_approved_speaker_universal_scope')]
    operations=[migrations.RunPython(forwards,migrations.RunPython.noop)]
