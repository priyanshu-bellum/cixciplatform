"""Atomic, scoped order acceptance; supplier/price evidence survives catalog changes."""
import hashlib
import json
from decimal import Decimal, InvalidOperation
from uuid import UUID
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from apps.tenant.models import Company, CompanyEntity
from apps.catalog.offer_services import resolve_exported_line, MappingResolutionError, build_export_resolution_index
from apps.pricing.models import EffectivePriceSnapshot
from .models import Order, RoutedSuborder, AcceptedOrderLine


class OrderReplayConflict(APIException):
    status_code = 409
    default_detail = 'This Buyer order number was already accepted with a different request.'


def buyer_scope(request, data):
    user = request.user
    if user.is_cixci_admin:
        try:
            entity = CompanyEntity.objects.select_related('company').get(pk=data.get('buyer_entity_id'),
                company_id=data.get('buyer_id'), status='active', company__company_type='buyer', company__status='active')
        except (CompanyEntity.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'buyer_entity_id':'Admin orders require an explicit active Buyer Company and Entity.'}) from None
        return entity.company, entity
    if not user.entity_id or user.entity.company.company_type != 'buyer':
        raise PermissionDenied('Only an authorized Buyer can submit a Buyer order.')
    if data.get('buyer_id') and str(data['buyer_id']) != str(user.entity.company_id):
        raise PermissionDenied('The order belongs to a different Buyer Company.')
    if data.get('buyer_entity_id') and str(data['buyer_entity_id']) != str(user.entity_id):
        raise PermissionDenied('The order belongs to a different Buyer Entity.')
    return user.entity.company, user.entity


def queue_api_supplier(suborder_id):
    from apps.integration.order_dispatch import request_supplier_dispatch
    request_supplier_dispatch(suborder_id)


@transaction.atomic
def accept_order(request, data):
    company, entity = buyer_scope(request, data)
    # Same-Company replays serialize before any child/PO/handoff is written.
    Company.objects.select_for_update().get(pk=company.pk)
    from apps.integration.models import BuyerStorefront
    from apps.integration.storefront_api import request_storefront
    if request.user.is_cixci_admin:
        scope_id = data.get('integration_scope_id')
        storefront = BuyerStorefront.objects.filter(pk=scope_id, company=company, entity=entity, is_active=True).first() if scope_id else None
        if scope_id and storefront is None:
            raise ValidationError({'integration_scope_id':'Storefront does not match the selected Buyer Entity.'})
    else:
        storefront = request_storefront(request, required=True)
    number = data.get('buyer_order_number', '')
    if not isinstance(number, str) or not number.strip() or len(number) > 200:
        raise ValidationError({'buyer_order_number':'Supply the Buyer order number, at most 200 characters.'})
    number = number.strip()
    key = hashlib.sha256(f'{company.pk}:{entity.pk}:{getattr(storefront,"pk",None)}:{number}'.encode()).hexdigest()
    digest = hashlib.sha256(json.dumps(data, default=str, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    previous = Order.objects.filter(acceptance_key=key).first()
    if previous:
        if previous.acceptance_hash != digest:
            raise OrderReplayConflict()
        return previous
    lines = data.get('order_lines') or [{field:data[field] for field in ('sku','upc','vendor_id','product_name','vendor_color','quantity','export_mapping_id','external_listing_id','external_variant_id') if field in data}]
    if not isinstance(lines,list) or not 1 <= len(lines) <= 500:
        raise ValidationError({'order_lines':'Supply between 1 and 500 order lines.'})
    accepted, errors, references = [], [], set()
    purchased_at = data.get('order_date_time')
    try:
        resolution = build_export_resolution_index(company_id=company.pk, entity_id=entity.pk, storefront=storefront, lines=lines)
    except MappingResolutionError as error:
        raise ValidationError({'order_lines':[{'line_reference':error.line_reference,'code':error.code,'detail':error.detail}]}) from None
    snapshots = {value.pk:value for value in EffectivePriceSnapshot.objects.filter(
        pk__in={mapping.pricing_snapshot_reference for mapping in resolution['id'].values() if mapping.pricing_snapshot_reference},
        pricing_profile__buyer_company_reference=company.pk, bindability_status='order_bindable').select_related('pricing_profile')}
    for index, raw in enumerate(lines):
        line = dict(raw)
        ref = str(line.get('line_reference') or line.get('line_ref') or index + 1)
        line['line_reference'] = ref
        if not ref.strip() or len(ref)>100 or ref in references:
            errors.append({'line_reference':ref, 'code':'ORDER_LINE_REFERENCE_INVALID', 'detail':'Line references must be unique and at most 100 characters.'}); continue
        references.add(ref)
        try:
            raw_qty = line.get('quantity', 1)
            qty = Decimal(str(raw_qty))
            if isinstance(raw_qty,bool) or not qty.is_finite() or qty != qty.to_integral_value() or not 1 <= qty <= 2147483647:
                raise ValueError()
            mapping = resolve_exported_line(company_id=company.pk, entity_id=entity.pk, storefront=storefront, line=line, purchased_at=purchased_at, index=resolution)
            snapshot = snapshots.get(mapping.pricing_snapshot_reference)
            if snapshot is None or snapshot.product_reference != mapping.product_id or snapshot.pricing_profile.vendor_company_reference != mapping.supplier_reference:
                raise MappingResolutionError('PRICING_SNAPSHOT_REQUIRED', ref, 'Approved matching Pricing evidence is required.')
            if line.get('unit_price_snapshot') is not None and Decimal(str(line['unit_price_snapshot'])) != snapshot.buyer_facing_price:
                raise MappingResolutionError('ORDER_PRICE_MISMATCH', ref, 'Buyer price does not match the exported price snapshot.')
            if line.get('currency') and line['currency'] != snapshot.currency:
                raise MappingResolutionError('ORDER_CURRENCY_MISMATCH', ref, 'Order currency does not match the export.')
            accepted.append((line, mapping, snapshot, int(qty)))
        except MappingResolutionError as error:
            errors.append({'line_reference':ref, 'code':error.code, 'detail':error.detail})
        except (InvalidOperation, ValueError, TypeError):
            errors.append({'line_reference':ref, 'code':'ORDER_QUANTITY_OR_PRICE_INVALID', 'detail':'Supply an integer positive quantity and valid price.'})
    if errors:
        raise ValidationError({'order_lines':errors})
    if len({snapshot.currency for _,_,snapshot,_ in accepted}) > 1:
        raise ValidationError({'order_lines':[{'code':'ORDER_CURRENCY_MIXED', 'detail':'A parent order must use one declared Pricing currency.'}]})
    vendors = {vendor.pk:vendor for vendor in Company.objects.filter(pk__in={mapping.supplier_reference for _,mapping,_,_ in accepted}, company_type='vendor', status='active')}
    if len(vendors) != len({mapping.supplier_reference for _,mapping,_,_ in accepted}):
        raise ValidationError({'order_lines':[{'line_reference':line['line_reference'],'code':'SUPPLIER_UNAVAILABLE','detail':'An accepted supplier is not active.'}
            for line,mapping,_,_ in accepted if mapping.supplier_reference not in vendors]})
    from apps.tenant.regional_visibility import filter_buyer_regional_products
    from apps.catalog.models import Product
    from apps.catalog.source_visibility import eligible_vendor_sources
    candidates = eligible_vendor_sources(Product.objects.filter(pk__in=[mapping.product_id for _,mapping,_,_ in accepted], status='active', selling_status='for_sale'))
    from django.conf import settings
    if getattr(settings, 'MEDIA_READINESS_ENFORCE_BUYER', True):
        from apps.media.models import MediaAsset
        candidates = candidates.filter(primary_image_reference__in=MediaAsset.objects.filter(status='ready', mime_type='image/png',
            has_transparency=True, review_status='approved').values_list('pk',flat=True))
    allowed = set(filter_buyer_regional_products(candidates, company.pk, entity.pk).values_list('pk',flat=True))
    if any(mapping.product_id not in allowed for _,mapping,_,_ in accepted):
        raise ValidationError({'order_lines':[{'line_reference':line['line_reference'],'code':'OFFER_NOT_ORDERABLE','detail':'An offer is inactive, held, media-incomplete or not eligible in this Buyer Entity region.'}
            for line,mapping,_,_ in accepted if mapping.product_id not in allowed]})
    order = Order.objects.create(company_scope_reference=company.pk, buyer_reference=request.user.pk, buyer_entity_reference=entity.pk,
        storefront=storefront, buyer_order_number_reference=number, acceptance_key=key, acceptance_hash=digest, mapping_contract_version=1,
        status='placed', placed_at=purchased_at or timezone.now(),
        pricing_snapshot_references={str(mapping.product_id):str(snapshot.pk) for _,mapping,snapshot,_ in accepted})
    raw = request.data if isinstance(request.data,dict) else {}
    aliases = {'first_name':['first_name','customer_first_name'], 'last_name':['last_name','customer_last_name'],
        'email':['email','customer_email'], 'address1':['address1','address_1','shipping_address_line1'],
        'address2':['address2','address_2','shipping_address_line2'], 'city':['city','shipping_city'],
        'state':['state','shipping_state'], 'zip_code':['zip_code','zip','shipping_postal_code']}
    shipping = {name:next((data.get(key) or raw.get(key) for key in keys if data.get(key) or raw.get(key)), '') for name,keys in aliases.items()}
    shipping['country'] = raw.get('country_code') or raw.get('country') or 'US'
    grouped = {}
    for entry in accepted:
        grouped.setdefault(entry[1].supplier_reference, []).append(entry)
    from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
    from apps.fulfillment.models import FulfillmentHandoff
    for supplier, entries in grouped.items():
        source_lines = []
        for line,mapping,snapshot,qty in entries:
            product = mapping.product
            source_lines.append({'line_reference':line['line_reference'], 'export_mapping_id':str(mapping.pk), 'mapping_version':mapping.version,
                'product_reference':str(product.pk), 'vendor_id':str(supplier), 'vendor_name':vendors[supplier].name,
                'sku':product.sku, 'upc':product.upc, 'product_name':product.name, 'vendor_color':product.color,
                'quantity':qty, 'unit_price_snapshot':str(snapshot.buyer_facing_price), 'vendor_unit_price_snapshot':str(snapshot.vendor_wholesale_price),
                'line_total':str(snapshot.buyer_facing_price * qty), 'currency':snapshot.currency, 'pricing_snapshot_reference':str(snapshot.pk)})
        sub = RoutedSuborder.objects.create(order=order, vendor_company_reference=supplier, status='placed', routing_snapshot={
            'buyer_order_number':number, 'buyer_id':str(company.pk), 'order_date_time':order.placed_at.isoformat(),
            'customer_shipping':shipping, 'order_lines':source_lines, 'po_number':'CX-' + str(order.pk) + '-' + str(supplier)[:8]})
        po = PurchaseOrder.objects.create(company_scope_reference=company.pk, buyer_reference=request.user.pk, vendor_company_reference=supplier,
            status='approved', po_number=sub.routing_snapshot['po_number'], currency=entries[0][2].currency,
            total_amount=sum(snapshot.buyer_facing_price * qty for _,_,snapshot,qty in entries), approved_at=order.placed_at)
        purchase_lines, immutable_lines = [], []
        for entry,source in zip(entries,source_lines):
            _,mapping,snapshot,qty = entry
            purchase_lines.append(PurchaseOrderLine(purchase_order=po, product_reference=mapping.product_id, quantity=qty,
                unit_price_snapshot=snapshot.buyer_facing_price, msrp_snapshot=mapping.product.msrp, line_total=snapshot.buyer_facing_price*qty))
            evidence = AcceptedOrderLine(order=order, suborder=sub, mapping=mapping, product_reference=mapping.product_id,
                supplier_reference=supplier, line_reference=source['line_reference'], quantity=qty,
                pricing_snapshot_reference=snapshot.pk, unit_price_snapshot=snapshot.buyer_facing_price,
                vendor_unit_price_snapshot=snapshot.vendor_wholesale_price, currency=snapshot.currency, source_snapshot=source)
            evidence.clean(); immutable_lines.append(evidence)
        PurchaseOrderLine.objects.bulk_create(purchase_lines)
        AcceptedOrderLine.objects.bulk_create(immutable_lines)
        FulfillmentHandoff.objects.create(routed_suborder_reference=sub.pk, vendor_company_reference=supplier,
            company_scope_reference=company.pk, status='received')
        from apps.integration.catalog_config import saved_integration_mode
        if saved_integration_mode(vendors[supplier]) == 'api':
            transaction.on_commit(lambda sub_id=sub.pk: queue_api_supplier(sub_id))
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code='routing.order.mapping_accepted', actor_reference=request.user.pk,
        company_scope_reference=company.pk, source_module='routing', source_record_type='Order', source_record_id=order.pk,
        event_description=json.dumps({'entity_id':str(entity.pk), 'storefront_id':str(storefront.pk) if storefront else None,
            'lines':[{'line_reference':line['line_reference'], 'mapping_id':str(mapping.pk), 'supplier_id':str(mapping.supplier_reference),
                      'pricing_snapshot_id':str(snapshot.pk), 'quantity':qty} for line,mapping,snapshot,qty in accepted]}))
    return order
