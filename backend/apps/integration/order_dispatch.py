"""Durable supplier transport. Accepted Routing/fulfillment facts stay authoritative."""
from datetime import timedelta
from hashlib import sha256
import json
from types import SimpleNamespace
from urllib.parse import urlsplit
from uuid import uuid4
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from apps.routing.models import RoutedSuborder
from .models import VendorCommerceProfile, SupplierOrderDispatch
from .commerce_config import validate_commerce_config, render_template
from .catalog_config import saved_integration_mode, path_value
from .catalog_transport import request_json, CatalogTransportError
from .catalog_sync import _reserve_request, audit


def origin_url(connection):
    source=urlsplit(connection.endpoint_url)
    return source.scheme+'://'+source.netloc


def profile_transport(profile,path):
    connection=profile.connection
    return SimpleNamespace(endpoint_url=origin_url(connection)+path,auth_type=connection.auth_type,
        auth_header=connection.auth_header,encrypted_credentials=connection.encrypted_credentials)


def publish_dispatch(dispatch_id,delay=0):
    from config.celery import app
    try:
        app.send_task('integration.vendor_commerce.dispatch_order',args=[str(dispatch_id)],queue='vendor_commerce',countdown=max(0,delay),retry=False)
    except Exception:
        SupplierOrderDispatch.objects.filter(pk=dispatch_id,status__in=['queued','retrying']).update(last_error_code='QUEUE_UNAVAILABLE')


@transaction.atomic
def request_supplier_dispatch(suborder_id,*,retry=False,actor=None):
    suborder=RoutedSuborder.objects.select_for_update().select_related('order').get(pk=suborder_id)
    existing=SupplierOrderDispatch.objects.filter(suborder=suborder).first()
    if existing and (not retry or existing.status in ('accepted','held','test_validated','in_flight')):
        return existing
    if not suborder.order.mapping_contract_version or not suborder.accepted_lines.exists():
        raise ValidationError('Mapped accepted order evidence is required before supplier dispatch.')
    profile=VendorCommerceProfile.objects.filter(vendor_company_id=suborder.vendor_company_reference,order_enabled=True).select_related('connection__vendor_company','updated_by').first()
    dispatch=existing or SupplierOrderDispatch(suborder=suborder,vendor_company_id=suborder.vendor_company_reference,po_number='CX-'+str(suborder.pk))
    if profile is None:
        dispatch.status,dispatch.last_error_code='configuration_required','SUPPLIER_ORDER_SETUP_REQUIRED'
        dispatch.save();return dispatch
    if dispatch.config_snapshot:
        if dispatch.profile_id!=profile.pk or dispatch.mode!=profile.mode:
            raise ValidationError('An attempted/previewed order cannot silently switch supplier connection or execution mode.')
    else:
        validate_commerce_config(profile.config)
        dispatch.profile=profile
        dispatch.config_snapshot=profile.config
        dispatch.config_version=profile.config_version
        dispatch.mode=profile.mode
        dispatch.transport_origin=origin_url(profile.connection)
        dispatch.transport_auth_type=profile.connection.auth_type
        dispatch.transport_auth_header=profile.connection.auth_header
        dispatch.encrypted_transport_credentials=profile.connection.encrypted_credentials
    if retry and dispatch.attempt_count and not dispatch.config_snapshot['order']['idempotency_verified'] and dispatch.mode=='live':
        raise ValidationError('Verify the provider outcome before retrying a non-idempotent order.')
    dispatch.status,dispatch.last_error_code,dispatch.next_retry_at='queued','',None
    dispatch.save()
    audit('supplier_order_queued',profile.connection,actor,dispatch_id=dispatch.pk,suborder_id=suborder.pk,mode=dispatch.mode)
    transaction.on_commit(lambda:publish_dispatch(dispatch.pk))
    return dispatch


def accepted_request_values(dispatch):
    shipping=dispatch.suborder.routing_snapshot.get('customer_shipping',{})
    shipping_rule=dispatch.config_snapshot['ship_to']
    mode=shipping_rule['mode']
    if mode=='address':
        ship_to={'address':{'name':(str(shipping.get('first_name',''))+' '+str(shipping.get('last_name',''))).strip(),
            'line1':shipping.get('address1',''),'line2':shipping.get('address2',''),'city':shipping.get('city',''),
            'state':shipping.get('state',''),'postal_code':shipping.get('zip_code',''),'country':shipping.get('country','US')}}
        if not all(ship_to['address'].get(key) for key in ('name','line1','city','state','postal_code')):
            raise ValidationError('Required accepted customer shipping data is missing.')
    elif mode=='address_id' and shipping_rule['address_id']:
        ship_to={'address_id':shipping_rule['address_id']}
    elif mode=='store_id' and shipping_rule['store_id']:
        ship_to={'store_id':shipping_rule['store_id']}
    else:
        raise ValidationError('Configure the verified provider ship-to behavior.')
    accepted=list(dispatch.suborder.accepted_lines.all().order_by('line_reference'))
    lines=[{'sku':line.source_snapshot['sku'],'quantity':line.quantity,'line_reference':line.line_reference,
            'vendor_unit_price':str(line.vendor_unit_price_snapshot)} for line in accepted]
    if not lines:
        raise ValidationError('Accepted immutable order lines are missing.')
    currencies={line.currency for line in accepted}
    if len(currencies)!=1:
        raise ValidationError('The supplier suborder requires one accepted currency.')
    return {'po_number':dispatch.po_number,'ship_to':ship_to,'currency':currencies.pop(),'lines':lines}


def preview_dispatch(dispatch):
    values=accepted_request_values(dispatch)
    return render_template(dispatch.config_snapshot['order']['template'],values)


def process_supplier_dispatch(dispatch_id):
    with transaction.atomic():
        dispatch=SupplierOrderDispatch.objects.select_for_update(of=('self',)).select_related('profile__connection__vendor_company','profile__updated_by','suborder__order').get(pk=dispatch_id)
        now=timezone.now()
        if dispatch.status not in ('queued','retrying','in_flight') or dispatch.next_retry_at and dispatch.next_retry_at>now or dispatch.status=='in_flight' and dispatch.lease_expires_at and dispatch.lease_expires_at>now:
            return
        token=uuid4();dispatch.status='in_flight';dispatch.lease_token=token;dispatch.lease_expires_at=now+timedelta(minutes=3)
        dispatch.attempt_count+=1;dispatch.save()
    try:
        profile=dispatch.profile
        if (not profile or not profile.order_enabled or profile.mode!=dispatch.mode or profile.connection.is_retired
                or profile.connection.vendor_company.status!='active' or saved_integration_mode(profile.connection.vendor_company)!='api'
                or not profile.updated_by.is_active or not profile.updated_by.is_cixci_admin):
            raise ValidationError('Supplier configuration is unavailable or changed.')
        values=accepted_request_values(dispatch)
        payload=render_template(dispatch.config_snapshot['order']['template'],values)
        digest=sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        if dispatch.request_hash and dispatch.request_hash!=digest:
            raise ValidationError('Accepted outbound order data changed after its first attempt.')
        cfg=dispatch.config_snapshot['order']
        summary={'mode':dispatch.mode,'po_number':dispatch.po_number,'line_count':len(values['lines']),'request_hash':digest}
        external_id='';provider_status=''
        if dispatch.mode=='preview':
            outcome='preview_ready'
        else:
            params={}
            if dispatch.mode=='test':
                if not cfg['dry_run_verified'] or not cfg['dry_run_query']:
                    raise ValidationError('This provider has no verified remote dry-run contract. Use preview mode.')
                params=cfg['dry_run_query']
            elif not cfg['idempotency_verified']:
                raise ValidationError('Live supplier ordering requires verified idempotency.')
            transport=SimpleNamespace(endpoint_url=dispatch.transport_origin+cfg['path'],auth_type=dispatch.transport_auth_type,
                auth_header=dispatch.transport_auth_header,encrypted_credentials=dispatch.encrypted_transport_credentials)
            _reserve_request(profile.connection,catalog_rows=False)
            headers={cfg['idempotency_header']:str(dispatch.pk)} if cfg['idempotency_header'] else {}
            http,response=request_json(transport,params,method='POST',body=payload,accepted_statuses=(200,201,202),extra_headers=headers)
            from .catalog_secrets import redact,decrypt_credentials
            response=redact(response,list(decrypt_credentials(transport).values()))
            if not isinstance(response,dict) or cfg['success_path'] and path_value(response,cfg['success_path']) is not True:
                raise CatalogTransportError('INVALID_ORDER_RESPONSE',status=503)
            provider_status=path_value(response,cfg['result_path'])
            external_id=path_value(response,cfg['external_order_path']) or ''
            if not isinstance(provider_status,str) or len(provider_status)>100 or not isinstance(external_id,(str,int)) or len(str(external_id))>200:
                raise CatalogTransportError('INVALID_ORDER_RESPONSE',status=503)
            outcome=cfg['status_map'].get(provider_status,'review_required')
            if dispatch.mode=='test' and outcome!='test_validated':
                outcome='review_required'
            if dispatch.mode=='live' and outcome=='test_validated':
                outcome='review_required'
            summary.update(http_status=http,result=outcome)
        with transaction.atomic():
            current=SupplierOrderDispatch.objects.select_for_update().get(pk=dispatch.pk)
            if current.lease_token!=token or current.status!='in_flight':
                return
            current.status,current.request_hash,current.external_order_id,current.provider_status=outcome,digest,str(external_id),provider_status
            current.response_summary=summary;current.last_error_code='UNKNOWN_PROVIDER_STATUS' if outcome=='review_required' else ''
            current.next_status_poll_at=timezone.now()+timedelta(minutes=15) if outcome in ('accepted','held') else None
            current.lease_token,current.lease_expires_at=None,None;current.save()
            audit('supplier_order_result',profile.connection,profile.updated_by,dispatch_id=current.pk,suborder_id=current.suborder_id,
                mode=current.mode,result=outcome,provider_status=provider_status,external_order_id=str(external_id))
    except (CatalogTransportError,ValidationError) as error:
        with transaction.atomic():
            current=SupplierOrderDispatch.objects.select_for_update().get(pk=dispatch.pk)
            if current.lease_token!=token or current.status!='in_flight':
                return
            temporary=isinstance(error,CatalogTransportError) and (error.status==429 or error.status and error.status>=500)
            retry_safe=dispatch.mode!='live' or dispatch.config_snapshot['order']['idempotency_verified']
            if temporary and retry_safe and current.attempt_count<5:
                delay=error.retry_after or min(1800,30*2**current.attempt_count)
                current.status='retrying';current.next_retry_at=timezone.now()+timedelta(seconds=delay)
                transaction.on_commit(lambda:publish_dispatch(current.pk,delay))
            else:
                current.status='configuration_required' if isinstance(error,ValidationError) else 'failed'
            current.last_error_code=(error.provider_code or error.code) if isinstance(error,CatalogTransportError) else 'SUPPLIER_CONFIGURATION_REQUIRED'
            current.lease_token,current.lease_expires_at=None,None;current.save()
            if current.profile_id:
                audit('supplier_order_failed',current.profile.connection,current.profile.updated_by,dispatch_id=current.pk,code=current.last_error_code,status='failure')
