import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import User

# Reset vendor password
vendor = User.objects.filter(email="vendor@cixci.com").first()
if vendor:
    vendor.set_password("vendor1234")
    vendor.save()
    print("vendor@cixci.com password reset to: vendor1234")

# Reset buyer password
buyer = User.objects.filter(email="buyer@cixci.com").first()
if buyer:
    buyer.set_password("buyer1234")
    buyer.save()
    print("buyer@cixci.com password reset to: buyer1234")

# Reset admin password
admin = User.objects.filter(email="admin@cixci.com").first()
if admin:
    admin.set_password("admin1234")
    admin.save()
    print("admin@cixci.com password reset to: admin1234")
