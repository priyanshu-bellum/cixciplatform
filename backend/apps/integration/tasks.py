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
