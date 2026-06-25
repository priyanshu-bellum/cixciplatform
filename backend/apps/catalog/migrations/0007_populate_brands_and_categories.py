from django.db import migrations

def populate_defaults(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    
    brands = ["Apple", "Samsung", "Google", "Belkin", "OtterBox", "Anker"]
    for brand in brands:
        DynamicDropdownConfig.objects.get_or_create(
            field_name="brand",
            value=brand,
            defaults={"display_name": brand}
        )
        
    categories = [
        "Cases",
        "Screen Protection",
        "Phone Attachments",
        "Headphones",
        "Speakers",
        "Chargers and Cables",
        "Memory",
        "Wearable Tech",
        "Watch Accessories"
    ]
    for category in categories:
        DynamicDropdownConfig.objects.get_or_create(
            field_name="product_category",
            value=category,
            defaults={"display_name": category}
        )

def rollback_defaults(apps, schema_editor):
    DynamicDropdownConfig = apps.get_model('catalog', 'DynamicDropdownConfig')
    DynamicDropdownConfig.objects.filter(field_name="brand").delete()
    DynamicDropdownConfig.objects.filter(field_name="product_category").delete()

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0006_product_eol_date_alter_product_status'),
    ]

    operations = [
        migrations.RunPython(populate_defaults, rollback_defaults),
    ]
