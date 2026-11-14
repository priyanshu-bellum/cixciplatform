"""Webhook event handlers — update dispatch status and fulfillment tracking."""
from django.db import transaction
from django.utils import timezone
from .commerce_models import SupplierOrderDispatch, VendorCommerceProfile
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

        if normalized == 'delivered':
            _check_parent_completeness(handoff, dispatch)

    if tracking_url and handoff:
        _store_tracking_url(handoff, str(tracking_url)[:1000])


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
