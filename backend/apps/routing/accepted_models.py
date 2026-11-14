import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class AcceptedOrderLine(models.Model):
    """Immutable accepted supplier/offer/price evidence for fulfillment and returns."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('routing.Order', on_delete=models.PROTECT, related_name='accepted_lines')
    suborder = models.ForeignKey('routing.RoutedSuborder', on_delete=models.PROTECT, related_name='accepted_lines')
    mapping = models.ForeignKey('catalog.BuyerExportMapping', on_delete=models.PROTECT)
    product_reference = models.UUIDField(db_index=True)
    supplier_reference = models.UUIDField(db_index=True)
    line_reference = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    pricing_snapshot_reference = models.UUIDField()
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)
    vendor_unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=3)
    source_snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'routing_accepted_order_line'
        constraints = [models.UniqueConstraint(fields=['order', 'line_reference'], name='accepted_order_line_reference')]

    def clean(self):
        if self.quantity < 1 or self.suborder.order_id != self.order_id:
            raise ValidationError('Accepted quantity and suborder must match this parent order.')
        if (self.mapping.product_id != self.product_reference or self.mapping.supplier_reference != self.supplier_reference
                or self.suborder.vendor_company_reference != self.supplier_reference
                or self.mapping.company_id != self.order.company_scope_reference
                or self.mapping.entity_id != self.order.buyer_entity_reference
                or self.mapping.storefront_id != self.order.storefront_id
                or self.mapping.pricing_snapshot_reference != self.pricing_snapshot_reference):
            raise ValidationError('Accepted evidence conflicts with its authorized export selection.')
        if not self._state.adding:
            raise ValidationError('Accepted order lines are immutable.')

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)
