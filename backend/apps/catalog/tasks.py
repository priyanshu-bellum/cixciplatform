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


@shared_task
def process_buyer_export_job(job_id):
    """
    Background Celery task to process and format buyer product exports.
    Saves the output to MEDIA_ROOT and creates a MediaAsset record.
    """
    from apps.catalog.models import BuyerProductExportJob, BuyerProductExportSelectionSnapshot, Product
    from apps.media.models import MediaAsset
    from django.conf import settings
    from django.utils import timezone
    import json
    import csv
    import os
    import uuid

    try:
        job = BuyerProductExportJob.objects.get(id=job_id)
    except BuyerProductExportJob.DoesNotExist:
        return

    job.status = "running"
    job.started_at = timezone.now()
    job.save()

    try:
        # Resolve product_ids
        snapshot = BuyerProductExportSelectionSnapshot.objects.filter(export_job=job).first()
        product_ids = snapshot.product_ids if snapshot else []

        if not product_ids:
            # If no explicit product_ids selected, resolve from the buyer's compatibility projection
            from apps.catalog.models import BuyerScopedCompatibilityProjection
            proj = BuyerScopedCompatibilityProjection.objects.filter(
                buyer_reference=job.buyer_reference,
                company_scope_reference=job.company_scope_reference,
                buyer_entity_reference=job.buyer_entity_reference
            ).first()
            if proj:
                product_ids = list(proj.compatible_product_ids)
                if job.include_incompatible:
                    product_ids.extend(list(proj.incompatible_product_ids))
            
            # Update selection snapshot with resolved product_ids if it exists
            if snapshot:
                BuyerProductExportSelectionSnapshot.objects.filter(id=snapshot.id).update(product_ids=product_ids)

        # Fetch products
        products = Product.objects.filter(id__in=product_ids)
        job.product_count = products.count()

        # Build products snapshot
        from apps.tenant.models import Company
        from apps.media.models import MediaAsset
        from django.conf import settings
        products_snapshot = []
        for p in products:
            vendor = Company.objects.filter(id=p.vendor_company_reference).first()
            vendor_name = vendor.name if vendor else "Unknown Vendor"
            
            # Resolve image URL
            image_url = ""
            if p.primary_image_reference:
                try:
                    asset = MediaAsset.objects.get(id=p.primary_image_reference)
                    if asset.status == "ready":
                        media_url = getattr(settings, "MEDIA_URL", "/media/")
                        image_url = f"{media_url}{asset.storage_key}"
                except Exception:
                    pass
            if not image_url and isinstance(p.media_references, list) and len(p.media_references) > 0:
                image_url = p.media_references[0]

            products_snapshot.append({
                "product_id": str(p.id),
                "vendor_name": vendor_name,
                "primary_image_url": image_url or "",
                "product_name": p.name,
                "sku": p.sku,
                "upc": p.upc or ""
            })

        if snapshot:
            BuyerProductExportSelectionSnapshot.objects.filter(id=snapshot.id).update(
                product_ids=product_ids,
                exported_products_snapshot=products_snapshot
            )

        # Format output
        content = ""
        filename = f"export_{job.id}.json" if job.format == "API" else f"export_{job.id}.{job.format}"
        mime_type = "application/json" if job.format == "API" else "text/csv"

        headers = [
            "id", "sku", "name", "brand", "product_category", "product_type",
            "status", "vendor_wholesale_price_amount", "vendor_wholesale_price_currency",
            "msrp", "map_price", "sale_price", "upc", "launch_date", "release_date",
            "eol_date", "color", "short_description"
        ]
        
        if job.format in ["json", "API"]:
            mime_type = "application/json"
            data_list = []
            for p in products:
                data_list.append({h: str(getattr(p, h)) if getattr(p, h) is not None else "" for h in headers})
            content = json.dumps(data_list, indent=2)
        else:
            # CSV or XLSX fallback
            import io
            f_out = io.StringIO()
            writer = csv.writer(f_out)
            writer.writerow(headers)
            for p in products:
                writer.writerow([getattr(p, h) for h in headers])
            content = f_out.getvalue()
            if job.format == "xlsx":
                mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                mime_type = "text/csv"

        # Create a MediaAsset for the output file
        storage_key = f"exports/{job.company_scope_reference}/{job.id}/{filename}"
        
        asset = MediaAsset.objects.create(
            id=uuid.uuid4(),
            asset_type="document",
            status="ready",
            owner_module="catalog",
            owner_record_id=job.id,
            company_scope_reference=job.company_scope_reference,
            original_filename=filename,
            file_extension="json" if job.format == "API" else job.format,
            mime_type=mime_type,
            storage_key=storage_key,
            storage_provider="local",
            file_size_bytes=len(content.encode("utf-8")),
            content_hash=uuid.uuid4().hex
        )

        # Save file to MEDIA_ROOT
        full_path = os.path.join(settings.MEDIA_ROOT, storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

        # Update job status
        job.output_file_reference = asset.id
        job.status = "completed"
        job.completed_at = timezone.now()
        job.save()

        # Update or create BuyerProductExportDate records for each product
        from apps.catalog.models import BuyerProductExportDate
        for product_id in product_ids:
            BuyerProductExportDate.objects.update_or_create(
                buyer_reference=job.buyer_reference,
                company_scope_reference=job.company_scope_reference,
                buyer_entity_reference=job.buyer_entity_reference,
                product_id=product_id,
                defaults={
                    "exported_at": job.completed_at
                }
            )

    except Exception as e:
        job.status = "failed"
        job.completed_at = timezone.now()
        job.failure_details = str(e)
        job.save()
        raise e

