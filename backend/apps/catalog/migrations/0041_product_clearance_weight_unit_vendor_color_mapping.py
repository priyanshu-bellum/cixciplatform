"""Add weight_unit, clearance fields to Product; add VendorColorMapping model."""
import uuid
from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0040_add_product_series"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="weight_unit",
            field=models.CharField(
                blank=True, default="oz", help_text="Weight unit: oz, lb, g, kg", max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="is_clearance",
            field=models.BooleanField(default=False, help_text="Whether this product is on clearance"),
        ),
        migrations.AddField(
            model_name="product",
            name="clearance_type",
            field=models.CharField(
                blank=True, default="", max_length=30,
                choices=[("", "None"), ("end_date", "End Date Based"), ("inventory", "Inventory Based")],
                help_text="How clearance status is determined",
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="clearance_end_date",
            field=models.DateField(blank=True, null=True, help_text="End date for clearance pricing (if end_date type)"),
        ),
        migrations.CreateModel(
            name="VendorColorMapping",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("vendor_company_reference", models.UUIDField(db_index=True, help_text="Vendor company ID")),
                ("vendor_color", models.CharField(help_text="Original vendor color name", max_length=100)),
                ("system_color", models.CharField(help_text="Canonical CIXCI system color", max_length=100)),
                ("status", models.CharField(
                    choices=[("active", "Active"), ("inactive", "Inactive"), ("review_required", "Review Required")],
                    default="active", max_length=20,
                )),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.UUIDField(blank=True, null=True)),
            ],
            options={
                "db_table": "catalog_vendor_color_mapping",
                "unique_together": {("vendor_company_reference", "vendor_color")},
            },
        ),
        migrations.AddIndex(
            model_name="vendorcolormapping",
            index=models.Index(
                fields=["vendor_company_reference", "vendor_color", "status"],
                name="catalog_ven_vendor__5e3c1a_idx",
            ),
        ),
    ]
