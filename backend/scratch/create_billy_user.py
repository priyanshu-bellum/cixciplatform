import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import Company, CompanyEntity, User, Capability

def create_or_update_billy():
    # Ensure company MVNO Test exists
    company, _ = Company.objects.get_or_create(
        name="MVNO Test",
        defaults={
            "company_type": "buyer",
            "slug": "mvno-test",
            "status": "active",
        }
    )
    if company.company_type != "buyer":
        company.company_type = "buyer"
        company.save()

    # Ensure Entity exists
    entity, _ = CompanyEntity.objects.get_or_create(
        company=company,
        name="MVNO Test HQ",
        defaults={"status": "active"}
    )

    # Ensure User billy@mvno.com exists
    user = User.objects.filter(email="billy@mvno.com").first()
    if not user:
        user = User.objects.create_user(
            email="billy@mvno.com",
            entity=entity,
            password="billy1234",
            first_name="Billy",
            last_name="Admin",
            is_active=True,
        )
        print("Created user billy@mvno.com")
    else:
        user.set_password("billy1234")
        user.entity = entity
        user.is_active = True
        user.save()
        print("Updated user billy@mvno.com password to billy1234")

    # Assign buyer capabilities
    buyer_modules = ['devices', 'catalog', 'pricing', 'invoicing', 'procurement', 'tenant', 'media', 'analytics', 'integration', 'notifications', 'launch', 'fulfillment', 'routing']
    caps = Capability.objects.filter(module__in=buyer_modules)
    user.capabilities.set(caps)
    company.capabilities.set(caps)
    print(f"Assigned {caps.count()} capabilities to billy@mvno.com")

if __name__ == "__main__":
    create_or_update_billy()
