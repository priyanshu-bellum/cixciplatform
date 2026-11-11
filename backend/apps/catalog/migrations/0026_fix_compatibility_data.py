"""Compatibility migration graph placeholder; correction is an explicit command.

An earlier uncommitted version was applied to the developer's restored clone.
It deleted Universal assertions and could not reverse them. Keep its graph
identity, but do not silently modify supplier data on other environments.
Use the audited repair_compatibility command (dry-run by default) for review
and authorized corrections. Never fake a reversal of the earlier deletion.
"""
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0025_rename_catalog_buyer_prod_comp_dev_idx_catalog_buy_company_4d82bf_idx"),
    ]
    operations = []
