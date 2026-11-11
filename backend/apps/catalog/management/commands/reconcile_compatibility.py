"""Explicit, audited rebuild through the shared runtime compatibility engine."""
import json
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.catalog.models import Product, BuyerScopedCompatibilityProjection
from apps.catalog.compatibility_engine import reconcile_product_compatibility
from apps.catalog.services import recalculate_buyer_compatibility_projection
from apps.tenant.services import check_access
from apps.audit.models import AuditRecord


class Command(BaseCommand):
    help = "Plan a compatibility rebuild; use --apply --actor <admin UUID> to execute."

    def add_arguments(self, parser):
        scope = parser.add_mutually_exclusive_group(required=True)
        scope.add_argument("--all", action="store_true")
        scope.add_argument("--product", type=uuid.UUID)
        scope.add_argument("--vendor", type=uuid.UUID)
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--actor", type=uuid.UUID)

    def handle(self, *args, **options):
        products = Product.objects.order_by("pk")
        if options["product"]:
            products = products.filter(pk=options["product"])
        elif options["vendor"]:
            products = products.filter(vendor_company_reference=options["vendor"])
        count = products.count()
        if not options["apply"]:
            self.stdout.write(json.dumps({"read_only": True, "products_to_reconcile": count, "note": "Plan only; does not predict or write mapping changes."}))
            return
        actor = get_user_model().objects.filter(pk=options["actor"], is_active=True).first()
        if actor is None or check_access(actor, "catalog.product.update").reason != "cixci_admin":
            raise CommandError("--apply requires an active authorized CIXCI System Admin actor.")
        run_id = uuid.uuid4()
        def audit(status, details):
            AuditRecord.objects.create(event_code="catalog.compatibility.rebuild", status=status, event_description=json.dumps(details),
                actor_reference=actor.id, company_scope_reference=uuid.UUID(int=0), source_module="catalog",
                source_record_type="CompatibilityRebuild", source_record_id=run_id)
        changed, completed = 0, 0
        audit("success", {"phase": "started", "products": count})
        try:
            for product in products.iterator(chunk_size=200):
                changed += reconcile_product_compatibility(product, actor.id, "Approved Configuration Rebuild", notify=False)
                completed += 1
                if completed % 100 == 0:
                    self.stdout.write(f"Reconciled {completed}/{count} products.")
            # Refresh each current projection once after the product batch.
            for projection in BuyerScopedCompatibilityProjection.objects.all().iterator(chunk_size=100):
                recalculate_buyer_compatibility_projection(projection.buyer_reference, projection.company_scope_reference,
                    projection.buyer_entity_reference, projection.portfolio_snapshot_reference, trigger="compatibility_rebuild")
        except Exception as error:
            audit("failure", {"phase": "failed", "completed": completed, "error": str(error), "resume": "Rerun the same scope; reconciliation is idempotent."})
            raise CommandError(str(error)) from error
        audit("success", {"phase": "completed", "products": completed, "mapping_changes": changed})
        self.stdout.write(json.dumps({"products": completed, "mapping_changes": changed, "audit_reference": str(run_id)}))
