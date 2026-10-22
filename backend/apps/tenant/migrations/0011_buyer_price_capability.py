"""Seed the buyer-facing pricing capability and grant it to buyer companies."""
from django.db import migrations

CAPABILITY_CODE = "pricing.buyer_price.list"


def seed_buyer_price_capability(apps, schema_editor):
    Capability = apps.get_model("tenant", "Capability")
    Company = apps.get_model("tenant", "Company")
    User = apps.get_model("tenant", "User")

    capability, _ = Capability.objects.get_or_create(
        code=CAPABILITY_CODE,
        defaults={
            "module": "pricing",
            "is_active": True,
            "description": "Read the prices a buyer is allowed to see (visibility evidence required).",
        },
    )

    buyer_companies = Company.objects.filter(company_type="buyer")
    for company in buyer_companies:
        company.capabilities.add(capability)

    for user in User.objects.filter(entity__company__company_type="buyer"):
        user.capabilities.add(capability)


def remove_buyer_price_capability(apps, schema_editor):
    Capability = apps.get_model("tenant", "Capability")
    Company = apps.get_model("tenant", "Company")
    User = apps.get_model("tenant", "User")

    try:
        capability = Capability.objects.get(code=CAPABILITY_CODE)
    except Capability.DoesNotExist:
        return

    for company in Company.objects.filter(company_type="buyer"):
        company.capabilities.remove(capability)
    for user in User.objects.filter(entity__company__company_type="buyer"):
        user.capabilities.remove(capability)

    capability.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("tenant", "0010_buyer_data_integration_spec"),
    ]

    operations = [
        migrations.RunPython(seed_buyer_price_capability, remove_buyer_price_capability),
    ]
