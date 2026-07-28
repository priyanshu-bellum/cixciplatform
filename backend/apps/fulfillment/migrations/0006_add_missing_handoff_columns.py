from django.db import migrations

def add_missing_columns(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE fulfillment_handoff ADD COLUMN IF NOT EXISTS vendor_order_number varchar(255);")
            cursor.execute("ALTER TABLE fulfillment_handoff ADD COLUMN IF NOT EXISTS shipping_carrier varchar(255);")
            cursor.execute("ALTER TABLE fulfillment_handoff ADD COLUMN IF NOT EXISTS tracking_number varchar(255);")
            cursor.execute("ALTER TABLE fulfillment_handoff ADD COLUMN IF NOT EXISTS shipped_date date;")
            cursor.execute("ALTER TABLE fulfillment_handoff ADD COLUMN IF NOT EXISTS delivered_date date;")

def reverse_missing_columns(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE fulfillment_handoff DROP COLUMN IF EXISTS vendor_order_number;")
            cursor.execute("ALTER TABLE fulfillment_handoff DROP COLUMN IF EXISTS shipping_carrier;")
            cursor.execute("ALTER TABLE fulfillment_handoff DROP COLUMN IF EXISTS tracking_number;")
            cursor.execute("ALTER TABLE fulfillment_handoff DROP COLUMN IF EXISTS shipped_date;")
            cursor.execute("ALTER TABLE fulfillment_handoff DROP COLUMN IF EXISTS delivered_date;")

class Migration(migrations.Migration):

    dependencies = [
        ('fulfillment', '0005_vendorreturnimportlog_company_scope_reference_and_more'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, reverse_code=reverse_missing_columns),
    ]
