"""Stable export selection evidence; source Product identity is never replaced."""
import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class BuyerExportMapping(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('tenant.Company', on_delete=models.PROTECT)
    entity = models.ForeignKey('tenant.CompanyEntity', on_delete=models.PROTECT)
    storefront = models.ForeignKey('integration.BuyerStorefront', null=True, blank=True, on_delete=models.PROTECT)
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name='export_mappings')
    supplier_reference = models.UUIDField(db_index=True)
    export_job = models.ForeignKey('catalog.BuyerProductExportJob', null=True, blank=True, on_delete=models.PROTECT)
    listing_reference = models.CharField(max_length=500)
    external_listing_id = models.CharField(max_length=500, blank=True)
    external_variant_id = models.CharField(max_length=500, blank=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=30, default='active', db_index=True)
    pricing_snapshot_reference = models.UUIDField(null=True, blank=True)
    exported_at = models.DateTimeField(default=timezone.now)
    superseded_at = models.DateTimeField(null=True, blank=True)
    migration_evidence = models.JSONField(default=dict)

    class Meta:
        db_table = 'catalog_buyer_export_mapping'
        indexes = [models.Index(fields=['company', 'entity', 'product', 'status'])]
        constraints = [
            models.UniqueConstraint(fields=['storefront', 'listing_reference'], condition=models.Q(status='active', storefront__isnull=False), name='export_active_listing'),
            models.UniqueConstraint(fields=['company', 'entity', 'listing_reference'], condition=models.Q(status='active', storefront__isnull=True), name='export_legacy_active_listing'),
            models.UniqueConstraint(fields=['storefront', 'listing_reference', 'version'], condition=models.Q(storefront__isnull=False), name='export_listing_version'),
            models.UniqueConstraint(fields=['company', 'entity', 'listing_reference', 'version'], condition=models.Q(storefront__isnull=True), name='export_legacy_listing_version'),
            models.UniqueConstraint(fields=['storefront','external_variant_id'], condition=models.Q(status='active', storefront__isnull=False) & ~models.Q(external_variant_id=''), name='export_active_external_variant'),
            models.UniqueConstraint(fields=['storefront','external_listing_id'], condition=models.Q(status='active', storefront__isnull=False, external_variant_id='') & ~models.Q(external_listing_id=''), name='export_active_external_listing'),
        ]

    def clean(self):
        if self.status not in ('active', 'review_required', 'superseded', 'retired'):
            raise ValidationError('Use a supported export mapping state.')
        if self.status == 'active' and not self.pricing_snapshot_reference:
            raise ValidationError('An active mapping requires approved Pricing evidence.')
        if self.company.company_type != 'buyer' or self.entity.company_id != self.company_id:
            raise ValidationError('Export mapping requires one authorized Buyer Company and Entity.')
        if self.storefront_id and (self.storefront.company_id != self.company_id or self.storefront.entity_id != self.entity_id):
            raise ValidationError('Storefront ownership does not match the export scope.')
        if self.product.vendor_company_reference != self.supplier_reference:
            raise ValidationError('Supplier must match the selected Product offer.')
        if (self.external_listing_id or self.external_variant_id) and not self.storefront_id:
            raise ValidationError('External listing references require an explicit storefront.')
        if self.export_job_id and (self.export_job.company_scope_reference != self.company_id or self.export_job.buyer_entity_reference != self.entity_id):
            raise ValidationError('Export job belongs to a different scope.')
        if self.pricing_snapshot_reference:
            from apps.pricing.models import EffectivePriceSnapshot
            snapshot = EffectivePriceSnapshot.objects.select_related('pricing_profile').get(pk=self.pricing_snapshot_reference)
            if snapshot.product_reference != self.product_id or snapshot.pricing_profile.buyer_company_reference != self.company_id or snapshot.pricing_profile.vendor_company_reference != self.supplier_reference:
                raise ValidationError('Pricing evidence does not match this offer and Buyer.')
        if not self._state.adding:
            old = type(self).objects.get(pk=self.pk)
            immutable = ['company_id', 'entity_id', 'storefront_id', 'product_id', 'supplier_reference', 'export_job_id', 'listing_reference',
                         'external_listing_id', 'external_variant_id', 'version', 'pricing_snapshot_reference', 'exported_at', 'migration_evidence']
            if any(getattr(self, field) != getattr(old, field) for field in immutable):
                raise ValidationError('Export selection evidence is immutable; create a new mapping version.')

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)
