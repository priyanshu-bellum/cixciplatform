"""Link unambiguous approved labels without inferring supplier ownership."""
import json
import uuid
from django.db import migrations


def forwards(apps, schema_editor):
    Config = apps.get_model('catalog', 'DynamicDropdownConfig')
    Brand = apps.get_model('catalog', 'Brand')
    Product = apps.get_model('catalog', 'Product')
    Audit = apps.get_model('audit', 'AuditRecord')
    labels = {}
    for value in Config.objects.filter(field_name='brand', status='active').values_list('value', flat=True):
        normalized = ' '.join(value.split())
        if normalized:
            labels.setdefault(normalized.casefold(), set()).add(normalized)
    for key, candidates in labels.items():
        if len(candidates) != 1:
            continue
        label = next(iter(candidates))
        brand, _ = Brand.objects.get_or_create(canonical_key=key, defaults={'name': label})
        count = Product.objects.filter(brand__iexact=label, brand_reference__isnull=True).update(brand_reference=brand)
        if count:
            Audit.objects.create(event_code='catalog.brand.backfilled',
                event_description=json.dumps({'brand_id': str(brand.pk), 'linked_products': count, 'supplier_relationships': 'not_inferred'}),
                status='success', company_scope_reference=uuid.UUID(int=0), source_module='catalog',
                source_record_type='Brand', source_record_id=brand.pk, service_trigger_reference='catalog.0035_backfill_approved_brands')


class Migration(migrations.Migration):
    dependencies = [('catalog', '0034_brand_vendorbrandrelationship_and_more'), ('audit', '0001_initial')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
