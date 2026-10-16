from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0017_add_compatible_device_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="compatibility_mode",
            field=models.CharField(
                choices=[
                    ("direct_device", "Direct Device"),
                    ("universal_device_type", "Universal Device Type"),
                ],
                default="direct_device",
                help_text="How compatibility is determined: per-device assertions or universal device type mapping.",
                max_length=25,
            ),
        ),
    ]
