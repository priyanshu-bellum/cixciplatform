"""
One-time backfill: create MediaAsset records from existing product
media_references URLs so the short-URL proxy system has data to work with.

Usage:
    python manage.py backfill_media_assets --dry-run   # preview
    python manage.py backfill_media_assets              # execute
"""
import re
import uuid

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Product
from apps.media.models import MediaAsset


def extract_storage_key(url):
    """Extract the object key from an S3 or GCS URL."""
    # S3:  https://bucket.s3.region.amazonaws.com/key
    # S3:  https://bucket.s3.amazonaws.com/key
    m = re.match(r"https?://[^/]+\.amazonaws\.com/(.+)$", url)
    if m:
        return m.group(1)
    # GCS: https://storage.googleapis.com/bucket/key
    m = re.match(r"https?://storage\.googleapis\.com/[^/]+/(.+)$", url)
    if m:
        return m.group(1)
    return None


class Command(BaseCommand):
    help = "Create MediaAsset records from existing product media_references URLs"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview what would be created without writing to the DB",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        products = Product.objects.exclude(media_references=[]).exclude(
            media_references=None
        )
        total = products.count()
        self.stdout.write(f"Found {total} products with media_references")
        if total == 0:
            return

        created = 0
        linked = 0
        skipped = 0

        for i, product in enumerate(products.iterator(), 1):
            refs = product.media_references
            if not isinstance(refs, list) or not refs:
                continue

            first_asset_id = None

            for idx, url in enumerate(refs):
                if not isinstance(url, str) or not url.startswith("http"):
                    continue

                storage_key = extract_storage_key(url)
                if not storage_key:
                    skipped += 1
                    if i <= 5:
                        self.stdout.write(
                            self.style.WARNING(f"  SKIP: {url[:80]}")
                        )
                    continue

                filename = storage_key.rsplit("/", 1)[-1] if "/" in storage_key else storage_key
                ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
                mime_map = {
                    "png": "image/png",
                    "jpg": "image/jpeg",
                    "jpeg": "image/jpeg",
                    "webp": "image/webp",
                    "gif": "image/gif",
                }
                mime = mime_map.get(ext, f"image/{ext}" if ext else "application/octet-stream")

                asset_id = uuid.uuid4()

                if not dry_run:
                    MediaAsset.objects.create(
                        id=asset_id,
                        asset_type="product_image",
                        status="ready",
                        review_status="approved",
                        owner_module="catalog",
                        owner_record_id=product.id,
                        company_scope_reference=product.vendor_company_reference,
                        original_filename=filename,
                        file_extension=ext,
                        mime_type=mime,
                        has_transparency=(ext == "png"),
                        storage_key=storage_key,
                        storage_provider="s3",
                        is_public=True,
                        display_order=idx,
                    )

                if idx == 0:
                    first_asset_id = asset_id
                created += 1

            if first_asset_id:
                if not dry_run:
                    Product.objects.filter(id=product.id).update(
                        primary_image_reference=first_asset_id
                    )
                linked += 1

            if i % 200 == 0:
                self.stdout.write(f"  Processed {i}/{total} products...")

        verb = "Would create" if dry_run else "Created"
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{verb} {created} MediaAsset records, "
                f"{linked} products linked with primary image, "
                f"{skipped} URLs skipped"
            )
        )
