"""Add system_colors JSONField to Product for multi-color support."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0041_product_clearance_weight_unit_vendor_color_mapping"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="system_colors",
            field=models.JSONField(
                blank=True, default=list,
                help_text="All resolved system colors for multi-color products",
            ),
        ),
    ]
