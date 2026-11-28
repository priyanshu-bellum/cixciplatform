"""Dedicated catalog queue; unrelated restored production jobs are not run here."""
from celery import shared_task


@shared_task(name='integration.vendor_catalog.process_page', queue='vendor_catalog')
def process_vendor_catalog_page(run_id):
    from .catalog_sync import process_sync_page
    process_sync_page(run_id)


@shared_task(name='integration.vendor_catalog.dispatch', queue='vendor_catalog')
def dispatch_vendor_catalog_syncs():
    from .catalog_sync import dispatch_due_syncs
    return dispatch_due_syncs()


@shared_task(name='integration.vendor_catalog.retry_images', queue='vendor_catalog')
def retry_vendor_images():
    from .catalog_sync import retry_missing_vendor_images
    return retry_missing_vendor_images()


@shared_task(name='integration.buyer_webhooks.deliver', queue='vendor_commerce')
def deliver_buyer_webhook(delivery_id):
    from .buyer_webhooks import process_delivery
    return process_delivery(delivery_id)


@shared_task(name='integration.buyer_webhooks.retry', queue='vendor_commerce')
def retry_buyer_webhooks():
    from .buyer_webhooks import retry_due
    return retry_due()


@shared_task(name='integration.vendor_commerce.dispatch_order', queue='vendor_commerce')
def dispatch_supplier_order(dispatch_id):
    from .order_dispatch import process_supplier_dispatch
    process_supplier_dispatch(dispatch_id)


@shared_task(name='integration.vendor_commerce.poll_shipments', queue='vendor_commerce')
def poll_vendor_shipments(poll_id):
    from .shipment_poll import process_shipment_poll
    process_shipment_poll(poll_id)


@shared_task(name='integration.vendor_commerce.dispatch_polls', queue='vendor_commerce')
def dispatch_due_shipment_polls():
    from django.utils import timezone
    from .commerce_models import VendorCommerceProfile
    from .shipment_poll import request_shipment_poll
    due = VendorCommerceProfile.objects.filter(
        polling_enabled=True, next_poll_at__lte=timezone.now(),
        connection__is_retired=False, vendor_company__status='active',
    ).values_list('pk', flat=True)[:50]
    started = 0
    for profile_id in due:
        try:
            request_shipment_poll(profile_id)
            started += 1
        except Exception:
            pass
    return started


@shared_task(name='integration.vendor_commerce.outbound_delivery', queue='vendor_commerce')
def process_outbound_webhook(delivery_id):
    from .webhook_dispatch import process_outbound_delivery
    process_outbound_delivery(delivery_id)


@shared_task(name='integration.vendor_commerce.retry_outbound', queue='vendor_commerce')
def retry_stalled_outbound():
    from .webhook_dispatch import retry_stalled_deliveries
    return retry_stalled_deliveries()


@shared_task(name='integration.vendor_commerce.finance_sync', queue='vendor_commerce')
def process_finance_sync(run_id):
    from .finance_sync import process_finance_poll
    process_finance_poll(run_id)


@shared_task(name='integration.vendor_commerce.dispatch_finance_syncs', queue='vendor_commerce')
def dispatch_finance_syncs():
    from .finance_sync import dispatch_due_finance_syncs
    return dispatch_due_finance_syncs()
