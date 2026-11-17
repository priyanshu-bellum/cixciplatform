"""Webhook event handlers — update dispatch status and fulfillment tracking."""
from django.db import transaction, IntegrityError
from django.utils import timezone
from .commerce_models import (
    SupplierOrderDispatch, VendorCommerceProfile,
    VendorFinanceRecord, VendorReturnRecord,
)
from .catalog_config import path_value
from .catalog_sync import audit


def handle_order_event(event_type, record, profile, receipt):
    if not isinstance(record, dict):
        return
    config = profile.config
    orders_cfg = config.get('orders', {})

    po_number = path_value(record, orders_cfg.get('po_path', 'po_number'))
    external_id = path_value(record, orders_cfg.get('external_order_path', 'order_number'))
    raw_status = path_value(record, orders_cfg.get('status_path', 'status'))
    updated_at = path_value(record, orders_cfg.get('updated_at_path', 'updated_at'))

    if not po_number and not external_id:
        receipt.error_code = 'MISSING_ORDER_IDENTIFIER'
        return

    dispatch = _resolve_dispatch(profile, po_number, external_id)
    if not dispatch:
        receipt.error_code = 'DISPATCH_NOT_FOUND'
        return

    status_map = orders_cfg.get('status_map', {})
    normalized = status_map.get(str(raw_status), '') if raw_status else ''

    with transaction.atomic():
        current = SupplierOrderDispatch.objects.select_for_update().get(pk=dispatch.pk)
        if current.status in ('failed', 'configuration_required', 'preview_ready'):
            return

        changed = False
        if normalized and normalized != current.provider_status:
            current.provider_status = str(raw_status)[:100]
            if normalized in ('shipped', 'delivered', 'cancelled', 'processing', 'partially_shipped'):
                current.status = normalized
            changed = True

        if external_id and not current.external_order_id:
            current.external_order_id = str(external_id)[:200]
            changed = True

        if updated_at:
            try:
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(str(updated_at))
                if parsed:
                    current.provider_updated_at = parsed
                    changed = True
            except (ValueError, TypeError):
                pass

        if changed:
            current.updated_at = timezone.now()
            current.save()
            _fire_outbound_event(
                profile.vendor_company_id, 'order.status_changed',
                {'dispatch_id': str(current.pk), 'po_number': current.po_number,
                 'status': normalized, 'provider_status': str(raw_status)[:100],
                 'external_order_id': current.external_order_id},
                source_id=f'order_status:{current.pk}:{normalized}')

        audit('webhook_order_update', profile.connection, profile.updated_by,
              dispatch_id=str(current.pk), event_type=event_type,
              provider_status=str(raw_status)[:100], normalized=normalized,
              receipt_id=str(receipt.pk))


def handle_shipment_event(event_type, record, profile, receipt):
    if not isinstance(record, dict):
        return
    config = profile.config
    ship_cfg = config.get('shipments', {})

    po_number = path_value(record, ship_cfg.get('po_path', 'po_number'))
    external_order = path_value(record, ship_cfg.get('external_order_path', 'order_number'))
    shipment_id = path_value(record, ship_cfg.get('id_path', 'shipment_number'))
    raw_status = path_value(record, ship_cfg.get('status_path', 'status'))
    shipped_at = path_value(record, ship_cfg.get('shipped_at_path', 'ship_date'))
    delivered_at = path_value(record, ship_cfg.get('delivered_at_path', 'delivered_date'))

    tracking_data = path_value(record, ship_cfg.get('tracking_path', 'tracking')) or {}
    tracking_number = path_value(tracking_data, ship_cfg.get('tracking_number_path', 'number')) if isinstance(tracking_data, dict) else None
    carrier = path_value(tracking_data, ship_cfg.get('carrier_path', 'carrier')) if isinstance(tracking_data, dict) else None
    tracking_url = path_value(tracking_data, ship_cfg.get('tracking_url_path', 'url')) if isinstance(tracking_data, dict) else None

    dispatch = _resolve_dispatch(profile, po_number, external_order)
    if not dispatch:
        receipt.error_code = 'DISPATCH_NOT_FOUND'
        return

    status_map = ship_cfg.get('status_map', {})
    normalized = status_map.get(str(raw_status), '') if raw_status else ''

    with transaction.atomic():
        from apps.fulfillment.models import FulfillmentHandoff
        handoff = FulfillmentHandoff.objects.select_for_update().filter(
            routed_suborder_reference=dispatch.suborder_id
        ).first()
        if not handoff:
            receipt.error_code = 'HANDOFF_NOT_FOUND'
            return

        changed = False

        if tracking_number and tracking_number != handoff.tracking_number:
            handoff.tracking_number = str(tracking_number)[:255]
            changed = True
        if carrier and carrier != handoff.shipping_carrier:
            handoff.shipping_carrier = str(carrier)[:255]
            changed = True
        if external_order and not handoff.vendor_order_number:
            handoff.vendor_order_number = str(external_order)[:255]
            changed = True

        if shipped_at and not handoff.shipped_date:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                d = parse_date(str(shipped_at)) if len(str(shipped_at)) <= 10 else None
                if not d:
                    dt = parse_datetime(str(shipped_at))
                    d = dt.date() if dt else None
                if d:
                    handoff.shipped_date = d
                    changed = True
            except (ValueError, TypeError):
                pass

        if delivered_at and not handoff.delivered_date:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                d = parse_date(str(delivered_at)) if len(str(delivered_at)) <= 10 else None
                if not d:
                    dt = parse_datetime(str(delivered_at))
                    d = dt.date() if dt else None
                if d:
                    handoff.delivered_date = d
                    changed = True
            except (ValueError, TypeError):
                pass

        if normalized == 'shipped' and handoff.status in ('received', 'processing'):
            handoff.status = 'shipped'
            changed = True
        elif normalized == 'delivered' and handoff.status in ('received', 'processing', 'shipped'):
            handoff.status = 'delivered'
            changed = True
        elif normalized == 'exception':
            handoff.status = 'exception'
            changed = True

        if not handoff.tracking_source:
            handoff.tracking_source = "vendor_api"
            changed = True

        if changed:
            handoff.save()

        current_dispatch = SupplierOrderDispatch.objects.select_for_update().get(pk=dispatch.pk)
        if normalized in ('shipped', 'delivered') and current_dispatch.status not in ('shipped', 'delivered', 'failed'):
            current_dispatch.status = normalized
            current_dispatch.provider_updated_at = timezone.now()
            current_dispatch.save()

        audit('webhook_shipment_update', profile.connection, profile.updated_by,
              dispatch_id=str(dispatch.pk), shipment_id=str(shipment_id)[:200],
              event_type=event_type, tracking_number=str(tracking_number or '')[:100],
              carrier=str(carrier or '')[:100], normalized=normalized,
              receipt_id=str(receipt.pk))

        if changed:
            outbound_type = 'shipment.delivered' if normalized == 'delivered' else 'shipment.updated'
            _fire_outbound_event(
                profile.vendor_company_id, outbound_type,
                {'dispatch_id': str(dispatch.pk), 'po_number': dispatch.po_number,
                 'shipment_id': str(shipment_id)[:200], 'status': normalized,
                 'tracking_number': str(tracking_number or '')[:100],
                 'carrier': str(carrier or '')[:100]},
                source_id=f'shipment:{dispatch.pk}:{shipment_id}:{normalized}')

        if normalized == 'delivered':
            _check_parent_completeness(handoff, dispatch)

    if tracking_url and handoff:
        _store_tracking_url(handoff, str(tracking_url)[:1000])


def handle_finance_event(event_type, record_type, record, profile, receipt):
    """Handle invoice.created, invoice.paid, credit_memo.created, payment.applied."""
    if not isinstance(record, dict):
        return
    external_id = str(record.get('id', ''))
    if not external_id:
        receipt.error_code = 'MISSING_FINANCE_ID'
        return

    defaults = {
        'vendor_company': profile.vendor_company,
        'external_number': str(record.get('invoice_number') or record.get('number', ''))[:200],
        'status': str(record.get('status', ''))[:50],
        'total_cents': int(record.get('total_cents', 0) or 0),
        'amount_due_cents': int(record.get('amount_due_cents') or record.get('amount_remaining_cents') or 0),
        'currency': str(record.get('currency', 'USD'))[:3],
        'po_number': str(record.get('po_number', ''))[:150],
        'pdf_url': str(record.get('pdf_url', ''))[:1000],
        'raw_data': record,
        'source': 'webhook',
    }
    for date_field in ('issued_on', 'due_on'):
        raw = record.get(date_field)
        if raw:
            try:
                from django.utils.dateparse import parse_date
                defaults[date_field] = parse_date(str(raw)[:10])
            except (ValueError, TypeError):
                pass

    for applied in record.get('applied_to', []):
        if isinstance(applied, dict) and applied.get('invoice_number') and not defaults['po_number']:
            defaults['po_number'] = str(applied.get('po_number', ''))[:150]

    try:
        obj, created = VendorFinanceRecord.objects.update_or_create(
            profile=profile, record_type=record_type, external_id=external_id[:200],
            defaults=defaults,
        )
    except IntegrityError:
        receipt.error_code = 'FINANCE_RECORD_CONFLICT'
        return

    audit(f'webhook_{record_type}_{event_type.split(".")[-1]}', profile.connection, profile.updated_by,
          finance_record_id=str(obj.pk), external_id=external_id[:100],
          record_type=record_type, receipt_id=str(receipt.pk))


def handle_return_event(event_type, record, profile, receipt):
    """Handle return.created, return.updated."""
    if not isinstance(record, dict):
        return
    external_id = str(record.get('id', ''))
    if not external_id:
        receipt.error_code = 'MISSING_RETURN_ID'
        return

    defaults = {
        'vendor_company': profile.vendor_company,
        'status': str(record.get('status', ''))[:50],
        'source_order_number': str(record.get('source_order', {}).get('order_number', '') if isinstance(record.get('source_order'), dict) else record.get('source_order', ''))[:200],
        'po_number': str(record.get('source_order', {}).get('po_number', '') if isinstance(record.get('source_order'), dict) else record.get('po_number', ''))[:150],
        'total_cents': int(record.get('total_cents', 0) or 0),
        'currency': str(record.get('currency', 'USD'))[:3],
        'credit_memo_id': str(record.get('credit_memo', {}).get('id', '') if isinstance(record.get('credit_memo'), dict) else record.get('credit_memo', ''))[:200],
        'raw_data': record,
        'source': 'webhook',
    }

    try:
        obj, created = VendorReturnRecord.objects.update_or_create(
            profile=profile, external_id=external_id[:200],
            defaults=defaults,
        )
    except IntegrityError:
        receipt.error_code = 'RETURN_RECORD_CONFLICT'
        return

    if defaults['po_number']:
        dispatch = _resolve_dispatch(profile, defaults['po_number'], defaults['source_order_number'])
        if dispatch:
            _fire_outbound_event(
                profile.vendor_company_id, f'return.{event_type.split(".")[-1]}',
                {'dispatch_id': str(dispatch.pk), 'po_number': dispatch.po_number,
                 'return_id': external_id[:100], 'status': defaults['status']},
                source_id=f'return:{dispatch.pk}:{external_id}')

    audit(f'webhook_return_{event_type.split(".")[-1]}', profile.connection, profile.updated_by,
          return_record_id=str(obj.pk), external_id=external_id[:100],
          receipt_id=str(receipt.pk))


def handle_inventory_event(event_type, record, profile, receipt):
    """Handle item.stock_changed, item.eta_changed — update Product inventory_level."""
    if not isinstance(record, dict):
        return
    sku = str(record.get('sku', ''))
    if not sku:
        receipt.error_code = 'MISSING_ITEM_SKU'
        return

    from apps.integration.models import VendorCatalogItem
    source_item = VendorCatalogItem.objects.filter(
        connection__vendor_company=profile.vendor_company,
        external_id=sku,
    ).select_related('product').first()

    if not source_item:
        source_item = VendorCatalogItem.objects.filter(
            connection__vendor_company=profile.vendor_company,
            payload__sku=sku,
        ).select_related('product').first()

    if not source_item or not source_item.product:
        receipt.error_code = 'ITEM_NOT_FOUND'
        return

    product = source_item.product
    changed = False

    if event_type == 'item.stock_changed':
        new_stock = record.get('stock_on_hand')
        if new_stock is not None:
            try:
                product.inventory_level = int(new_stock)
                changed = True
            except (ValueError, TypeError):
                pass

    if event_type == 'item.eta_changed':
        new_eta = record.get('eta')
        if new_eta and hasattr(product, 'eta'):
            product.eta = str(new_eta)[:100]
            changed = True

    if changed:
        product.save()

    audit(f'webhook_{event_type.replace(".", "_")}', profile.connection, profile.updated_by,
          product_id=str(product.pk), sku=sku[:100],
          receipt_id=str(receipt.pk))


def _resolve_dispatch(profile, po_number, external_order_id):
    qs = SupplierOrderDispatch.objects.filter(
        vendor_company=profile.vendor_company
    )
    if po_number:
        dispatch = qs.filter(po_number=str(po_number)[:150]).first()
        if dispatch:
            return dispatch
    if external_order_id:
        dispatch = qs.filter(external_order_id=str(external_order_id)[:200]).first()
        if dispatch:
            return dispatch
    return None


def _check_parent_completeness(handoff, dispatch):
    from apps.fulfillment.models import FulfillmentHandoff, BuyerUpdateReadySignal
    from django.db.models import Count, Q
    from apps.routing.models import Order
    suborder = dispatch.suborder
    order = suborder.order

    sub_ids = list(order.routed_suborders.values_list('pk', flat=True))
    stats = FulfillmentHandoff.objects.filter(
        routed_suborder_reference__in=sub_ids
    ).aggregate(
        total=Count('id'),
        delivered=Count('id', filter=Q(status='delivered')),
        shipped_or_delivered=Count('id', filter=Q(status__in=('shipped', 'delivered'))),
    )
    total = stats['total']
    delivered = stats['delivered']
    shipped = stats['shipped_or_delivered']

    if total > 0 and total == delivered:
        signal, created = BuyerUpdateReadySignal.objects.get_or_create(
            order_reference=order.pk,
            update_kind='delivery',
            defaults={
                'buyer_reference': order.buyer_reference,
                'company_scope_reference': order.company_scope_reference,
                'expected_vendor_count': total,
                'confirmed_vendor_count': delivered,
                'all_vendors_confirmed': True,
                'status': 'eligible',
            }
        )
        if not created and not signal.all_vendors_confirmed:
            signal.confirmed_vendor_count = delivered
            signal.all_vendors_confirmed = True
            signal.status = 'eligible'
            signal.save()
    elif total > 0:
        signal = BuyerUpdateReadySignal.objects.filter(
            order_reference=order.pk, update_kind='shipment'
        ).first()
        if signal:
            signal.confirmed_vendor_count = shipped
            signal.expected_vendor_count = total
            signal.all_vendors_confirmed = (shipped == total)
            if signal.all_vendors_confirmed:
                signal.status = 'eligible'
            signal.save()
        else:
            BuyerUpdateReadySignal.objects.create(
                order_reference=order.pk,
                update_kind='shipment',
                buyer_reference=order.buyer_reference,
                company_scope_reference=order.company_scope_reference,
                expected_vendor_count=total,
                confirmed_vendor_count=shipped,
                all_vendors_confirmed=(shipped == total),
                status='eligible' if shipped == total else 'held',
            )


def _store_tracking_url(handoff, url):
    pass


def _fire_outbound_event(vendor_company_id, event_type, event_data, *, source_id=None):
    try:
        from .webhook_dispatch import queue_outbound_event
        queue_outbound_event(vendor_company_id, event_type, event_data, source_id=source_id)
    except Exception:
        pass
