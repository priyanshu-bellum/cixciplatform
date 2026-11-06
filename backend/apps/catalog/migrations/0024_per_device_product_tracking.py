"""
Per-device product tracking for buyer exports.

Adds device_reference to BuyerProductExportJob and BuyerProductExportDate
so that "Product Added" state is tracked per device, not globally.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0023_activate_system_colors"),
    ]

    operations = [
        # 1. Add device_reference to BuyerProductExportJob
        migrations.AddField(
            model_name="buyerproductexportjob",
            name="device_reference",
            field=models.UUIDField(
                blank=True,
                db_index=True,
                help_text="Device ID the buyer was filtering by when creating this export",
                null=True,
            ),
        ),
        # 2. Add device_reference to BuyerProductExportDate
        migrations.AddField(
            model_name="buyerproductexportdate",
            name="device_reference",
            field=models.UUIDField(
                blank=True,
                db_index=True,
                help_text="Device ID this product was added for (per-device tracking)",
                null=True,
            ),
        ),
        # 3. Drop old unique_together constraint
        migrations.AlterUniqueTogether(
            name="buyerproductexportdate",
            unique_together=set(),
        ),
        # 4. Add new unique constraint (company + entity + product + device)
        migrations.AddConstraint(
            model_name="buyerproductexportdate",
            constraint=models.UniqueConstraint(
                fields=["company_scope_reference", "buyer_entity_reference", "product", "device_reference"],
                name="unique_buyer_product_device_export",
            ),
        ),
        # 5. Add index for device-scoped lookups
        migrations.AddIndex(
            model_name="buyerproductexportdate",
            index=models.Index(
                fields=["company_scope_reference", "device_reference"],
                name="catalog_buyer_prod_comp_dev_idx",
            ),
        ),
    ]
