import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.media.models import MediaAsset

print("Total MediaAsset count:", MediaAsset.objects.count())
for ma in MediaAsset.objects.all():
    print(f"ID: {ma.id}")
    print(f"  Owner: {ma.owner_record_id}")
    print(f"  Storage Key: {ma.storage_key}")
    print(f"  Status: {ma.status}")
