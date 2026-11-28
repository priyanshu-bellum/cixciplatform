"""
Carrier tracking entry points.

Manual vendors upload shipping info via CSV (tracking_number + shipping_carrier).
The EasyPost integration lives in ``tracking.py`` (shipment progress, tracker
lifecycle) and ``easypost.py`` (provider client); it is switched on by the
CIXCI admin in Integrations → Carrier Tracking, not by a settings flag.
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
    return NoOpCarrierTracker()


def poll_manual_shipments():
    """
    Scheduled task entry point: register new shipments with the carrier tracking
    provider and refresh those it has not pushed an update for.

    Skipped until a CIXCI admin enables the provider.
    """
    from .tracking import sync_due_trackers
    return sync_due_trackers()
