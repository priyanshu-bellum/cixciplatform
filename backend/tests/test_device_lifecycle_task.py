import datetime
import pytest
from django.utils import timezone
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.tasks import update_device_lifecycle_statuses


@pytest.fixture
def device_type(db):
    return DeviceType.objects.create(name="Smartwatch", code="smartwatch", status="active", is_active=True)


@pytest.fixture
def manufacturer(db):
    return Manufacturer.objects.create(name="Apple", is_active=True)


@pytest.mark.django_db
class TestDeviceLifecycleTask:
    def test_transitions_inactive_to_available_when_launch_date_reached(self, device_type, manufacturer):
        past_date = timezone.localdate() - datetime.timedelta(days=1)
        device = Device.objects.create(
            name="Apple Watch Ultra 3",
            sku="AWU3",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=past_date,
            lifecycle_status="inactive",
        )

        # Model.save already normalizes a past launch. Model the scheduled state explicitly.
        Device.objects.filter(pk=device.pk).update(lifecycle_status="inactive")
        result = update_device_lifecycle_statuses()
        device.refresh_from_db()

        assert device.lifecycle_status == "available"
        assert "1" in result

    def test_transitions_on_exact_launch_date(self, device_type, manufacturer):
        today = timezone.localdate()
        device = Device.objects.create(
            name="Apple Watch Ultra 3",
            sku="AWU3-TODAY",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=today,
            lifecycle_status="inactive",
        )

        update_device_lifecycle_statuses()
        device.refresh_from_db()

        assert device.lifecycle_status == "available"

    def test_does_not_transition_future_launch_date(self, device_type, manufacturer):
        future_date = timezone.localdate() + datetime.timedelta(days=30)
        device = Device.objects.create(
            name="Future Watch",
            sku="FW1",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=future_date,
            lifecycle_status="inactive",
        )

        update_device_lifecycle_statuses()
        device.refresh_from_db()

        assert device.lifecycle_status == "inactive"

    def test_does_not_touch_already_available_devices(self, device_type, manufacturer):
        past_date = timezone.localdate() - datetime.timedelta(days=5)
        device = Device.objects.create(
            name="Current Watch",
            sku="CW1",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=past_date,
            lifecycle_status="available",
        )

        update_device_lifecycle_statuses()
        device.refresh_from_db()

        assert device.lifecycle_status == "available"

    def test_skips_sentinel_year_9999(self, device_type, manufacturer):
        device = Device.objects.create(
            name="Sentinel Watch",
            sku="SW1",
            device_type=device_type,
            manufacturer=manufacturer,
            launch_date=datetime.date(9999, 12, 31),
            lifecycle_status="inactive",
        )

        update_device_lifecycle_statuses()
        device.refresh_from_db()

        assert device.lifecycle_status == "inactive"
