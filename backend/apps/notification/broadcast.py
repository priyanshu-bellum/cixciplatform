"""Broadcast helpers for pushing notifications over WebSocket."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_notification(user_id, payload: dict):
    """Push a new notification to a specific user's WebSocket channel."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        group = f"notifications_user_{user_id}"
        async_to_sync(channel_layer.group_send)(group, {
            "type": "notification.new",
            "payload": payload,
        })
    except Exception:
        logger.debug("WebSocket broadcast failed for user %s", user_id, exc_info=True)


def broadcast_unread_count(user_id, count: int):
    """Push updated unread count to a specific user."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        group = f"notifications_user_{user_id}"
        async_to_sync(channel_layer.group_send)(group, {
            "type": "unread_count.update",
            "count": count,
        })
    except Exception:
        logger.debug("WebSocket broadcast failed for user %s", user_id, exc_info=True)


def broadcast_import_alert(payload: dict):
    """Push import alert to all admin WebSocket connections."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)("notifications_admins", {
            "type": "import_alert.new",
            "payload": payload,
        })
    except Exception:
        logger.debug("WebSocket admin broadcast failed", exc_info=True)
