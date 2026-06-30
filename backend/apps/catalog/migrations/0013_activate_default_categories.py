from django.db import migrations

def activate_default_categories(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="product_category").update(status="active")

def rollback_activate(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="product_category").update(status="setup_required")

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0012_increase_meta_title_max_length'),
    ]

    operations = [
        migrations.RunPython(activate_default_categories, rollback_activate),
    ]
