import os
import django

# Default to local settings if not set
if not os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")

django.setup()

from apps.tenant.models import User

email = "admin@cixci.com"
password = "adminpass123"

user, created = User.objects.get_or_create(
    email=email,
    defaults={
        "is_staff": True,
        "is_superuser": True,
        "is_cixci_admin": True,
        "is_active": True,
    }
)

user.set_password(password)
user.is_staff = True
user.is_superuser = True
user.is_cixci_admin = True
user.is_active = True
user.save()

if created:
    print(f"Created new admin user: {email}")
else:
    print(f"Updated existing admin user password for: {email}")
