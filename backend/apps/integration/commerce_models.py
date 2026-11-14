import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from .commerce_config import default_commerce_config


class VendorCommerceProfile(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    connection=models.OneToOneField('integration.VendorCatalogConnection',on_delete=models.PROTECT,related_name='commerce_profile')
    vendor_company=models.ForeignKey('tenant.Company',on_delete=models.PROTECT)
    adapter=models.CharField(max_length=30,default='generic_json')
    mode=models.CharField(max_length=20,default='preview')
    order_enabled=models.BooleanField(default=False)
    webhook_enabled=models.BooleanField(default=False)
    polling_enabled=models.BooleanField(default=False)
    config=models.JSONField(default=default_commerce_config)
    config_version=models.UUIDField(default=uuid.uuid4,editable=False)
    receiver_id=models.UUIDField(default=uuid.uuid4,unique=True,editable=False)
    encrypted_webhook_secret=models.TextField(blank=True,editable=False)
    provider_webhook_id=models.CharField(max_length=200,blank=True)
    next_poll_at=models.DateTimeField(null=True,blank=True)
    updated_by=models.ForeignKey('tenant.User',on_delete=models.PROTECT)
    created_at=models.DateTimeField(default=timezone.now)
    updated_at=models.DateTimeField(auto_now=True)

    class Meta:
        db_table='integration_vendor_commerce_profile'
        constraints=[models.UniqueConstraint(fields=['vendor_company'],condition=models.Q(order_enabled=True),name='vendor_one_order_profile')]

    def clean(self):
        if self.vendor_company_id!=self.connection.vendor_company_id or self.vendor_company.company_type!='vendor':
            raise ValidationError('Supplier capabilities belong to the catalog connection Vendor.')
        if self.mode not in ('preview','test','live') or self.adapter not in ('generic_json','balaji'):
            raise ValidationError('Select a supported adapter and execution mode.')
        if self.webhook_enabled and not self.encrypted_webhook_secret:
            raise ValidationError('A signing secret is required before accepting webhooks.')
        from .commerce_config import validate_commerce_config
        validate_commerce_config(self.config)
        if self.mode=='live' and (not self.config['order']['idempotency_verified'] or self.config['ship_to']['mode']=='unconfigured'):
            raise ValidationError('Live dispatch requires verified idempotency and explicit shipping configuration.')
        if self.adapter=='balaji':
            from urllib.parse import urlsplit
            if urlsplit(self.connection.endpoint_url).hostname!='shop.balajibrands.com':
                raise ValidationError('The Balaji adapter requires its verified API origin. Use Generic for another provider.')
            if self.config['order']['path']!='/api/v1/orders' or self.config['order']['dry_run_query']!={'dry_run':'true'}:
                raise ValidationError('Preserve the verified Balaji order/dry-run contract.')
            if self.mode=='live':
                from .catalog_secrets import decrypt_credentials
                if any(str(secret).startswith('bbw_test_') for secret in decrypt_credentials(self.connection).values()):
                    raise ValidationError('A Balaji test credential cannot enable live dispatch.')
        if not self._state.adding:
            old=type(self).objects.get(pk=self.pk)
            if old.connection_id!=self.connection_id or old.vendor_company_id!=self.vendor_company_id or old.receiver_id!=self.receiver_id:
                raise ValidationError('Capability ownership and callback identity are immutable.')

    def save(self,*args,**kwargs):
        self.clean()
        return super().save(*args,**kwargs)


class SupplierOrderDispatch(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    suborder=models.OneToOneField('routing.RoutedSuborder',on_delete=models.PROTECT,related_name='supplier_dispatch')
    profile=models.ForeignKey(VendorCommerceProfile,null=True,blank=True,on_delete=models.PROTECT,related_name='dispatches')
    vendor_company=models.ForeignKey('tenant.Company',on_delete=models.PROTECT)
    po_number=models.CharField(max_length=150,unique=True)
    status=models.CharField(max_length=30,default='queued',db_index=True)
    mode=models.CharField(max_length=20,default='preview')
    config_snapshot=models.JSONField(default=dict)
    config_version=models.UUIDField(null=True,blank=True)
    transport_origin=models.URLField(max_length=1000,blank=True)
    encrypted_transport_credentials=models.TextField(blank=True,editable=False)
    transport_auth_type=models.CharField(max_length=20,blank=True)
    transport_auth_header=models.CharField(max_length=64,blank=True)
    request_hash=models.CharField(max_length=64,blank=True)
    external_order_id=models.CharField(max_length=200,blank=True,db_index=True)
    provider_status=models.CharField(max_length=100,blank=True)
    response_summary=models.JSONField(default=dict)
    attempt_count=models.PositiveIntegerField(default=0)
    next_retry_at=models.DateTimeField(null=True,blank=True)
    lease_token=models.UUIDField(null=True,blank=True)
    lease_expires_at=models.DateTimeField(null=True,blank=True)
    last_error_code=models.CharField(max_length=100,blank=True)
    provider_updated_at=models.DateTimeField(null=True,blank=True)
    next_status_poll_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(default=timezone.now)
    updated_at=models.DateTimeField(auto_now=True)

    class Meta:
        db_table='integration_supplier_order_dispatch'
        indexes=[models.Index(fields=['profile','status','next_retry_at'])]


class VendorWebhookReceipt(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    profile=models.ForeignKey(VendorCommerceProfile,on_delete=models.PROTECT,related_name='webhook_receipts')
    provider_event_id=models.CharField(max_length=200)
    event_type=models.CharField(max_length=100)
    is_test=models.BooleanField(default=False)
    payload_hash=models.CharField(max_length=64)
    encrypted_payload=models.TextField(editable=False)
    status=models.CharField(max_length=30,default='received',db_index=True)
    error_code=models.CharField(max_length=100,blank=True)
    received_at=models.DateTimeField(default=timezone.now)
    processed_at=models.DateTimeField(null=True,blank=True)

    class Meta:
        db_table='integration_vendor_webhook_receipt'
        constraints=[models.UniqueConstraint(fields=['profile','provider_event_id'],name='vendor_webhook_event_once')]


class VendorCommercePollRun(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    profile=models.ForeignKey(VendorCommerceProfile,on_delete=models.PROTECT,related_name='poll_runs')
    kind=models.CharField(max_length=20)
    status=models.CharField(max_length=30,default='queued',db_index=True)
    config_version=models.UUIDField()
    config_snapshot=models.JSONField(default=dict)
    cursor=models.JSONField(null=True,blank=True)
    cursor_hashes=models.JSONField(default=list)
    watermark=models.CharField(max_length=100,blank=True)
    rows_seen=models.PositiveIntegerField(default=0)
    processed_count=models.PositiveIntegerField(default=0)
    review_count=models.PositiveIntegerField(default=0)
    page_index=models.PositiveIntegerField(default=0)
    attempt_count=models.PositiveIntegerField(default=0)
    error_code=models.CharField(max_length=100,blank=True)
    next_retry_at=models.DateTimeField(null=True,blank=True)
    lease_token=models.UUIDField(null=True,blank=True)
    lease_expires_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(default=timezone.now)
    completed_at=models.DateTimeField(null=True,blank=True)

    class Meta:
        db_table='integration_vendor_commerce_poll'
        constraints=[models.UniqueConstraint(fields=['profile','kind'],condition=models.Q(status__in=['queued','running','retrying']),name='vendor_one_active_poll')]
