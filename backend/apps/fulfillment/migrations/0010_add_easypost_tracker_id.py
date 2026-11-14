from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fulfillment', '0009_add_buyer_shipment_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='fulfillmenthandoff',
            name='easypost_tracker_id',
            field=models.CharField(
                blank=True, default='', max_length=100,
                help_text='EasyPost tracker ID — populated when EasyPost takes over tracking for this shipment',
            ),
        ),
    ]
