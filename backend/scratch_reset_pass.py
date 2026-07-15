import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import User

try:
    u = User.objects.get(email="vendor@cixci.com")
    u.set_password("password")
    u.save()
    print("Successfully set password for vendor@cixci.com to 'password'")
except Exception as e:
    print("Error:", e)
