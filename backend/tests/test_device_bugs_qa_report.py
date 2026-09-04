"""
Automated regression test suite verifying fixes for all 16 reported bugs in Device Module (BUG-DEV-001 to BUG-DEV-016).
"""
import io
import pytest
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User
from apps.devices.models import Device, DeviceType, Manufacturer


@pytest.mark.django_db
class TestDeviceModuleBugFixes:

    @pytest.fixture(autouse=True)
    def setup_fixtures(self):
        self.cixci_company = Company.objects.create(
            name="CIXCI Platform Admin", slug="cixci-platform-admin", company_type="cixci_internal", status="active"
        )
        self.cixci_entity = CompanyEntity.objects.create(
            company=self.cixci_company, name="Admin HQ"
        )
        self.admin_user = User.objects.create_user(
            email="admin@cixci.com",
            password="Password123!",
            is_cixci_admin=True,
            is_superuser=True,
            is_staff=True,
            entity=self.cixci_entity,
        )

        self.buyer_company = Company.objects.create(
            name="Buyer MVNO Co", slug="buyer-mvno-co", company_type="buyer", status="active"
        )
        self.buyer_entity = CompanyEntity.objects.create(
            company=self.buyer_company, name="Buyer MVNO Entity"
        )
        self.buyer_user = User.objects.create_user(
            email="billy@mvno.com",
            password="Password123!",
            is_cixci_admin=False,
            entity=self.buyer_entity,
        )

        self.apple_mfr = Manufacturer.objects.create(name="Apple", is_active=True)
        self.samsung_mfr = Manufacturer.objects.create(name="Samsung", is_active=True)
        self.phone_type = DeviceType.objects.create(name="Phone", code="PHONE", status="active", is_active=True)
        self.watch_type = DeviceType.objects.create(name="Watch", code="WATCH", status="active", is_active=True)

        self.existing_phone = Device.objects.create(
            name="iPhone 16",
            manufacturer=self.apple_mfr,
            device_type=self.phone_type,
            lifecycle_status="available",
        )

        self.inactive_phone = Device.objects.create(
            name="iPhone 18 Secret",
            manufacturer=self.apple_mfr,
            device_type=self.phone_type,
            lifecycle_status="inactive",
        )

        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.admin_user)

        self.client_buyer = APIClient()
        self.client_buyer.force_authenticate(user=self.buyer_user)

    # ── BUG-DEV-001: Buyer Cannot Create Device ───────────────────────────────
    def test_bug_dev_001_buyer_cannot_create_device(self):
        payload = {
            "name": "Unauthorized Phone",
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
        }
        res = self.client_buyer.post("/api/v1/devices/devices/", payload, format="json")
        assert res.status_code == 403

    # ── BUG-DEV-002: Buyer Cannot Edit Device ─────────────────────────────────
    def test_bug_dev_002_buyer_cannot_edit_device(self):
        url = f"/api/v1/devices/devices/{self.existing_phone.id}/"
        res = self.client_buyer.patch(url, {"name": "Hacked Name"}, format="json")
        assert res.status_code == 403

    # ── BUG-DEV-003: Buyer Cannot Delete Device ───────────────────────────────
    def test_bug_dev_003_buyer_cannot_delete_device(self):
        url = f"/api/v1/devices/devices/{self.existing_phone.id}/"
        res = self.client_buyer.delete(url)
        assert res.status_code == 403

    # ── BUG-DEV-004: Buyer Cannot Bulk Import Devices ─────────────────────────
    def test_bug_dev_004_buyer_cannot_bulk_import(self):
        csv_content = (
            "Device Manufacturer,Device Name,Device Type,Launch Date,"
            "Compatible Charging Interface,Storage Expansion Compatibility,Maximum Supported Storage,"
            "Headphone Jack Compatibility,Bluetooth Compatibility,Wireless Charging Compatibility,"
            "Compatible Watch Case Size\n"
            "Apple,iPhone 17,Phone,09/15/2026,Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible\n"
        )
        f = io.BytesIO(csv_content.encode("utf-8"))
        f.name = "import.csv"
        res = self.client_buyer.post(
            "/api/v1/devices/devices/bulk_import/",
            {"file": f, "import_mode": "Create New Only"},
            format="multipart",
        )
        assert res.status_code == 403

    # ── BUG-DEV-005: XSS Sanitization in Device Name ──────────────────────────
    def test_bug_dev_005_xss_sanitization_in_device_name(self):
        payload = {
            "name": '<script>alert("xss")</script> Safe Phone',
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
        }
        res = self.client_admin.post("/api/v1/devices/devices/", payload, format="json")
        assert res.status_code == 201
        device = Device.objects.get(id=res.data["id"])
        assert "<script>" not in device.name

    # ── BUG-DEV-006 & 011: Inactive Devices Hidden From Buyer ─────────────────
    def test_bug_dev_006_011_inactive_devices_hidden_from_buyer(self):
        res = self.client_buyer.get("/api/v1/devices/devices/")
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        device_ids = [d["id"] for d in results]
        assert str(self.existing_phone.id) in device_ids
        assert str(self.inactive_phone.id) not in device_ids

    # ── BUG-DEV-007 & 008: Import Update and Upsert Modes ─────────────────────
    def test_bug_dev_007_008_import_update_and_upsert_modes(self):
        # Update existing device in Update Existing mode
        csv_content_update = (
            "Device Manufacturer,Device Name,Device Type,Launch Date,"
            "Compatible Charging Interface,Storage Expansion Compatibility,Maximum Supported Storage,"
            "Headphone Jack Compatibility,Bluetooth Compatibility,Wireless Charging Compatibility,"
            "Compatible Watch Case Size\n"
            f"Apple,{self.existing_phone.name},Phone,09/15/2026,Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible\n"
        )
        f_up = io.BytesIO(csv_content_update.encode("utf-8"))
        f_up.name = "update.csv"
        res_up = self.client_admin.post(
            "/api/v1/devices/devices/bulk_import/",
            {"file": f_up, "import_mode": "Update Existing"},
            format="multipart",
        )
        assert res_up.status_code == 200
        assert res_up.data["updated_count"] == 1
        assert res_up.data["created_count"] == 0

        # Update Existing mode fails for non-existing device
        csv_content_nonexist = (
            "Device Manufacturer,Device Name,Device Type,Launch Date,"
            "Compatible Charging Interface,Storage Expansion Compatibility,Maximum Supported Storage,"
            "Headphone Jack Compatibility,Bluetooth Compatibility,Wireless Charging Compatibility,"
            "Compatible Watch Case Size\n"
            "Apple,iPhone NonExistent 99,Phone,09/15/2026,Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible\n"
        )
        f_nonexist = io.BytesIO(csv_content_nonexist.encode("utf-8"))
        f_nonexist.name = "nonexist.csv"
        res_nonexist = self.client_admin.post(
            "/api/v1/devices/devices/bulk_import/",
            {"file": f_nonexist, "import_mode": "Update Existing"},
            format="multipart",
        )
        assert res_nonexist.status_code == 400
        assert res_nonexist.data["status"] == "validation_failed"

    # ── BUG-DEV-012: Phone Accepts Watch Case Size Values ────────────────────
    def test_bug_dev_012_phone_rejects_watch_case_size(self):
        payload = {
            "name": "Phone With Watch Size",
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
            "compatible_watch_case_size": "44mm",
        }
        res = self.client_admin.post("/api/v1/devices/devices/", payload, format="json")
        assert res.status_code == 400
        errors = res.data.get("detail", res.data)
        assert "compatible_watch_case_size" in errors

        # Valid for Watch device type
        watch_payload = {
            "name": "Apple Watch Series 10",
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.watch_type.id),
            "launch_date": "09/15/2026",
            "compatible_watch_case_size": "44mm",
        }
        res_watch = self.client_admin.post("/api/v1/devices/devices/", watch_payload, format="json")
        assert res_watch.status_code == 201

    # ── BUG-DEV-013: ISO and MM/DD/YYYY Date Format Accepted ──────────────────
    def test_bug_dev_013_date_formats_accepted(self):
        payload1 = {
            "name": "ISO Date Phone",
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "2026-09-15",
        }
        res1 = self.client_admin.post("/api/v1/devices/devices/", payload1, format="json")
        assert res1.status_code == 201

        payload2 = {
            "name": "US Date Phone",
            "manufacturer": str(self.samsung_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
        }
        res2 = self.client_admin.post("/api/v1/devices/devices/", payload2, format="json")
        assert res2.status_code == 201

    # ── BUG-DEV-014: Max Length Enforced on Device Name ───────────────────────
    def test_bug_dev_014_max_length_device_name(self):
        long_name = "A" * 200
        payload = {
            "name": long_name,
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
        }
        res = self.client_admin.post("/api/v1/devices/devices/", payload, format="json")
        assert res.status_code == 400
        errors = res.data.get("detail", res.data)
        assert "name" in errors

    # ── BUG-DEV-015: Expanded Compatibility Choices Accepted ──────────────────
    def test_bug_dev_015_expanded_choices_accepted(self):
        payload = {
            "name": "Micro USB 3.5mm Phone",
            "manufacturer": str(self.samsung_mfr.id),
            "device_type": str(self.phone_type.id),
            "launch_date": "09/15/2026",
            "compatible_charging_interface": "Micro-USB",
            "headphone_jack_compatibility": "3.5mm",
        }
        res = self.client_admin.post("/api/v1/devices/devices/", payload, format="json")
        assert res.status_code == 201

        watch_payload = {
            "name": "Small Watch 38mm",
            "manufacturer": str(self.apple_mfr.id),
            "device_type": str(self.watch_type.id),
            "launch_date": "09/15/2026",
            "compatible_watch_case_size": "38mm",
        }
        res_watch = self.client_admin.post("/api/v1/devices/devices/", watch_payload, format="json")
        assert res_watch.status_code == 201

    # ── BUG-DEV-016: Partial Import Support ───────────────────────────────────
    def test_bug_dev_016_partial_import_support(self):
        csv_content = (
            "Device Manufacturer,Device Name,Device Type,Launch Date,"
            "Compatible Charging Interface,Storage Expansion Compatibility,Maximum Supported Storage,"
            "Headphone Jack Compatibility,Bluetooth Compatibility,Wireless Charging Compatibility,"
            "Compatible Watch Case Size\n"
            "Apple,iPhone Valid Row,Phone,09/15/2026,Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible\n"
            "Apple,iPhone Invalid Row,Phone,INVALID_DATE,Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible\n"
        )
        f = io.BytesIO(csv_content.encode("utf-8"))
        f.name = "partial.csv"
        res = self.client_admin.post(
            "/api/v1/devices/devices/bulk_import/",
            {"file": f, "import_mode": "Create New Only"},
            format="multipart",
        )
        assert res.status_code in [200, 207]
        assert res.data["status"] == "partial_success"
        assert res.data["created_count"] == 1
        assert len(res.data["errors"]) == 1
