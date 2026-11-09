import pytz
from django.utils import timezone
from celery import shared_task


@shared_task
def update_device_lifecycle_statuses():
    """
    Periodic task: transition devices from 'inactive' to 'available'
    when their launch_date has been reached (launch_date <= today).
    """
    from apps.devices.models import Device

    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()

    devices = Device.objects.filter(
        lifecycle_status="inactive",
        launch_date__lte=today_est,
    ).exclude(launch_date__year=9999)

    updated = 0
    for device in devices:
        device.lifecycle_status = "available"
        device.save(update_fields=["lifecycle_status", "updated_at"])
        updated += 1

    return f"Transitioned {updated} device(s) from inactive to available"
