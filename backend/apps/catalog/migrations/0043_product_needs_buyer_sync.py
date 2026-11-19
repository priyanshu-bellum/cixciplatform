"""Add needs_buyer_sync to Product for §15 sync tracking."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0042_product_system_colors"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="needs_buyer_sync",
            field=models.BooleanField(
                default=False,
                help_text="Set when normalization changes buyer-facing fields; cleared after sync",
            ),
        ),
    ]
