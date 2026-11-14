import copy
from decimal import Decimal
import pytest
from django.core.exceptions import ValidationError
from apps.catalog.models import Product
from apps.catalog.offer_services import freeze_export_selection
from apps.integration.models import BuyerStorefront
from apps.routing.models import Order, RoutedSuborder, AcceptedOrderLine
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
from apps.fulfillment.models import FulfillmentHandoff
from apps.tenant.models import Company, CompanyEntity

pytestmark = pytest.mark.django_db


@pytest.fixture
def accepted_setup(buyer_client, buyer_user, vendor_company, cap_factory):
    capability = cap_factory('routing.order.create')
    buyer_user.capabilities.add(capability); buyer_user.company.capabilities.add(capability)
    product = Product.objects.create(name='Accepted accessory', sku='ORDER-SKU', brand='Brand', product_type='accessory',
        status='active', selling_status='for_sale', launch_date='2026-01-01', compatibility_status='complete',
        vendor_company_reference=vendor_company.pk, company_scope_reference=vendor_company.pk,
        vendor_wholesale_price_amount=Decimal('10'), msrp=Decimal('50'))
    storefront = BuyerStorefront.objects.create(company=buyer_user.company, entity=buyer_user.entity, code='web', label='Website')
    mapping = freeze_export_selection(product=product, company=buyer_user.company, entity=buyer_user.entity, storefront=storefront)
    payload = {'buyer_order_number':'WEB-1', 'integration_scope_id':str(storefront.pk), 'first_name':'Test','last_name':'Buyer',
        'address1':'100 Test Street','city':'Chino','state':'CA','zip_code':'91710',
        'order_lines':[{'line_reference':'line-1','export_mapping_id':str(mapping.pk),'quantity':2}]}
    return product, storefront, mapping, payload


def submit(client, payload):
    return client.post('/api/v1/routing/orders/', payload, format='json')


def test_acceptance_freezes_mapping_supplier_price_and_replays_once(accepted_setup, buyer_client):
    product,_,mapping,payload = accepted_setup
    first = submit(buyer_client,payload)
    assert first.status_code == 201, first.data
    second = submit(buyer_client,payload)
    assert second.status_code == 201 and second.data['id'] == first.data['id']
    assert (Order.objects.count(),RoutedSuborder.objects.count(),PurchaseOrder.objects.count(),PurchaseOrderLine.objects.count(),FulfillmentHandoff.objects.count()) == (1,1,1,1,1)
    line = AcceptedOrderLine.objects.get()
    assert line.mapping_id == mapping.pk and line.supplier_reference == product.vendor_company_reference
    assert line.unit_price_snapshot == Decimal('17') and line.quantity == 2
    Product.objects.filter(pk=product.pk).update(name='Changed later',vendor_wholesale_price_amount=999)
    replay = submit(buyer_client,payload)
    assert replay.data['order_lines'][0]['product_name'] == 'Accepted accessory'
    assert replay.data['order_lines'][0]['unit_price_snapshot'] == '17.0000'
    line.quantity = 3
    with pytest.raises(ValidationError):
        line.save()


def test_conflicting_replay_is_409_without_second_handoff(accepted_setup,buyer_client):
    _,_,_,payload = accepted_setup
    assert submit(buyer_client,payload).status_code == 201
    payload['order_lines'][0]['quantity']=3
    assert submit(buyer_client,payload).status_code == 409
    assert Order.objects.count()==1 and FulfillmentHandoff.objects.count()==1


def test_one_bad_line_rejects_entire_order_before_writes(accepted_setup,buyer_client):
    _,_,_,payload = accepted_setup
    payload['order_lines'].append({'line_reference':'bad','sku':'UNEXPORTED','quantity':1})
    response = submit(buyer_client,payload)
    assert response.status_code == 400, response.data
    assert response.data['detail']['order_lines'][0]['code']=='EXPORT_MAPPING_REQUIRED'
    assert response.data['detail']['order_lines'][0]['line_reference']=='bad'
    assert not Order.objects.exists() and not PurchaseOrder.objects.exists() and not FulfillmentHandoff.objects.exists()


@pytest.mark.parametrize('value',[True,0,-1,1.5,'NaN','Infinity'])
def test_invalid_quantities_never_create_partial_orders(value,accepted_setup,buyer_client):
    _,_,_,payload=accepted_setup
    payload['order_lines'][0]['quantity']=value
    assert submit(buyer_client,payload).status_code==400
    assert not Order.objects.exists()


def test_changed_client_price_and_supplier_cannot_override_export(accepted_setup,buyer_client):
    _,_,_,payload=accepted_setup
    payload['order_lines'][0]['unit_price_snapshot']='0.01'
    assert submit(buyer_client,payload).status_code==400
    payload['order_lines'][0].pop('unit_price_snapshot')
    payload['order_lines'][0]['vendor_id']='00000000-0000-0000-0000-000000000001'
    assert submit(buyer_client,payload).status_code==400
    assert not Order.objects.exists()


def test_foreign_company_entity_and_storefront_are_denied(accepted_setup,buyer_client,buyer_user):
    _,_,_,payload=accepted_setup
    foreign=Company.objects.create(name='Other',slug='other-order-buyer',company_type='buyer',status='active')
    foreign_entity=CompanyEntity.objects.create(company=foreign,name='Other entity',status='active')
    for field,value in [('buyer_id',foreign.pk),('buyer_entity_id',foreign_entity.pk),('integration_scope_id',foreign_entity.pk)]:
        changed=copy.deepcopy(payload);changed[field]=str(value)
        assert submit(buyer_client,changed).status_code in (400,403)
    assert not Order.objects.exists()


def test_inactive_offer_is_not_newly_orderable_but_an_accepted_retry_survives(accepted_setup,buyer_client):
    product,_,_,payload=accepted_setup
    assert submit(buyer_client,payload).status_code==201
    Product.objects.filter(pk=product.pk).update(status='inactive')
    assert submit(buyer_client,payload).status_code==201
    payload['buyer_order_number']='NEW-PURCHASE'
    assert submit(buyer_client,payload).status_code==400
    assert Order.objects.count()==1


def test_multiple_suppliers_create_distinct_pos_with_all_lines_visible(accepted_setup,buyer_client):
    product,storefront,_,payload=accepted_setup
    supplier=Company.objects.create(name='Second supplier',slug='supplier-2',company_type='vendor',status='active')
    other=Product.objects.create(name='Other offer',sku=product.sku,brand='Brand',product_type='accessory',status='active',selling_status='for_sale',
        launch_date='2026-01-01',compatibility_status='complete',vendor_company_reference=supplier.pk,company_scope_reference=supplier.pk,
        vendor_wholesale_price_amount=Decimal('12'),msrp=Decimal('50'))
    mapping=freeze_export_selection(product=other,company=storefront.company,entity=storefront.entity,storefront=storefront)
    payload['order_lines'].append({'line_reference':'line-2','export_mapping_id':str(mapping.pk),'quantity':1})
    response=submit(buyer_client,payload)
    assert response.status_code==201, response.data
    assert PurchaseOrder.objects.count()==2 and RoutedSuborder.objects.count()==2
    assert len(response.data['order_lines'])==2
    assert set(AcceptedOrderLine.objects.values_list('supplier_reference',flat=True))=={supplier.pk,product.vendor_company_reference}
