import pytz
from django.utils import timezone
from celery import shared_task
from apps.catalog.models import Product, ProductStatus
from apps.catalog.services import log_catalog_audit

@shared_task
def update_product_statuses_by_date():
    """
    Automated job to:
    1. Move eligible products from Inactive to Active when Launch Date is reached (Launch Date <= today_est).
    2. Move eligible products from Active to EOL when EOL Date is reached (EOL Date <= today_est).
    """
    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()
    
    # 1. Inactive -> Active
    inactive_products = Product.objects.filter(status=ProductStatus.INACTIVE, launch_date__lte=today_est)
    for prod in inactive_products:
        if prod.launch_date.year == 9999:
            continue
        prod.status = ProductStatus.ACTIVE
        # Save updating only status to trigger signals and log
        prod.save(update_fields=["status", "updated_at"])
        
    # 2. Active -> EOL
    active_products = Product.objects.filter(status=ProductStatus.ACTIVE, eol_date__lte=today_est)
    for prod in active_products:
        prod.status = ProductStatus.EOL
        prod.save(update_fields=["status", "updated_at"])
