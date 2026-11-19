"""Batch-activate products that pass media readiness.

Usage:
  # Dry-run (default) — shows what would be activated
  python manage.py batch_activate_products --vendor 6360b2ba-7606-4946-8f51-3ea3975a7d20

  # Actually activate
  python manage.py batch_activate_products --vendor 6360b2ba-7606-4946-8f51-3ea3975a7d20 --commit

  # All non-active products (no vendor filter)
  python manage.py batch_activate_products --commit
"""
from django.core.management.base import BaseCommand

from apps.catalog.models import Product


class Command(BaseCommand):
    help = "Batch-activate products that pass media readiness checks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--vendor", type=str, default=None,
            help="Filter by vendor_company_reference UUID",
        )
        parser.add_argument(
            "--commit", action="store_true",
            help="Actually update products (default is dry-run)",
        )
        parser.add_argument(
            "--include-statuses", nargs="+", default=["draft", "pending_review"],
            help="Product statuses to consider for activation (default: draft pending_review)",
        )

    def handle(self, *args, **options):
        from apps.media.readiness import compute_media_readiness

        qs = Product.objects.filter(status__in=options["include_statuses"])
        if options["vendor"]:
            qs = qs.filter(vendor_company_reference=options["vendor"])

        total = qs.count()
        self.stdout.write(f"Checking {total} products...")

        ready = []
        not_ready = []
        for p in qs.iterator(chunk_size=200):
            r = compute_media_readiness(p)
            if r.is_ready:
                ready.append(p.pk)
            else:
                not_ready.append((p.pk, p.sku or p.name, r.reason))

        self.stdout.write(f"\nResults: {len(ready)} ready, {len(not_ready)} not ready")

        if not_ready:
            self.stdout.write(self.style.WARNING(f"\nNot ready ({len(not_ready)}):"))
            for pk, label, reason in not_ready[:20]:
                self.stdout.write(f"  {pk} ({label}): {reason}")
            if len(not_ready) > 20:
                self.stdout.write(f"  ... and {len(not_ready) - 20} more")

        if not ready:
            self.stdout.write(self.style.WARNING("No products to activate."))
            return

        if not options["commit"]:
            self.stdout.write(self.style.SUCCESS(
                f"\n[DRY RUN] Would activate {len(ready)} products. "
                f"Re-run with --commit to apply."
            ))
            return

        updated = Product.objects.filter(pk__in=ready).update(status="active")
        self.stdout.write(self.style.SUCCESS(f"\nActivated {updated} products."))
