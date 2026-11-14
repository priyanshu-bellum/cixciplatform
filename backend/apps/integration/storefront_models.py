import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class BuyerStorefront(models.Model):
    """Explicit integration scope inside one Buyer Entity; not an API-key owner."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('tenant.Company', on_delete=models.PROTECT, related_name='buyer_storefronts')
    entity = models.ForeignKey('tenant.CompanyEntity', on_delete=models.PROTECT, related_name='storefronts')
    external_connection = models.ForeignKey('integration.ExternalConnection', null=True, blank=True, on_delete=models.PROTECT)
    code = models.SlugField(max_length=100)
    label = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'integration_buyer_storefront'
        constraints = [models.UniqueConstraint(fields=['company', 'entity', 'code'], name='buyer_storefront_code')]

    def clean(self):
        if self.company.company_type != 'buyer' or self.entity.company_id != self.company_id:
            raise ValidationError('A storefront must belong to the selected Buyer Company and Entity.')
        if self.external_connection_id and self.external_connection.company_scope_reference != self.company_id:
            raise ValidationError('The external connection belongs to another company.')
        if not self._state.adding:
            old = type(self).objects.get(pk=self.pk)
            if (old.company_id, old.entity_id, old.code, old.external_connection_id) != (self.company_id, self.entity_id, self.code, self.external_connection_id):
                raise ValidationError('Storefront identity and ownership are immutable. Create another scope instead.')

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)
