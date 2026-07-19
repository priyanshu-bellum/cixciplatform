import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import User

try:
    for email in ["vendor@cixci.com", "buyer@cixci.com", "admin@cixci.com"]:
        try:
            u = User.objects.get(email=email)
            u.set_password("password")
            u.save()
            print(f"Successfully set password for {email} to 'password'")
        except User.DoesNotExist:
            print(f"User {email} does not exist")
except Exception as e:
    print("Error:", e)
