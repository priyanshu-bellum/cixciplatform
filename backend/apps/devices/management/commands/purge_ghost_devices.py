import logging
from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Permanently purge ghost/corrupted device records and update referencing entries."

    def handle(self, *args, **options):
        from apps.devices.models import (
            Device, DeviceFeatureAssignment, CompatibilityMarker,
            DataQualityException, BuyerDevicePortfolioReference,
            BuyerDevicePortfolioChangeRecord, BuyerDevicePortfolioSnapshot
        )
        from apps.catalog.models import ProductCompatibilityAssertion, BuyerScopedCompatibilityProjection
        from apps.catalog.services import recalculate_buyer_compatibility_projection

        # 1. Identify ghost devices based on malformed name structures or exact feature matches
        ghost_devices = []
        for device in Device.objects.all():
            name = device.name
            # Comma, plus, or semicolon delimiters
            if any(char in name for char in [",", "+", ";"]):
                ghost_devices.append(device)
            # Exact matches to common feature/interface compatibility attributes
            elif name.strip().lower() in [
                "lightning", "magsafe", "qi", "qi2", "type-c", "microsd",
                "microsdhc", "microsdxc", "40mm", "41mm", "42mm", "44mm",
                "45mm", "46mm", "49mm"
            ]:
                ghost_devices.append(device)

        if not ghost_devices:
            self.stdout.write(self.style.SUCCESS("No ghost/corrupted device records found in the database."))
            return

        self.stdout.write(self.style.WARNING(f"Found {len(ghost_devices)} ghost/corrupted device records to purge:"))
        for gd in ghost_devices:
            self.stdout.write(f"  - [{gd.id}] {gd.manufacturer.name} {gd.name}")

        with transaction.atomic():
            ghost_ids = [device.id for device in ghost_devices]
            ghost_ids_str = [str(x) for x in ghost_ids]

            # Delete related models with PROTECT or CASCADE referencing these devices
            self.stdout.write("Deleting associated DeviceFeatureAssignment records...")
            DeviceFeatureAssignment.objects.filter(device_id__in=ghost_ids).delete()

            self.stdout.write("Deleting associated CompatibilityMarker records...")
            CompatibilityMarker.objects.filter(device_id__in=ghost_ids).delete()

            self.stdout.write("Deleting associated DataQualityException records...")
            DataQualityException.objects.filter(device_id__in=ghost_ids).delete()

            self.stdout.write("Deleting associated BuyerDevicePortfolioChangeRecord records...")
            BuyerDevicePortfolioChangeRecord.objects.filter(device_id__in=ghost_ids).delete()

            self.stdout.write("Deleting associated BuyerDevicePortfolioReference records...")
            BuyerDevicePortfolioReference.objects.filter(device_id__in=ghost_ids).delete()

            self.stdout.write("Deleting ProductCompatibilityAssertion records referencing ghost device UUIDs...")
            ProductCompatibilityAssertion.objects.filter(device_reference__in=ghost_ids_str).delete()

            # Clean up JSON lists in BuyerDevicePortfolioSnapshot
            self.stdout.write("Cleaning up device lists in BuyerDevicePortfolioSnapshot records...")
            for snapshot in BuyerDevicePortfolioSnapshot.objects.all():
                if snapshot.device_ids:
                    original_list = snapshot.device_ids
                    new_list = [d for d in original_list if d not in ghost_ids_str and d not in ghost_ids]
                    if len(new_list) != len(original_list):
                        BuyerDevicePortfolioSnapshot.objects.filter(pk=snapshot.id).update(
                            device_ids=new_list,
                            device_count=len(new_list)
                        )

            # Finally, delete the devices
            self.stdout.write("Deleting Device records from database...")
            deleted_count, _ = Device.objects.filter(id__in=ghost_ids).delete()

            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted_count} Device records and associated dependencies."))

            # Recalculate projections for all buyers
            self.stdout.write("Recalculating buyer compatibility projections...")
            for proj in BuyerScopedCompatibilityProjection.objects.all():
                try:
                    recalculate_buyer_compatibility_projection(
                        buyer_reference=proj.buyer_reference,
                        company_scope_reference=proj.company_scope_reference,
                        buyer_entity_reference=proj.buyer_entity_reference,
                        portfolio_snapshot_reference=proj.portfolio_snapshot_reference,
                        trigger="database_purge",
                    )
                    self.stdout.write(f"  - Recalculated projection for buyer {proj.buyer_reference}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  - Failed to recalculate projection for {proj.buyer_reference}: {e}"))

            self.stdout.write(self.style.SUCCESS("All tasks completed successfully."))
