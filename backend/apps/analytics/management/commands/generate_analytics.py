"""
Populate the Analytics & Reporting read models.

The analytics app exposes read-only windows/aggregations/freshness markers, but
nothing in the codebase created them outside of tests. This command fills that
gap by generating reporting windows, running the existing aggregation task, and
recording data-freshness markers.

Usage:
    python manage.py generate_analytics
    python manage.py generate_analytics --days 90
    python manage.py generate_analytics --days 7 --window-hours 6
    python manage.py generate_analytics --force --days 2   # refresh recent data
    python manage.py generate_analytics --skip-aggregate
"""
import math
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.analytics.models import (
    ActivitySummaryReportingWindow,
    DataFreshnessMarker,
    ReportingMetric,
    WindowStatus,
)
from apps.analytics.tasks import aggregate_reporting_window_metrics

DEFAULT_METRICS = [
    {
        "code": "orders_count",
        "label": "Orders Placed",
        "source_module": "routing",
        "aggregation_method": "count",
    },
    {
        "code": "shipments_count",
        "label": "Shipments Recorded",
        "source_module": "fulfillment",
        "aggregation_method": "count",
    },
    {
        "code": "sla_exceptions_count",
        "label": "SLA Exceptions",
        "source_module": "fulfillment",
        "aggregation_method": "count",
    },
    {
        "code": "late_imports_count",
        "label": "Late Imports",
        "source_module": "fulfillment",
        "aggregation_method": "count",
    },
    {
        "code": "missing_imports_count",
        "label": "Missing Imports",
        "source_module": "fulfillment",
        "aggregation_method": "count",
    },
    {
        "code": "partial_imports_count",
        "label": "Partial Imports",
        "source_module": "fulfillment",
        "aggregation_method": "count",
    },
]


class Command(BaseCommand):
    help = (
        "Seed reporting metrics, generate reporting windows for the past N days, "
        "run the aggregation task, and record data-freshness markers."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="How many days back to generate windows for (default: 30).",
        )
        parser.add_argument(
            "--window-hours",
            type=int,
            default=24,
            help="Width of each reporting window in hours (default: 24).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-aggregate windows that already have a current aggregation.",
        )
        parser.add_argument(
            "--skip-aggregate",
            action="store_true",
            help="Create windows only; do not run aggregation.",
        )
        parser.add_argument(
            "--skip-metrics",
            action="store_true",
            help="Do not seed default reporting metric definitions.",
        )
        parser.add_argument(
            "--skip-freshness",
            action="store_true",
            help="Do not write data-freshness markers.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would happen without writing anything.",
        )

    def handle(self, *args, **options):
        days = max(1, options["days"])
        window_hours = max(1, options["window_hours"])
        dry_run = options["dry_run"]

        if not options["skip_metrics"]:
            self._seed_metrics(dry_run)

        windows, created_windows = self._generate_windows(days, window_hours, dry_run)

        aggregated = 0
        if not options["skip_aggregate"] and not dry_run:
            aggregated = self._aggregate(windows, force=options["force"])

        if not options["skip_freshness"] and not dry_run:
            self._write_freshness()

        self.stdout.write(
            self.style.SUCCESS(
                "Analytics generation complete: "
                f"{len(windows) if not dry_run else created_windows} window(s), "
                f"{aggregated} aggregation(s) refreshed."
                + (" (dry run — nothing written)" if dry_run else "")
            )
        )

    def _seed_metrics(self, dry_run):
        created = 0
        for metric in DEFAULT_METRICS:
            if dry_run:
                if not ReportingMetric.objects.filter(code=metric["code"]).exists():
                    created += 1
                continue
            _, was_created = ReportingMetric.objects.get_or_create(
                code=metric["code"],
                defaults={
                    "label": metric["label"],
                    "source_module": metric["source_module"],
                    "aggregation_method": metric["aggregation_method"],
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(f"Reporting metrics: {created} created.")

    def _window_bounds(self, days, window_hours):
        now = timezone.localtime(timezone.now())
        if window_hours == 24:
            end = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        else:
            end = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        start = end - timedelta(days=days)
        count = max(1, math.ceil((end - start).total_seconds() / (window_hours * 3600)))
        return start, end, count

    def _generate_windows(self, days, window_hours, dry_run):
        start, _end, count = self._window_bounds(days, window_hours)
        width = timedelta(hours=window_hours)

        windows = []
        created = 0
        cursor = start
        for _ in range(count):
            window_start = cursor
            window_end = cursor + width
            cursor = window_end

            window = ActivitySummaryReportingWindow.objects.filter(
                window_start=window_start, window_end=window_end
            ).first()

            if window is None:
                created += 1
                if dry_run:
                    continue
                window, _ = ActivitySummaryReportingWindow.objects.get_or_create(
                    window_start=window_start,
                    window_end=window_end,
                    defaults={
                        "effective_start": window_start,
                        "status": WindowStatus.ACTIVE,
                    },
                )
            windows.append(window)

        self.stdout.write(
            f"Reporting windows: {len(windows)} in range, {created} created."
        )
        return windows, created

    def _aggregate(self, windows, force):
        aggregated = 0
        for window in windows:
            if not force and window.aggregation_records.filter(is_current=True).exists():
                continue
            aggregate_reporting_window_metrics(str(window.id))
            aggregated += 1
        return aggregated

    def _write_freshness(self):
        from apps.routing.models import Order
        from apps.fulfillment.models import (
            DeliveryDateEvidence,
            LateFulfillmentImportException,
            MissingFulfillmentImportException,
            PartialFulfillmentResponseException,
        )

        now = timezone.now()
        sources = [
            ("routing", "order.placed", Order.objects.order_by("-created_at").values_list("id", flat=True).first()),
            (
                "fulfillment",
                "shipment.delivery_evidence",
                DeliveryDateEvidence.objects.order_by("-created_at").values_list("id", flat=True).first(),
            ),
            (
                "fulfillment",
                "sla.exception",
                LateFulfillmentImportException.objects.order_by("-created_at").values_list("id", flat=True).first(),
            ),
            (
                "fulfillment",
                "sla.missing_import_exception",
                MissingFulfillmentImportException.objects.order_by("-created_at").values_list("id", flat=True).first(),
            ),
            (
                "fulfillment",
                "sla.partial_import_exception",
                PartialFulfillmentResponseException.objects.order_by("-created_at").values_list("id", flat=True).first(),
            ),
        ]

        written = 0
        for source_module, source_event_type, latest_id in sources:
            DataFreshnessMarker.objects.update_or_create(
                source_module=source_module,
                source_event_type=source_event_type,
                defaults={
                    "last_processed_at": now,
                    "last_source_record_reference": latest_id,
                    "is_stale": False,
                },
            )
            written += 1
        self.stdout.write(f"Data freshness markers: {written} updated.")
