"""Admin audit queries and mutations; canonical commands own compatibility rules."""
import json
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone as tz

from django.db import transaction
from django.db.models import Case, CharField, Exists, OuterRef, Q, Value, When
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from apps.audit.models import AuditRecord
from apps.devices.models import Device
from apps.integration.catalog_config import path_value
from apps.integration.catalog_secrets import redact
from apps.integration.models import VendorCatalogItem
from apps.tenant.models import Company
from .models import Product, ProductCompatibilityAssertion

NEW_PRODUCT_DAYS = 7

AUDIT_ORDERINGS = {'updated_at', '-updated_at', 'name', '-name', 'sku', '-sku', 'product_category', '-product_category', 'created_at', '-created_at'}

class AuditQuerySerializer(serializers.Serializer):
    vendor = serializers.UUIDField()
    brand = serializers.UUIDField(required=False)
    product_category = serializers.CharField(required=False, allow_blank=True, max_length=200)
    search = serializers.CharField(required=False, allow_blank=True, max_length=300)
    audit_status = serializers.ChoiceField(choices=['review','no_devices','no_image','ok','new'], required=False)
    ordering = serializers.CharField(required=False, max_length=50)


class DeviceMappingSerializer(serializers.Serializer):
    device_ids = serializers.ListField(child=serializers.UUIDField(), max_length=500)
    update_type = serializers.ChoiceField(choices=['replace','add','remove'], default='replace')
    exclusion_reason = serializers.CharField(required=False, max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class BulkDeviceMappingSerializer(DeviceMappingSerializer):
    product_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=50)
    update_type = serializers.ChoiceField(choices=['replace','add'], default='add')


class BulkReviewSerializer(serializers.Serializer):
    product_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=200)


def validated(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def audit_products(params):
    query = validated(AuditQuerySerializer, params)
    vendor = Company.objects.filter(pk=query['vendor'], company_type='vendor').first()
    if vendor is None:
        raise NotFound('Vendor not found.')
    qs = Product.objects.filter(vendor_company_reference=vendor.pk)
    if query.get('brand'):
        qs = qs.filter(brand_reference_id=query['brand'])
    if query.get('product_category'):
        qs = qs.filter(product_category=query['product_category'])
    if query.get('search'):
        text = query['search'].strip()
        qs = qs.filter(Q(name__icontains=text) | Q(sku__icontains=text) | Q(upc__icontains=text))
    reviewed = VendorCatalogItem.objects.filter(product_id=OuterRef('pk'),
        connection__vendor_company_id=vendor.pk, review_required=True)
    matches = ProductCompatibilityAssertion.objects.filter(product_id=OuterRef('pk'),
        is_compatible=True, is_excluded=False, device_reference__in=Device.objects.values('pk'))
    qs = qs.annotate(_audit_review=Exists(reviewed), _audit_has_device=Exists(matches)).annotate(
        _audit_status=Case(
            When(_audit_review=True, then=Value('review')),
            When(compatibility_mode='direct_device', _audit_has_device=False, then=Value('no_devices')),
            When(primary_image_reference__isnull=True, then=Value('no_image')),
            default=Value('ok'), output_field=CharField()))
    if query.get('audit_status'):
        if query['audit_status'] == 'new':
            qs = qs.filter(created_at__gte=tz.now() - timedelta(days=NEW_PRODUCT_DAYS))
        else:
            qs = qs.filter(_audit_status=query['audit_status'])
    ordering = query.get('ordering', '-updated_at')
    if ordering not in AUDIT_ORDERINGS:
        ordering = '-updated_at'
    return vendor, qs.order_by(ordering, 'id')


def source_context(products):
    from apps.integration.catalog_import import mapped_values
    ids = [product.pk for product in products]
    owners = {product.pk:product.vendor_company_reference for product in products}
    result = {}
    for source in VendorCatalogItem.objects.filter(product_id__in=ids).select_related('connection'):
        if source.connection.vendor_company_id != owners[source.product_id]:
            continue
        payload = redact(source.payload)
        fields, _ = mapped_values(payload, source.connection.config)
        result[source.product_id] = {'payload':payload, 'review_required':source.review_required,
            'review_errors':redact(source.review_errors), 'mapped_fields':fields,
            'compatibility_config':source.connection.config.get('compatibility',{})}
    return result


DERIVED_BASES = {'feature_evidence', 'universal_device_type', 'review_required'}


def explicit_selections(products):
    """(product, device) pairs that were selected model by model.

    Feature and Universal matches are results of rules, not selections; an
    editor must not send them back as explicit choices.
    """
    result = set()
    rows = ProductCompatibilityAssertion.objects.filter(product_id__in=[product.pk for product in products],
        is_compatible=True, is_excluded=False).values_list('product_id', 'device_reference', 'match_evidence', 'compatibility_basis')
    for product_id, device, evidence, basis in rows.iterator():
        explicit = evidence.get('explicit') if isinstance(evidence, dict) else None
        if (explicit.get('active') if isinstance(explicit, dict) else not evidence and basis not in DERIVED_BASES):
            result.add((product_id, str(device)))
    return result


def declared_devices(source):
    raw = source.get('mapped_fields',{}).get('compatibility_declaration',
        source.get('payload',{}).get('compatible_devices',[]))
    if isinstance(raw, str):
        return [{'name':part.strip()} for part in raw.replace(',',';').split(';') if part.strip()]
    if not isinstance(raw, list):
        return []
    config = source.get('compatibility_config',{})
    return [{'name':path_value(item,config.get('name_path','name'),''),
        'id':path_value(item,config.get('id_path','id')),
        'slug':path_value(item,config.get('slug_path','slug'))} if isinstance(item,dict)
        else {'name':item} for item in raw if isinstance(item,(dict,str))]


def record_action(product, actor, action, **details):
    return AuditRecord.objects.create(event_code='catalog.vendor_audit.'+action,
        event_description=json.dumps(redact(details),default=str), status='success',
        actor_reference=actor.pk, company_scope_reference=product.vendor_company_reference,
        source_module='catalog', source_record_type='Product', source_record_id=product.pk)


@transaction.atomic
def map_product_devices(product, actor, data):
    from .compatibility_commands import update_explicit_selections
    product = Product.objects.select_for_update().get(pk=product.pk)
    before = list(product.compatibility_assertions.filter(is_compatible=True,is_excluded=False).values_list('device_reference',flat=True))
    items = [str(identifier) for identifier in dict.fromkeys(data['device_ids'])]
    if data['update_type'] == 'remove':
        items = [{'device_id':identifier,'exclusion_reason':data.get('exclusion_reason'),
            'notes':data.get('notes','')} for identifier in items]
    update_explicit_selections(product, items, actor, update_type=data['update_type'],
        vendor_import=False, change_source='Vendor Audit')
    assertions = list(product.compatibility_assertions.all())
    after = [row.device_reference for row in assertions if row.is_compatible and not row.is_excluded]
    pending = [row.device_reference for row in assertions if row.device_reference in data['device_ids']
        and row.match_status == 'Pending' and not row.is_excluded and not row.is_locked]
    protected = [row.device_reference for row in assertions if row.device_reference in data['device_ids']
        and row.device_reference not in after and (row.is_excluded or row.is_locked)]
    if data['update_type']=='remove':
        pending, protected = [], []
    unapplied = [str(value) for value in data['device_ids'] if value not in after] if data['update_type']!='remove' else []
    if data['update_type']!='remove' and any(value not in after+pending+protected for value in data['device_ids']):
        raise ValidationError({'device_ids':'A selected model is not eligible under the current category or device lifecycle. Review its Device Catalog setup.'})
    record_action(product,actor,'devices_mapped',update_type=data['update_type'],before=before,after=after,
        requested_device_ids=data['device_ids'])
    return {'status':'ok','device_count':len(after),'requested_count':len(data['device_ids']),
        'unapplied_device_ids':unapplied,'pending_device_ids':[str(value) for value in pending],
        'protected_device_ids':[str(value) for value in protected]}


@transaction.atomic
def resolve_product_review(product, actor):
    # Match importer lock order (Source -> Product); do not also lock the joined
    # connection, which the synchronizer acquires before either of these rows.
    sources = list(VendorCatalogItem.objects.select_for_update(of=('self',)).filter(product_id=product.pk,
        connection__vendor_company_id=product.vendor_company_reference, review_required=True).order_by('pk'))
    Product.objects.select_for_update().get(pk=product.pk)
    before = [{'source_id':source.pk,'review_errors':source.review_errors} for source in sources]
    for source in sources:
        source.review_required, source.review_errors = False, []
        source.save(update_fields=['review_required','review_errors'])
    if sources:
        record_action(product,actor,'review_resolved',before=before,after={'review_required':False,'review_errors':[]})
    return len(sources)


def live_api_search(connection, query, actor):
    from apps.integration.catalog_config import validate_config, path_value
    from apps.integration.catalog_transport import fetch_json
    from apps.integration.catalog_import import mapped_values
    from apps.integration.catalog_secrets import redact, decrypt_credentials
    from apps.integration.catalog_sync import catalog_request_params, _reserve_request

    config = validate_config(connection.config)
    if 'search_param' not in config:
        from apps.integration.catalog_config import BALAJI_CONFIG
        from urllib.parse import urlsplit
        if urlsplit(connection.endpoint_url).hostname == 'shop.balajibrands.com':
            config['search_param'] = BALAJI_CONFIG.get('search_param', 'sku')
    search_param = config.get('search_param', 'search')
    params = catalog_request_params(config, limit=min(25, config['page_size']))
    params[search_param] = query
    _reserve_request(connection)
    payload = fetch_json(connection, params)
    if config.get('success_path') and path_value(payload, config['success_path']) is not True:
        return {'results': [], 'error': 'Provider reported failure'}
    items = path_value(payload, config['items_path'])
    if not isinstance(items, list):
        return {'results': [], 'error': 'Invalid response shape'}

    credential = decrypt_credentials(connection) if connection.encrypted_credentials else {}
    secrets = [str(v) for v in credential.values() if v]
    results = []
    existing_skus = set(Product.objects.filter(
        vendor_company_reference=connection.vendor_company_id
    ).values_list('sku', flat=True))
    existing_sources = set(VendorCatalogItem.objects.filter(
        connection=connection
    ).values_list('external_id', flat=True))

    for item in items[:25]:
        safe = redact(item, secrets)
        fields, _ = mapped_values(safe, config)
        sku = str(fields.get('sku', ''))
        ext_id = str(fields.get('external_id', ''))
        in_system = sku in existing_skus or ext_id in existing_sources
        results.append({
            'sku': sku,
            'external_id': ext_id,
            'name': str(fields.get('name', '')),
            'brand': str(fields.get('brand', '')),
            'category': str(fields.get('vendor_category', '')),
            'in_system': in_system,
            'payload': safe,
        })
    return {'results': results, 'query': query, 'total_returned': len(items)}


def sync_single_product(connection, payload, actor):
    from apps.integration.catalog_import import ingest_rows
    from apps.integration.models import VendorCatalogSyncRun

    run = VendorCatalogSyncRun.objects.create(
        connection=connection, requested_by=actor,
        trigger='live_search', config_version=connection.config_version)
    from apps.catalog.services import defer_buyer_projection_refresh
    with defer_buyer_projection_refresh():
        counts, deferred = ingest_rows(connection, run, [payload], actor)
    run.rows_seen = 1
    for name, value in counts.items():
        setattr(run, name, value)
    run.status = 'completed'
    from django.utils import timezone as tz
    run.completed_at = tz.now()
    run.save()
    if deferred:
        from apps.integration.catalog_sync import _process_deferred_images
        _process_deferred_images(deferred)
    return {'status': 'ok', 'created': counts.get('created_count', 0),
            'updated': counts.get('updated_count', 0),
            'review': counts.get('review_count', 0)}
