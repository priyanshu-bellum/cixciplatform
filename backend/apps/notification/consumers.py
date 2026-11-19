"""WebSocket consumer for real-time notifications."""
import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Per-user notification channel.

    Clients connect to ws://.../ws/notifications/?token=<JWT>
    Server pushes events:
      - {"type": "notification", "payload": {...}}   — new in-app notification
      - {"type": "import_alert", "payload": {...}}   — new import data quality alert
      - {"type": "unread_count", "count": N}         — updated unread count
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        self.user_group = f"notifications_user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        if getattr(self.user, "is_cixci_admin", False):
            await self.channel_layer.group_add("notifications_admins", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if hasattr(self, "user") and getattr(self.user, "is_cixci_admin", False):
            await self.channel_layer.group_discard("notifications_admins", self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type == "mark_read":
            await self._handle_mark_read(content.get("id"))
        elif msg_type == "mark_all_read":
            await self._handle_mark_all_read()

    async def _handle_mark_read(self, notif_id):
        if not notif_id:
            return
        from channels.db import database_sync_to_async
        from apps.notification.models import InAppNotification
        from django.utils import timezone

        @database_sync_to_async
        def do_mark():
            try:
                n = InAppNotification.objects.get(pk=notif_id, recipient=self.user)
                if not n.is_read:
                    n.is_read = True
                    n.read_at = timezone.now()
                    n.save(update_fields=["is_read", "read_at"])
                return True
            except InAppNotification.DoesNotExist:
                return False

        if await do_mark():
            count = await self._get_unread_count()
            await self.send_json({"type": "unread_count", "count": count})

    async def _handle_mark_all_read(self):
        from channels.db import database_sync_to_async
        from apps.notification.models import InAppNotification
        from django.utils import timezone

        @database_sync_to_async
        def do_mark_all():
            return InAppNotification.objects.filter(
                recipient=self.user, is_read=False
            ).update(is_read=True, read_at=timezone.now())

        await do_mark_all()
        await self.send_json({"type": "unread_count", "count": 0})

    async def _get_unread_count(self):
        from channels.db import database_sync_to_async
        from apps.notification.models import InAppNotification

        @database_sync_to_async
        def count():
            return InAppNotification.objects.filter(
                recipient=self.user, is_read=False
            ).count()

        return await count()

    # ─── Group message handlers (called by channel_layer.group_send) ──────────

    async def notification_new(self, event):
        await self.send_json({
            "type": "notification",
            "payload": event["payload"],
        })

    async def import_alert_new(self, event):
        await self.send_json({
            "type": "import_alert",
            "payload": event["payload"],
        })

    async def unread_count_update(self, event):
        await self.send_json({
            "type": "unread_count",
            "count": event["count"],
        })
