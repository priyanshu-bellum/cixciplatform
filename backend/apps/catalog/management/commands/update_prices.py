"""
Management command: update_prices
Updates product prices (MAP, Wholesale, MSRP) from an Excel (.xlsx) file.

The file must have a header row with at least a "SKU" column.
Recognised price columns (case-insensitive):
  - MAP Price      → product.map_price
  - Wholesale Price / Vendor Wholesale Price → product.vendor_wholesale_price_amount
  - MSRP           → product.msrp

Usage:
  python manage.py update_prices /path/to/file.xlsx              # dry-run (preview)
  python manage.py update_prices /path/to/file.xlsx --apply      # apply changes
  python manage.py update_prices /path/to/file.xlsx --apply --vendor SaharaCase
"""
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand


def parse_decimal(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        cleaned = str(val).replace("$", "").replace(",", "").strip()
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def normalize(header):
    return "".join(c for c in str(header).lower() if c.isalnum())


class Command(BaseCommand):
    help = "Update product prices from an Excel file (match by SKU)"

    def add_arguments(self, parser):
        parser.add_argument("file", help="Path to .xlsx file")
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes to the database (without this flag, dry-run only)",
        )
        parser.add_argument(
            "--vendor",
            type=str,
            default="",
            help="Only update products belonging to this vendor company name (optional safety filter)",
        )

    def handle(self, *args, **options):
        import openpyxl
        from apps.catalog.models import Product

        filepath = options["file"]
        apply = options["apply"]
        vendor_filter = options["vendor"].strip()

        self.stdout.write(self.style.HTTP_INFO("=" * 70))
        self.stdout.write(self.style.HTTP_INFO(
            f"  PRICE UPDATE {'(APPLYING)' if apply else '(DRY RUN)'}"
        ))
        self.stdout.write(self.style.HTTP_INFO(f"  File: {filepath}"))
        if vendor_filter:
            self.stdout.write(self.style.HTTP_INFO(f"  Vendor filter: {vendor_filter}"))
        self.stdout.write(self.style.HTTP_INFO("=" * 70))

        # --- Parse Excel ---
        try:
            wb = openpyxl.load_workbook(filepath, data_only=True)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Cannot open file: {e}"))
            return

        ws = wb.active
        sheet_rows = list(ws.iter_rows(values_only=True))
        if not sheet_rows:
            self.stderr.write(self.style.ERROR("File is empty"))
            return

        raw_headers = [str(h).strip() if h is not None else "" for h in sheet_rows[0]]
        norm_headers = [normalize(h) for h in raw_headers]

        # --- Locate columns ---
        sku_col = None
        map_col = None
        wholesale_col = None
        msrp_col = None

        for i, nh in enumerate(norm_headers):
            if nh == "sku":
                sku_col = i
            elif nh in ("mapprice", "map"):
                map_col = i
            elif nh in ("wholesaleprice", "vendorwholesaleprice", "vendorwholesalepriceamount"):
                wholesale_col = i
            elif nh == "msrp":
                msrp_col = i

        if sku_col is None:
            self.stderr.write(self.style.ERROR("No 'SKU' column found in header row"))
            return

        price_cols = []
        if map_col is not None:
            price_cols.append(f"MAP Price (col {map_col + 1})")
        if wholesale_col is not None:
            price_cols.append(f"Wholesale Price (col {wholesale_col + 1})")
        if msrp_col is not None:
            price_cols.append(f"MSRP (col {msrp_col + 1})")

        if not price_cols:
            self.stderr.write(self.style.ERROR(
                "No price columns found. Expected: MAP Price, Wholesale Price, MSRP"
            ))
            return

        self.stdout.write(f"\nDetected price columns: {', '.join(price_cols)}")
        self.stdout.write(f"Data rows: {len(sheet_rows) - 1}\n")

        # --- Optional vendor filter ---
        vendor_ids = set()
        if vendor_filter:
            from apps.tenant.models import Company
            vendors = Company.objects.filter(name__icontains=vendor_filter, company_type="vendor")
            if not vendors.exists():
                self.stderr.write(self.style.ERROR(
                    f"No vendor company found matching '{vendor_filter}'"
                ))
                return
            vendor_ids = set(vendors.values_list("id", flat=True))
            self.stdout.write(f"Matched vendor(s): {', '.join(v.name for v in vendors)}\n")

        # --- Process rows ---
        updated = 0
        skipped = 0
        not_found = 0
        errors = 0

        for row_idx, row_cells in enumerate(sheet_rows[1:], start=2):
            cells = list(row_cells) if row_cells else []
            if sku_col >= len(cells):
                continue

            sku = str(cells[sku_col] or "").strip()
            if not sku:
                continue

            product = Product.objects.filter(sku=sku).first()
            if not product:
                self.stdout.write(self.style.WARNING(f"  Row {row_idx}: SKU '{sku}' NOT FOUND"))
                not_found += 1
                continue

            if vendor_ids and product.vendor_company_reference not in vendor_ids:
                self.stdout.write(
                    f"  Row {row_idx}: SKU '{sku}' belongs to different vendor, skipping"
                )
                skipped += 1
                continue

            changes = []
            update_fields = []

            # MAP Price
            if map_col is not None and map_col < len(cells):
                new_map = parse_decimal(cells[map_col])
                old_map = product.map_price
                if new_map != old_map:
                    changes.append(f"map_price: {old_map} → {new_map}")
                    product.map_price = new_map
                    update_fields.append("map_price")

            # Wholesale Price
            if wholesale_col is not None and wholesale_col < len(cells):
                new_ws = parse_decimal(cells[wholesale_col])
                old_ws = product.vendor_wholesale_price_amount
                if new_ws != old_ws:
                    changes.append(f"wholesale: {old_ws} → {new_ws}")
                    product.vendor_wholesale_price_amount = new_ws
                    update_fields.append("vendor_wholesale_price_amount")

            # MSRP
            if msrp_col is not None and msrp_col < len(cells):
                new_msrp = parse_decimal(cells[msrp_col])
                old_msrp = product.msrp
                if new_msrp != old_msrp:
                    changes.append(f"msrp: {old_msrp} → {new_msrp}")
                    product.msrp = new_msrp
                    update_fields.append("msrp")

            if not changes:
                self.stdout.write(f"  Row {row_idx}: SKU '{sku}' — no changes needed")
                skipped += 1
                continue

            self.stdout.write(
                self.style.SUCCESS(f"  Row {row_idx}: SKU '{sku}' — {', '.join(changes)}")
            )

            if apply:
                try:
                    product.save(update_fields=update_fields)
                    updated += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(
                        f"  Row {row_idx}: SKU '{sku}' SAVE FAILED: {e}"
                    ))
                    errors += 1
            else:
                updated += 1

        # --- Summary ---
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"  {'Updated' if apply else 'Would update'}: {updated}")
        self.stdout.write(f"  Skipped (no change):  {skipped}")
        self.stdout.write(f"  Not found:            {not_found}")
        if errors:
            self.stdout.write(self.style.ERROR(f"  Errors:               {errors}"))

        if not apply and updated > 0:
            self.stdout.write(self.style.WARNING(
                f"\n  This was a DRY RUN. Run with --apply to save changes."
            ))
        elif apply and updated > 0:
            self.stdout.write(self.style.SUCCESS(f"\n  {updated} products updated successfully."))
