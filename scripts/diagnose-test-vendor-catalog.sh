#!/usr/bin/env bash
# Read-only test diagnostics. Does not run migrations, jobs, syncs or deployments.
set -euo pipefail
test_root=/srv/cixci/test
test_container=cixci_backend_test
if [[ "$(readlink -f "$test_root")" != /srv/cixci/test || "$(readlink -f "$test_root/backend")" != /srv/cixci/test/backend ]]; then
  echo 'Refusing: test deployment path is unexpected.' >&2; exit 1
fi
test_bind=$(docker inspect "$test_container" --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')
if [[ "$test_bind" != /srv/cixci/test/backend ]]; then
  echo 'Refusing: backend /app is not bound to the test deployment.' >&2; exit 1
fi
docker inspect "$test_container" --format 'Test backend: {{.State.Status}} image={{.Image}}'
docker exec -i "$test_container" python - <<'PY'
import os,json
from pathlib import Path
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
from django.conf import settings
database=settings.DATABASES['default']
name=str(database.get('NAME','')).casefold()
if 'test' not in name or any(word in name for word in ('live','prod')):
    raise SystemExit('Refusing database access: configured database name is not explicitly a test database.')
import django;django.setup()
from django.db import connection
if connection.vendor!='postgresql':
    raise SystemExit('Refusing: expected the test PostgreSQL backend.')
with connection.cursor() as cursor:
    cursor.execute('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY')
from django.db.models import Count
from apps.integration.models import VendorCatalogConnection
from apps.integration.catalog_config import path_value
from apps.catalog.models import Product
from apps.catalog.api import ProductViewSet
from apps.media.models import MediaAsset
from apps.tenant.models import User
from rest_framework.test import APIClient
print(json.dumps({'test_database':database['NAME'],'storage':{'s3':settings.USE_S3,'gcs':settings.USE_GCS},
 'buyer_media_gate':settings.MEDIA_READINESS_ENFORCE_BUYER,
 'regional_gate':settings.REGIONAL_VISIBILITY_ENFORCE,
 'vendor_audit_installed':hasattr(ProductViewSet,'vendor_audit')}))
for feed in VendorCatalogConnection.objects.filter(endpoint_url__icontains='balajibrands.com').select_related('vendor_company'):
    products=Product.objects.filter(vendor_company_reference=feed.vendor_company_id)
    sources=feed.source_items.all()
    image_path=feed.config.get('fields',{}).get('images',{}).get('path','image_urls')
    assets=list(MediaAsset.objects.filter(pk__in=products.exclude(primary_image_reference=None).values('primary_image_reference')))
    missing=None
    if not settings.USE_S3 and not settings.USE_GCS:
        missing=sum(not (Path(settings.MEDIA_ROOT)/asset.storage_key).is_file() for asset in assets)
    print(json.dumps({'connection_id':str(feed.pk),'vendor_status':feed.vendor_company.status,
      'source_rows':sources.count(),'review_rows':sources.filter(review_required=True).count(),
      'unlinked_sources':sources.filter(product_id=None).count(),'product_count':products.count(),
      'products_without_primary':products.filter(primary_image_reference=None).count(),
      'missing_primary_asset_rows':products.exclude(primary_image_reference=None).count()-len(assets),
      'primary_files_missing_on_local_storage':missing,
      'sources_with_image_urls':sum(bool(path_value(raw,image_path)) for raw in sources.values_list('payload',flat=True)),
      'states':list(products.values('status','compatibility_mode').annotate(count=Count('id')))},default=str))
host=next((value.lstrip('.') for value in settings.ALLOWED_HOSTS if value!='*'),'localhost')
for name in ('Telco Cellular','Kaseory'):
    user=User.objects.filter(entity__company__name__iexact=name,is_active=True,is_cixci_admin=False).select_related('entity__company').first()
    if user is None:
        print(json.dumps({'buyer':name,'result':'No active buyer login found'}));continue
    client=APIClient();client.force_authenticate(user=user)
    counts={}
    for brand in ('ZIZO','Nimbus9','CLICK'):
        response=client.get('/api/v1/catalog/products/',{'brand':brand,'page_size':1},HTTP_HOST=host)
        counts[brand]={'http':response.status_code,'count':response.data.get('count') if isinstance(response.data,dict) else None}
    print(json.dumps({'buyer':name,'brands':counts}))
PY

# Compare worker storage flags without exposing env files or credential values.
if docker inspect cixci_celery_test >/dev/null 2>&1; then
  docker exec cixci_celery_test python -c 'import os,json; print(json.dumps({"test_worker":True,"storage_flags_present":{key:os.environ.get(key,"not set") for key in ("USE_GCS","USE_S3")}}))'
fi
