from django.db import migrations

def populate_default_colors(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    colors = [
        ("Red", "Red"),
        ("Orange", "Orange"),
        ("Yellow", "Yellow"),
        ("Green", "Green"),
        ("Blue", "Blue"),
        ("Purple", "Purple"),
        ("Pink", "Pink"),
        ("Brown", "Brown"),
        ("Black", "Black"),
        ("White", "White"),
        ("Silver", "Silver"),
        ("Multi-Color", "Multi-Color")
    ]
    for val, display in colors:
        DynamicDropdownConfig.objects.get_or_create(
            field_name="system_color",
            value=val,
            defaults={"display_name": display}
        )

def rollback_colors(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="system_color").delete()

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0004_dynamicdropdownconfig'),
    ]

    operations = [
        migrations.RunPython(populate_default_colors, rollback_colors),
    ]
