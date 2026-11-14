"""Record which approved connector configuration processed each source row.

Existing rows remain unknown, so their next sync revalidates against the saved
configuration rather than guessing that the previous rules were identical.
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('integration', '0003_vendorcatalogbudget_vendorcatalogconnection_and_more')]
    operations = [migrations.AddField(
        model_name='vendorcatalogitem', name='applied_config_version',
        field=models.UUIDField(null=True, blank=True, editable=False),
    )]
