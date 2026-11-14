"""Versioned, non-executable supplier order/tracking contracts."""
from copy import deepcopy
import re
import json
import math
from django.core.exceptions import ValidationError
from .catalog_config import PATH, path_value

FIELDS = {'po_number','currency','ship_to','lines','sku','quantity','line_reference','vendor_unit_price','webhook_url','events','description'}
ROUTE = re.compile(r'^/(?!/)[A-Za-z0-9_./{}-]{1,300}$')

GENERIC_COMMERCE_CONFIG = {
    'version':1,
    'order':{'path':'/orders','template':{'po_number':{'$field':'po_number'},'ship_to':{'$field':'ship_to'},
        'lines':{'$each':'lines','value':{'sku':{'$field':'sku'},'quantity':{'$field':'quantity'},'line_ref':{'$field':'line_reference'}}}},
        'success_path':'success','result_path':'data.status','external_order_path':'data.order_number',
        'status_map':{'accepted':'accepted','held':'held','failed':'failed','validated':'test_validated','dry_run':'test_validated'},
        'dry_run_query':{},'dry_run_verified':False,'idempotency_verified':False,'idempotency_header':''},
    'orders':{'path':'/orders','detail_path':'','detail_data_path':'data','items_path':'data.orders','next_cursor_path':'data.next_cursor','watermark_path':'data.next_updated_since',
        'cursor_param':'cursor','updated_since_param':'updated_since','po_path':'po_number','external_order_path':'order_number',
        'status_path':'status','updated_at_path':'updated_at','status_map':{'Processing':'processing','Shipped':'shipped','Delivered':'delivered','Failed':'failed'}},
    'shipments':{'path':'/shipments','items_path':'data.shipments','next_cursor_path':'data.next_cursor','watermark_path':'data.next_updated_since',
        'cursor_param':'cursor','updated_since_param':'updated_since','id_path':'shipment_number','po_path':'po_number',
        'external_order_path':'order_number','status_path':'status','updated_at_path':'updated_at','shipped_at_path':'ship_date',
        'delivered_at_path':'delivered_date','eta_path':'','tracking_path':'tracking','tracking_number_path':'number',
        'carrier_path':'carrier','tracking_url_path':'url','lines_path':'lines','line_reference_path':'line_ref','quantity_path':'quantity',
        'status_map':{'Shipped':'shipped','Delivered':'delivered','Exception':'exception'}},
    'webhook':{'scheme':'timestamp_hmac','signature_header':'X-Signature','timestamp_header':'X-Timestamp',
        'id_path':'id','type_path':'type','test_path':'test','data_path':'data',
        'order_record_path':'order','shipment_record_path':'shipment',
        'events':['order.created','order.updated','shipment.created','shipment.delivered'],
        'event_routes':{'order.created':'order','order.updated':'order','shipment.created':'shipment','shipment.delivered':'shipment'},
        'registration_path':'','registration_secret_path':'data.signing_secret'},
    'ship_to':{'mode':'unconfigured','address_id':None,'store_id':''},
    'poll_interval_minutes':15,
}

BALAJI_COMMERCE_CONFIG = deepcopy(GENERIC_COMMERCE_CONFIG)
BALAJI_COMMERCE_CONFIG['order'].update(path='/api/v1/orders', result_path='data.result',
    status_map={'pending_release':'accepted','already_placed':'accepted','held':'held','validated':'test_validated','dry_run':'test_validated','failed':'failed'},
    dry_run_query={'dry_run':'true'},dry_run_verified=True,idempotency_verified=True)
for kind in ('orders','shipments'):
    BALAJI_COMMERCE_CONFIG[kind]['path']='/api/v1/'+kind
BALAJI_COMMERCE_CONFIG['orders']['detail_path']='/api/v1/orders/{po_number}'
BALAJI_COMMERCE_CONFIG['orders']['status_map'].update({'Pending Fulfillment':'processing','Partially Fulfilled':'partially_shipped',
    'Billed':'processing','Cancelled':'cancelled','pending_release':'accepted','held':'held','failed':'failed'})
# The documented Balaji shipment schema does NOT provide line quantities or ETA.
BALAJI_COMMERCE_CONFIG['shipments'].update(lines_path='',eta_path='',delivered_at_path='')
BALAJI_COMMERCE_CONFIG['webhook'].update(scheme='balaji_v1',signature_header='Balaji-Signature',timestamp_header='',
    registration_path='/api/v1/webhooks')


def default_commerce_config():
    return deepcopy(GENERIC_COMMERCE_CONFIG)


def validate_template(node, depth=0):
    if depth>10:
        raise ValidationError('Request mapping nesting is too deep.')
    if isinstance(node,dict):
        if '$field' in node:
            if set(node)!={'$field'} or not isinstance(node['$field'],str) or node['$field'] not in FIELDS:
                raise ValidationError('Use a supported source field in the request mapping.')
        elif '$each' in node:
            if set(node)!={'$each','value'} or node['$each']!='lines':
                raise ValidationError('Only the accepted order lines can be repeated.')
            validate_template(node['value'],depth+1)
        else:
            if len(node)>100 or any(not isinstance(key,str) or len(key)>100 or key.startswith('$') for key in node):
                raise ValidationError('Use bounded object keys, not executable expressions.')
            for key,value in node.items():
                if key.casefold().replace('_','') in {'password','token','secret','authorization','apikey'}:
                    raise ValidationError('Credentials belong in encrypted connection settings.')
                validate_template(value,depth+1)
    elif isinstance(node,list):
        if len(node)>100:
            raise ValidationError('Request mapping list is too large.')
        for value in node:
            validate_template(value,depth+1)
    elif node is not None and (not isinstance(node,(str,int,float,bool)) or isinstance(node,str) and len(node)>2000 or isinstance(node,float) and not math.isfinite(node)):
        raise ValidationError('Use bounded JSON constants.')


def render_template(node, values):
    if isinstance(node,dict):
        if '$field' in node:
            return deepcopy(values.get(node['$field']))
        if '$each' in node:
            return [render_template(node['value'],{**values,**line}) for line in values['lines']]
        return {key:render_template(value,values) for key,value in node.items()}
    if isinstance(node,list):
        return [render_template(value,values) for value in node]
    return node


def validate_commerce_config(value):
    try:
        if len(json.dumps(value,allow_nan=False))>65536:
            raise ValueError()
    except (ValueError,TypeError,RecursionError):
        raise ValidationError('Use bounded valid JSON for the supplier configuration.') from None
    if not isinstance(value,dict) or set(value)!=set(GENERIC_COMMERCE_CONFIG) or value.get('version')!=1:
        raise ValidationError('Use version 1 of the supported supplier capability configuration.')
    for kind in ('order','orders','shipments','webhook','ship_to'):
        if not isinstance(value[kind],dict) or set(value[kind])!=set(GENERIC_COMMERCE_CONFIG[kind]):
            raise ValidationError(f'Use the supported {kind} configuration fields.')
    for kind in ('order','orders','shipments'):
        route=value[kind]['path']
        if not isinstance(route,str) or not ROUTE.fullmatch(route) or '..' in route or '{' in route:
            raise ValidationError('Supplier endpoints must be fixed relative paths on the configured origin.')
        for key,path in value[kind].items():
            if key=='detail_path':
                if path and (not isinstance(path,str) or not ROUTE.fullmatch(path) or '..' in path or path.count('{po_number}')!=1 or '{' in path.replace('{po_number}','')):
                    raise ValidationError('Use a relative detail endpoint with one {po_number} placeholder.')
                continue
            if key.endswith('_path'):
                if not isinstance(path,str) or path and not PATH.fullmatch(path):
                    raise ValidationError(f'{kind}.{key} must be a controlled JSON path.')
        states=value[kind]['status_map']
        if not isinstance(states,dict) or len(states)>100 or any(not isinstance(key,str) or len(key)>100 or not isinstance(state,str) or state not in {
            'accepted','held','failed','test_validated','processing','partially_shipped','shipped','delivered','cancelled','exception'} for key,state in states.items()):
            raise ValidationError('Use supported normalized supplier statuses.')
        if kind=='order' and any(state not in {'accepted','held','failed','test_validated'} for state in states.values()):
            raise ValidationError('Order submission acknowledgement is not a shipping confirmation.')
    validate_template(value['order']['template'])
    dry=value['order']['dry_run_query']
    if not isinstance(dry,dict) or len(dry)>5 or any(not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]{0,63}',key) or not isinstance(item,(str,bool,int)) or len(str(item))>200 for key,item in dry.items()):
        raise ValidationError('Use bounded, non-secret dry-run query parameters.')
    if type(value['order']['dry_run_verified']) is not bool:
        raise ValidationError('Declare whether the provider documents this dry-run contract.')
    if type(value['order']['idempotency_verified']) is not bool:
        raise ValidationError('Declare the provider idempotency contract.')
    header=value['order']['idempotency_header']
    if not isinstance(header,str) or header and (not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]{1,63}',header) or header.casefold() in {'host','cookie','authorization','content-type','content-length','connection','transfer-encoding'}):
        raise ValidationError('Use an optional dedicated idempotency header.')
    for kind in ('orders','shipments'):
        for key in ('cursor_param','updated_since_param'):
            if not isinstance(value[kind][key],str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]{0,63}',value[kind][key]):
                raise ValidationError('Use valid polling parameter names.')
    hook=value['webhook']
    if hook['scheme'] not in ('balaji_v1','timestamp_hmac'):
        raise ValidationError('This signature protocol requires a supported adapter.')
    for key in ('signature_header','timestamp_header'):
        if (key=='signature_header' or hook['scheme']=='timestamp_hmac') and (not isinstance(hook[key],str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]{1,63}',hook[key])):
            raise ValidationError('Use a valid signature/timestamp header.')
    for key,path in hook.items():
        if key.endswith('_path') and key!='registration_path' and (not isinstance(path,str) or path and not PATH.fullmatch(path)):
            raise ValidationError('Use controlled event response paths.')
    if hook['registration_path'] and (not isinstance(hook['registration_path'],str) or not ROUTE.fullmatch(hook['registration_path']) or '..' in hook['registration_path']):
        raise ValidationError('Use a fixed relative webhook registration path.')
    if not isinstance(hook['events'],list) or not 1<=len(hook['events'])<=20 or any(not isinstance(event,str) or len(event)>100 for event in hook['events']):
        raise ValidationError('Configure a bounded list of provider event names.')
    routes=hook['event_routes']
    if not isinstance(routes,dict) or set(routes)!=set(hook['events']) or any(not isinstance(kind,str) or kind not in ('order','shipment','catalog','ignore') for kind in routes.values()):
        raise ValidationError('Map each configured event to order, shipment, catalog or ignore.')
    if value['ship_to']['mode'] not in ('unconfigured','address','address_id','store_id'):
        raise ValidationError('Choose verified supplier shipping-address behavior.')
    if value['ship_to']['address_id'] is not None and (type(value['ship_to']['address_id']) is not int or value['ship_to']['address_id']<1):
        raise ValidationError('Use a provider-issued positive address ID.')
    if not isinstance(value['ship_to']['store_id'],str) or len(value['ship_to']['store_id'])>200:
        raise ValidationError('Use the provider-configured store ID.')
    if type(value['poll_interval_minutes']) is not int or not 15<=value['poll_interval_minutes']<=1440:
        raise ValidationError('Polling interval must be between 15 and 1440 minutes.')
    return deepcopy(value)
