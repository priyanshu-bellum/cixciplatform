"""Admin-only actionable catalog review messages using the notification schema."""
from django.db import transaction

from apps.notification.models import InAppNotification
from apps.tenant.models import User


def notify_catalog_review(connection, run, count):
    if not count:
        return
    from apps.notification.broadcast import broadcast_notification
    for admin_id in User.objects.filter(is_cixci_admin=True,is_active=True).values_list('pk',flat=True):
        message = InAppNotification.objects.create(recipient_id=admin_id,
            company_scope_reference=connection.vendor_company_id,
            event_type='integration.vendor_catalog.review_required',
            title='Vendor Import Review Required',
            body=f'{count} products from {connection.vendor_company.name} need review',
            source_module='integration', source_record_id=run.pk,
            link=f'/catalog?tab=vendor-audit&vendor={connection.vendor_company_id}',
            audit_reference={'run_id':str(run.pk),'page':run.page_index,'review_count':count})
        payload = {'id':str(message.pk),'title':message.title,'body':message.body,
            'event_type':message.event_type,'link':message.link,'is_read':False,
            'created_at':message.created_at.isoformat()}
        transaction.on_commit(lambda user=admin_id,data=payload:broadcast_notification(user,data))
