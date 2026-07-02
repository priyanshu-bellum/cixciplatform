import datetime
import io
import pytest
from django.utils import timezone
from apps.devices.models import Device, DeviceType, Manufacturer, DeviceLifecycleStatus

@pytest.fixture
def device_type(db):
    return DeviceType.objects.create(name="Phone", code="phone", status="active", is_active=True)

@pytest.fixture
def manufacturer(db):
    return Manufacturer.objects.create(name="Apple", is_active=True)

@pytest.mark.django_db
class TestDeviceLaunchDateVisibility:
    def test_future_launch_date_auto_inactive(self, device_type, manufacturer):
        today = timezone.localdate()
        future_date = today + datetime.timedelta(days=10)
        
        # Creating a device with future launch date
        device = Device.objects.create(
            name="iPhone 18",
            sku="IP18",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=future_date
        )
        
        # Verify status is auto-set to inactive
        assert device.lifecycle_status == "inactive"
        
        # Update launch date to today
        device.launch_date = today
        device.save()
        
        # Verify status transitions back to available
        assert device.lifecycle_status == "available"

    def test_visibility_for_non_admin_users(self, buyer_client, admin_client, device_type, manufacturer):
        today = timezone.localdate()
        future_date = today + datetime.timedelta(days=5)
        past_date = today - datetime.timedelta(days=5)
        
        # Future-dated device
        dev_future = Device.objects.create(
            name="Future Phone",
            sku="FPHONE",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=future_date
        )
        
        # Past-dated device
        dev_past = Device.objects.create(
            name="Past Phone",
            sku="PPHONE",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=past_date
        )
        
        # Non-admin user list devices (buyer can see future-dated devices as "launching")
        resp = buyer_client.get("/api/v1/devices/devices/")
        assert resp.status_code == 200
        names = [d["name"] for d in resp.data["results"]]
        assert "Past Phone" in names
        assert "Future Phone" in names
        
        # Non-admin get future device should return 200 for buyer
        resp_get = buyer_client.get(f"/api/v1/devices/devices/{dev_future.id}/")
        assert resp_get.status_code == 200
        
        # Admin user list devices should see both
        resp_admin = admin_client.get("/api/v1/devices/devices/")
        assert resp_admin.status_code == 200
        names_admin = [d["name"] for d in resp_admin.data["results"]]
        assert "Past Phone" in names_admin
        assert "Future Phone" in names_admin

    def test_bulk_import_future_date(self, admin_client, device_type, manufacturer):
        today = timezone.localdate()
        future_date = today + datetime.timedelta(days=30)
        future_date_str = future_date.strftime("%m/%d/%Y")
        
        csv_content = (
            "Device Manufacturer,Device Name,Device Type,Launch Date,Compatible Charging Interface,"
            "Storage Expansion Compatibility,Maximum Supported Storage,Headphone Jack Compatibility,"
            "Bluetooth Compatibility,Wireless Charging Compatibility,Compatible Watch Case Size,,,,,,,,,,,,,,,,\n"
            f"Apple,Future Imported Phone,Smartphone,{future_date_str},Type-C,Not Compatible,,Type-C,Yes,MagSafe,Not Compatible,,,,,,,,,,,,,,,,\n"
        )
        
        file_obj = io.BytesIO(csv_content.encode('utf-8-sig'))
        file_obj.name = "import_test.csv"
        
        resp = admin_client.post("/api/v1/devices/devices/bulk_import/", {
            "file": file_obj,
            "import_mode": "Create New Only"
        }, format="multipart")
        
        assert resp.status_code == 200
        dev = Device.objects.get(name="Future Imported Phone", manufacturer=manufacturer)
        assert dev.lifecycle_status == "inactive"
