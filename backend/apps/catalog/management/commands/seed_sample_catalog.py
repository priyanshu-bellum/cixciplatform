"""Seed (or remove) a media-complete sample catalog for staging/demo testing."""
from django.core.management.base import BaseCommand

from apps.catalog.sample_data import remove_sample_catalog, seed_sample_catalog


class Command(BaseCommand):
    help = (
        "Create a small, fully valid sample catalog (transparent PNG media + "
        "compatibility + activation) for a vendor so buyers can see data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--vendor",
            default="testcomm",
            help="Vendor company name (exact, case-insensitive). Default: testcomm",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be created without writing anything.",
        )
        parser.add_argument(
            "--remove",
            action="store_true",
            help="Delete previously seeded SAMPLE-* products and their media.",
        )

    def handle(self, *args, **options):
        vendor_name = options["vendor"]
        if options["remove"]:
            result = remove_sample_catalog(vendor_name)
            self.stdout.write(self.style.WARNING(f"Removed: {result}"))
            return

        result = seed_sample_catalog(
            vendor_name=vendor_name, dry_run=options["dry_run"]
        )
        if result.get("skipped"):
            self.stdout.write(
                self.style.WARNING(f"Skipped: {result['skipped']} (vendor={vendor_name})")
            )
            return

        self.stdout.write(self.style.HTTP_INFO(f"Vendor: {result['vendor_name']} ({result['vendor']})"))
        self.stdout.write(f"Device types: {', '.join(result['device_type_codes'])}")
        self.stdout.write(f"Created: {result['created']}")
        if result["existing"]:
            self.stdout.write(f"Already present: {result['existing']}")
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry run: nothing was written."))
        else:
            self.stdout.write(self.style.SUCCESS("Sample catalog seeded and projections recalculated."))
