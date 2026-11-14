"""Create versioned selections and resolve only authorized exported offers."""
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.tenant.models import CompanyEntity
from apps.integration.models import BuyerStorefront
from .models import BuyerExportMapping, Product


def selection_audit(event, mapping, actor=None, **details):
    import json
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code='catalog.export_mapping.' + event, actor_reference=getattr(actor, 'pk', None),
        company_scope_reference=mapping.company_id, source_module='catalog', source_record_type='BuyerExportMapping',
        source_record_id=mapping.pk, event_description=json.dumps({'entity_id': str(mapping.entity_id),
            'storefront_id': str(mapping.storefront_id) if mapping.storefront_id else None, 'product_id': str(mapping.product_id),
            'supplier_id': str(mapping.supplier_reference), 'version': mapping.version, **details}, default=str))


@transaction.atomic
def freeze_export_selection(*, product, company, entity, storefront=None, job=None, actor=None,
                            listing_reference='', external_listing_id=None, external_variant_id=None, replaces_mapping_id=None):
    if storefront:
        storefront = BuyerStorefront.objects.select_for_update().get(pk=storefront.pk)
        if not storefront.is_active or storefront.company_id != company.pk or storefront.entity_id != entity.pk:
            raise ValidationError('Select an active storefront in this Buyer Entity.')
    else:
        # Serialize legacy selections without inventing a storefront.
        CompanyEntity.objects.select_for_update().get(pk=entity.pk)
    if not listing_reference:
        listing_reference = 'product:' + str(product.pk)
    if storefront and (external_listing_id or external_variant_id):
        active = BuyerExportMapping.objects.filter(storefront=storefront, status='active')
        collision = (active.filter(external_variant_id=external_variant_id) if external_variant_id else
                     active.filter(external_listing_id=external_listing_id, external_variant_id='')).first()
        if collision and (collision.product_id != product.pk or collision.listing_reference != listing_reference):
            if str(replaces_mapping_id) != str(collision.pk):
                raise ValidationError({'code':'LISTING_SUPPLIER_CHANGE_REQUIRES_CONFIRMATION',
                    'current_mapping_id':str(collision.pk), 'detail':'Explicitly identify the active mapping being replaced.'})
            listing_reference = collision.listing_reference
    if job:
        existing = BuyerExportMapping.objects.filter(export_job=job, product=product, listing_reference=listing_reference).first()
        if existing:
            return existing
    history = BuyerExportMapping.objects.filter(company=company, entity=entity, storefront=storefront, listing_reference=listing_reference)
    previous = history.order_by('-version').first()
    if replaces_mapping_id and (not previous or str(previous.pk) != str(replaces_mapping_id)):
        raise ValidationError({'code':'EXPORT_MAPPING_STALE', 'detail':'The active mapping changed. Reload before replacing it.'})
    external_listing_id = external_listing_id if external_listing_id is not None else (previous.external_listing_id if previous else '')
    external_variant_id = external_variant_id if external_variant_id is not None else (previous.external_variant_id if previous else '')
    product = Product.objects.select_for_update().get(pk=product.pk)
    snapshot = None
    from apps.tenant.models import Company
    vendor_exists = Company.objects.filter(pk=product.vendor_company_reference, company_type='vendor').exists()
    if vendor_exists and product.vendor_wholesale_price_amount is not None and product.msrp is not None:
        from apps.pricing.services import create_effective_price_snapshot
        snapshot = create_effective_price_snapshot(product, company, 'cixci_e_commerce')
    now = timezone.now()
    if previous and previous.status in ('active', 'review_required'):
        previous.status, previous.superseded_at = 'superseded', now
        previous.save(update_fields=['status', 'superseded_at'])
    mapping = BuyerExportMapping.objects.create(company=company, entity=entity, storefront=storefront, product=product,
        supplier_reference=product.vendor_company_reference, export_job=job, listing_reference=listing_reference,
        external_listing_id=external_listing_id, external_variant_id=external_variant_id, version=previous.version + 1 if previous else 1,
        status='active' if snapshot and snapshot.bindability_status == 'order_bindable' else 'review_required',
        pricing_snapshot_reference=snapshot.pk if snapshot else None, exported_at=now,
        migration_evidence={} if snapshot else {'reason': 'PRICING_OR_SUPPLIER_SETUP_REQUIRED'})
    selection_audit('created', mapping, actor, previous_mapping_id=str(previous.pk) if previous else None)
    return mapping


def mapping_reference(mapping):
    return {'export_mapping_id': str(mapping.pk), 'supplier_id': str(mapping.supplier_reference),
        'mapping_version': mapping.version, 'mapping_status': mapping.status,
        'integration_scope_id': str(mapping.storefront_id) if mapping.storefront_id else None}


class MappingResolutionError(ValueError):
    def __init__(self, code, line_reference, detail):
        self.code, self.line_reference, self.detail = code, line_reference, detail
        super().__init__(detail)


def build_export_resolution_index(*, company_id, entity_id, storefront, lines):
    from uuid import UUID
    from django.db.models import Q
    identifiers, skus, upcs, listings, variants = set(), set(), set(), set(), set()
    for line in lines:
        value = line.get('export_mapping_id') or line.get('mapping_id')
        if value:
            try:
                identifiers.add(UUID(str(value)))
            except (ValueError, TypeError):
                pass
        for field, target in [('sku',skus), ('upc',upcs), ('external_listing_id',listings), ('external_variant_id',variants)]:
            if isinstance(line.get(field),str) and line[field].strip():
                target.add(line[field].strip())
    query = BuyerExportMapping.objects.filter(company_id=company_id, entity_id=entity_id, storefront=storefront).filter(
        Q(pk__in=identifiers) | Q(product__sku__in=skus) | Q(product__upc__in=upcs)
        | Q(external_listing_id__in=listings) | Q(external_variant_id__in=variants)).select_related('product')
    rows = list(query[:2001])
    if len(rows)>2000:
        raise MappingResolutionError('EXPORT_SELECTION_TOO_BROAD', '', 'Use explicit mapping IDs to narrow this order selection.')
    index = {'id':{}, 'sku':{}, 'upc':{}, 'listing':{}, 'variant':{}}
    for mapping in rows:
        index['id'][str(mapping.pk)] = mapping
        for key,value in [('sku',mapping.product.sku),('upc',mapping.product.upc),('listing',mapping.external_listing_id),('variant',mapping.external_variant_id)]:
            if value:
                index[key].setdefault(value,[]).append(mapping)
    return index


def resolve_exported_line(*, company_id, entity_id, storefront, line, purchased_at=None, index=None):
    """No global SKU/UPC lookup. A client vendor_id is a consistency check only."""
    ref = str(line.get('line_reference') or line.get('line_ref') or '')
    def fail(code, detail):
        raise MappingResolutionError(code, ref, detail)
    scope = BuyerExportMapping.objects.filter(company_id=company_id, entity_id=entity_id, storefront=storefront).select_related('product')
    mapping_id = line.get('export_mapping_id') or line.get('mapping_id')
    if index is not None:
        if mapping_id:
            from uuid import UUID
            try:
                mapping = index['id'].get(str(UUID(str(mapping_id))))
            except (ValueError,TypeError):
                mapping = None
            if not mapping:
                fail('EXPORT_MAPPING_UNAUTHORIZED', 'Mapping is unavailable in this Buyer Entity and storefront.')
        else:
            listing, variant = line.get('external_listing_id'), line.get('external_variant_id')
            if listing or variant:
                if not storefront:
                    fail('INTEGRATION_SCOPE_REQUIRED', 'Select the storefront for external listing references.')
                candidates = index['variant'].get(str(variant),[]) if variant else index['listing'].get(str(listing),[])
                matches = [value for value in candidates if (not listing or value.external_listing_id == str(listing))
                    and (value.status == 'active' if purchased_at is None else value.exported_at <= purchased_at
                         and (value.superseded_at is None or value.superseded_at > purchased_at))]
            else:
                key = 'sku' if line.get('sku') else 'upc'
                matches = [value for value in index[key].get(str(line.get(key) or '').strip(),[]) if value.status == 'active']
            if len(matches)!=1:
                fail('EXPORT_MAPPING_AMBIGUOUS' if matches else 'EXPORT_MAPPING_REQUIRED', 'No single authorized export selection resolves this line.')
            mapping = matches[0]
    elif mapping_id:
        from uuid import UUID
        try:
            mapping = scope.filter(pk=UUID(str(mapping_id))).first()
        except (ValueError, TypeError):
            mapping = None
        if mapping is None:
            fail('EXPORT_MAPPING_UNAUTHORIZED', 'Mapping is unavailable in this Buyer Entity and storefront.')
    else:
        listing = line.get('external_listing_id')
        variant = line.get('external_variant_id')
        if listing or variant:
            if not storefront:
                fail('INTEGRATION_SCOPE_REQUIRED', 'Select the storefront for external listing references.')
            if listing:
                scope = scope.filter(external_listing_id=str(listing))
            if variant:
                scope = scope.filter(external_variant_id=str(variant))
            if purchased_at:
                from django.db.models import Q
                scope = scope.filter(exported_at__lte=purchased_at).filter(Q(superseded_at__isnull=True) | Q(superseded_at__gt=purchased_at))
            else:
                scope = scope.filter(status='active')
        else:
            # Transitional SKU input is constrained to confirmed Buyer exports.
            scope = scope.filter(status='active')
            if line.get('sku'):
                scope = scope.filter(product__sku=str(line['sku']).strip())
            elif line.get('upc'):
                scope = scope.filter(product__upc=str(line['upc']).strip())
            else:
                fail('EXPORT_MAPPING_REQUIRED', 'Supply an export_mapping_id or a bound listing reference.')
        matches = list(scope.order_by('-version')[:2])
        if len(matches) != 1:
            fail('EXPORT_MAPPING_AMBIGUOUS' if matches else 'EXPORT_MAPPING_REQUIRED', 'No single authorized export selection resolves this line.')
        mapping = matches[0]
    if mapping.status == 'superseded':
        if not purchased_at or purchased_at < mapping.exported_at or not mapping.superseded_at or purchased_at >= mapping.superseded_at:
            fail('EXPORT_MAPPING_VERSION_MISMATCH', 'Use the mapping version associated with the purchase time.')
    elif mapping.status != 'active':
        fail('EXPORT_MAPPING_REVIEW_REQUIRED', 'This export selection needs approved supplier/pricing setup.')
    elif purchased_at and purchased_at < mapping.exported_at:
        fail('EXPORT_MAPPING_VERSION_MISMATCH', 'The selection was exported after the purchase.')
    if mapping.product.vendor_company_reference != mapping.supplier_reference:
        fail('SUPPLIER_MAPPING_INCONSISTENT', 'Stored Product ownership no longer agrees with the selection.')
    checks = [('vendor_id', mapping.supplier_reference), ('supplier_id', mapping.supplier_reference), ('product_id', mapping.product_id),
              ('sku', mapping.product.sku), ('upc', mapping.product.upc)]
    if any(line.get(field) not in (None, '') and str(line[field]).strip() != str(value) for field, value in checks):
        fail('ORDER_LINE_MAPPING_MISMATCH', 'The line supplier, Product or SKU/UPC conflicts with its exported selection.')
    return mapping
