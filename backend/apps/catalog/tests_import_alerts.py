"""Tests for the Import Alert ViewSet and notification bell integration."""
import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.tenant.models import User


def _make_admin(email="admin@cixci.test", password="testpass123"):
    return User.objects.create_superuser(email=email, password=password)


def _make_regular_user(email="user@vendor.test", password="testpass123"):
    return User.objects.create_user(email=email, entity=None, password=password)


def _create_notification_request(event_type, payload=None, source_module="catalog"):
    from apps.notification.models import NotificationRequest
    return NotificationRequest.objects.create(
        event_type=event_type,
        source_module=source_module,
        company_scope_reference=uuid.uuid4(),
        safe_payload_summary=payload or {},
        channel="in_app",
        idempotency_key=str(uuid.uuid4()),
    )


class ImportAlertListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_admin()
        self.regular = _make_regular_user()

    def test_admin_sees_alerts(self):
        _create_notification_request(
            "catalog.unresolved_category",
            {"message": "2 unmapped categories", "unresolved_categories": ["Accessories", "Gadgets"], "count": 2},
        )
        _create_notification_request(
            "catalog.missing_device_reference",
            {"message": "1 missing device", "missing_devices": ["iPhone 99"], "count": 1},
        )
        self.client.force_authenticate(self.admin)
        resp = self.client.get("/api/v1/catalog/import-alerts/")
        self.assertEqual(resp.status_code, 200)
        alerts = resp.data["alerts"]
        self.assertEqual(len(alerts), 2)
        event_types = {a["event_type"] for a in alerts}
        self.assertIn("catalog.unresolved_category", event_types)
        self.assertIn("catalog.missing_device_reference", event_types)

    def test_regular_user_forbidden(self):
        self.client.force_authenticate(self.regular)
        resp = self.client.get("/api/v1/catalog/import-alerts/")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_forbidden(self):
        resp = self.client.get("/api/v1/catalog/import-alerts/")
        self.assertIn(resp.status_code, [401, 403])

    def test_empty_alerts(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get("/api/v1/catalog/import-alerts/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["alerts"], [])

    def test_alert_items_from_payload(self):
        _create_notification_request(
            "catalog.unresolved_color",
            {"message": "3 unmapped colors", "unresolved_colors": ["Mint", "Cobalt", "Flamingo"], "count": 3},
        )
        self.client.force_authenticate(self.admin)
        resp = self.client.get("/api/v1/catalog/import-alerts/")
        alert = resp.data["alerts"][0]
        self.assertEqual(alert["items"], ["Mint", "Cobalt", "Flamingo"])
        self.assertEqual(alert["count"], 3)


class ImportAlertDismissTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_admin()

    def test_dismiss_removes_alert(self):
        nr = _create_notification_request(
            "catalog.unresolved_category",
            {"message": "test", "unresolved_categories": ["X"]},
        )
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f"/api/v1/catalog/import-alerts/{nr.id}/dismiss/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["dismissed"])

        resp = self.client.get("/api/v1/catalog/import-alerts/")
        self.assertEqual(len(resp.data["alerts"]), 0)

    def test_dismiss_nonexistent_ok(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f"/api/v1/catalog/import-alerts/{uuid.uuid4()}/dismiss/")
        self.assertEqual(resp.status_code, 200)

    def test_regular_user_cannot_dismiss(self):
        nr = _create_notification_request("catalog.unresolved_category", {"message": "x"})
        regular = _make_regular_user(email="user2@vendor.test")
        self.client.force_authenticate(regular)
        resp = self.client.post(f"/api/v1/catalog/import-alerts/{nr.id}/dismiss/")
        self.assertEqual(resp.status_code, 403)
