"""
Carrier tracking interface — abstraction layer for EasyPost (future) integration.

Manual vendors upload shipping info via CSV (tracking_number + shipping_carrier).
This module defines the interface that a future EasyPost integration will implement
to poll carrier APIs for real-time delivery status on those shipments.

CURRENT STATE: Stub only. EasyPost integration is NOT yet built.
When it is, implement EasyPostCarrierTracker and register it via CARRIER_TRACKER_BACKEND setting.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class CarrierTrackingResult:
    tracking_number: str
    carrier: str
    status: str  # in_transit | out_for_delivery | delivered | exception | unknown
    tracker_id: Optional[str] = None
    shipped_date: Optional[date] = None
    delivered_date: Optional[date] = None
    estimated_delivery: Optional[date] = None
    last_location: Optional[str] = None
    provider_status: Optional[str] = None
    raw_response: Optional[dict] = None


class CarrierTracker(ABC):
    @abstractmethod
    def track(self, tracking_number: str, carrier: str) -> Optional[CarrierTrackingResult]:
        """Look up current status for a single shipment."""

    @abstractmethod
    def track_batch(self, shipments: list[tuple[str, str]]) -> list[Optional[CarrierTrackingResult]]:
        """Batch lookup: list of (tracking_number, carrier) tuples."""

    def register(self, tracking_number: str, carrier: str) -> Optional[str]:
        """Register a shipment for tracking. Returns tracker_id or None."""
        return None


class NoOpCarrierTracker(CarrierTracker):
    """Placeholder used until EasyPost is integrated."""

    def track(self, tracking_number, carrier):
        return None

    def track_batch(self, shipments):
        return [None] * len(shipments)

    def register(self, tracking_number, carrier):
        return None


def get_carrier_tracker() -> CarrierTracker:
    from django.conf import settings
    backend = getattr(settings, 'CARRIER_TRACKER_BACKEND', None)
    if backend == 'easypost':
        logger.warning('EasyPost carrier tracking is not yet implemented.')
    return NoOpCarrierTracker()


def poll_manual_shipments():
    """
    Scheduled task entry point: find FulfillmentHandoffs from manual vendors
    that have tracking info but aren't yet delivered, and poll carrier APIs.

    This is a no-op until CARRIER_TRACKER_BACKEND is configured.
    """
    tracker = get_carrier_tracker()
    if isinstance(tracker, NoOpCarrierTracker):
        return {'status': 'skipped', 'reason': 'no_carrier_tracker_configured'}

    from .models import FulfillmentHandoff
    pending = FulfillmentHandoff.objects.filter(
        tracking_number__isnull=False,
        shipping_carrier__isnull=False,
        status__in=('shipped', 'processing', 'received'),
    ).exclude(tracking_number='').exclude(shipping_carrier='')[:100]

    shipments = [(h.tracking_number, h.shipping_carrier) for h in pending]
    if not shipments:
        return {'status': 'ok', 'checked': 0}

    results = tracker.track_batch(shipments)
    updated = 0
    for handoff, result in zip(pending, results):
        if result is None:
            continue
        changed = False
        if result.delivered_date and not handoff.delivered_date:
            handoff.delivered_date = result.delivered_date
            handoff.status = 'delivered'
            changed = True
        elif result.shipped_date and not handoff.shipped_date:
            handoff.shipped_date = result.shipped_date
            changed = True
        if result.tracker_id and handoff.easypost_tracker_id != result.tracker_id:
            handoff.easypost_tracker_id = result.tracker_id
            changed = True
        if changed:
            if handoff.tracking_source == 'manual_csv':
                handoff.tracking_source = 'easypost'
            handoff.save()
            updated += 1

    return {'status': 'ok', 'checked': len(shipments), 'updated': updated}
