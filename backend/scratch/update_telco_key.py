import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.integration.models import CompanyAPIKey

old_token = 'cixci_key_240da5440d234266b1277737a8920f83d1edb9e78388e3b5'
new_token = 'cixci_key_fab27b938452fc44e137592f38f7ada03de80374ecffca3f'

print("Listing all API keys:")
keys = CompanyAPIKey.objects.all()
for k in keys:
    print(f"ID: {k.id}, Label: {k.label}, Token: {k.token}, Scope: {k.company_scope_reference}")

match_old = CompanyAPIKey.objects.filter(token=old_token).first()
if match_old:
    print(f"Found key with old token. Updating to new token...")
    match_old.token = new_token
    match_old.save()
    print("Update successful!")
else:
    # If the old token isn't found, let's see if we should create or update any key with 'Telco' in the label.
    telco_key = CompanyAPIKey.objects.filter(label__icontains="Telco").first()
    if telco_key:
        print(f"Found key with label '{telco_key.label}'. Updating token to new token...")
        telco_key.token = new_token
        telco_key.save()
        print("Update successful!")
    else:
        # Create a key if not found
        from apps.tenant.models import Company
        telco_co = Company.objects.filter(name__icontains="Telco").first()
        if not telco_co:
            telco_co = Company.objects.filter(company_type="buyer").first()
        if telco_co:
            print(f"Creating a new key for company '{telco_co.name}' ({telco_co.id}) with the new token...")
            CompanyAPIKey.objects.create(
                company_scope_reference=telco_co.id,
                label="Telco Storefront Key",
                token=new_token,
                is_active=True
            )
            print("Creation successful!")
        else:
            print("No company found to assign B2B key.")
