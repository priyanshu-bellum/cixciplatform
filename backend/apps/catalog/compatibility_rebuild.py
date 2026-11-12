"""Durable deployment repair through the canonical compatibility engine."""
import json
from django.db import connections, transaction
from apps.audit.models import AuditRecord
from .models import Product

REQUEST_EVENT = 'catalog.compatibility.rebuild_requested'
COMPLETE_EVENT = 'catalog.compatibility.rebuild_completed'


@transaction.atomic
def process_pending_rebuilds(using='default'):
    # The platform's source catalog and shared engine use its default database.
    if using != 'default' or AuditRecord._meta.db_table not in connections[using].introspection.table_names():
        return 0
    finished=set(AuditRecord.objects.filter(event_code=COMPLETE_EVENT).values_list('service_trigger_reference',flat=True))
    completed=0
    requests=AuditRecord.objects.filter(event_code=REQUEST_EVENT,source_record_type='Product').order_by('created_at','id')
    for request in requests.iterator(chunk_size=200):
        trigger='compatibility-rebuild:'+str(request.id)
        if trigger in finished:
            continue
        with transaction.atomic():
            product=Product.objects.select_for_update().filter(pk=request.source_record_id).first()
            if AuditRecord.objects.filter(event_code=COMPLETE_EVENT,service_trigger_reference=trigger).exists():
                continue
            changed=0
            if product and product.compatibility_mode == 'universal_device_type':
                from .compatibility_contract import product_universal_types, sync_product_scope
                from .compatibility_engine import reconcile_product_compatibility
                # Reconstruct only an already declared legacy scope, never the
                # category's eligible types. Existing ID scopes remain unchanged.
                if not product.universal_type_scopes.filter(is_active=True).exists():
                    declared=product_universal_types(product)
                    if declared:
                        sync_product_scope(product,declared)
                changed=reconcile_product_compatibility(product,change_source='Declared Scope Deployment Rebuild',notify=False)
            AuditRecord.objects.create(event_code=COMPLETE_EVENT,event_description=json.dumps({'request_id':str(request.id),'changed_mappings':changed,'product_exists':product is not None}),
                status='success',company_scope_reference=request.company_scope_reference,
                source_module='catalog',source_record_type='Product',source_record_id=request.source_record_id,service_trigger_reference=trigger)
            completed+=1
    if completed:
        from .services import invalidate_buyer_projection_cache
        invalidate_buyer_projection_cache('declared_scope_deployment_rebuild')
    return completed


def rebuild_after_migrate(sender, using='default', **kwargs):
    # post_migrate runs after every app's schema operations, so future Product
    # columns cannot break a historical RunPython that only queues the repair.
    process_pending_rebuilds(using)
