from django.db import migrations


def activate_system_colors(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="system_color").update(status="active")


def rollback_activate(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="system_color").update(status="setup_required")


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0022_category_governance_v2'),
    ]

    operations = [
        migrations.RunPython(activate_system_colors, rollback_activate),
    ]
