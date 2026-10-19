"""Media services — audit helper + shared utilities."""
import logging

logger = logging.getLogger(__name__)


def log_media_audit(event_code, description, asset_id, company_id=None, actor_id=None, status="success"):
    """Append-only audit record for media lifecycle actions (Rule §28)."""
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        import uuid

        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        s_id = asset_id.id if hasattr(asset_id, "id") else asset_id

        if company_id is None:
            company_id = "00000000-0000-0000-0000-000000000000"
        if s_id is not None:
            s_id = uuid.UUID(str(s_id))

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status=status,
            actor_reference=a_id,
            company_scope_reference=company_id,
            source_module="media",
            source_record_type="MediaAsset",
            source_record_id=s_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as exc:
        logger.error("Failed to log media audit record for %s: %s", event_code, exc)
