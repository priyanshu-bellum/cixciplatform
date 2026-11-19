# notification — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## notification.ActivitySummaryConfiguration

Table: `notification_activity_summary_config`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="active"` | `—` |
| `delivery_times` / `delivery_times` | `JSONField` | `NOT NULL; default="<not set>"` | `—` |
| `schedule_timezone` / `schedule_timezone` | `CharField` | `NOT NULL; length=50; default="UTC"` | `—` |
| `skip_weekends` / `skip_weekends` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `skip_holidays` / `skip_holidays` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `explicit_recipient_ids` / `explicit_recipient_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `last_successful_summary_cursor_reference` / `last_successful_summary_cursor_reference` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["paused","Paused"],["retired","Retired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.ActivitySummaryDeliveryAttempt

Table: `notification_summary_delivery_attempt`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `configuration` / `configuration_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `notification.ActivitySummaryConfiguration; PROTECT; reverse=delivery_attempts` |
| `reporting_window_reference` / `reporting_window_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `aggregation_record_reference` / `aggregation_record_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `effective_recipient_ids` / `effective_recipient_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `provider_response_reference` / `provider_response_reference` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `acknowledged_at` / `acknowledged_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `failed_at` / `failed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["dispatched","Dispatched"],["acknowledged","Acknowledged (transport-layer only)"],["failed","Failed"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.DeliveryAttempt

Table: `notification_delivery_attempt`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `notification_request` / `notification_request_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `notification.NotificationRequest; PROTECT; reverse=delivery_attempts` |
| `recipient_id` / `recipient_id` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="requested"` | `—` |
| `provider_name` / `provider_name` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `provider_message_id` / `provider_message_id` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `provider_response_reference` / `provider_response_reference` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `attempt_number` / `attempt_number` | `PositiveSmallIntegerField` | `NOT NULL; default=1` | `—` |
| `max_attempts` / `max_attempts` | `PositiveSmallIntegerField` | `NOT NULL; default=3` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `sent_at` / `sent_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `delivered_at` / `delivered_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `failed_at` / `failed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `channel`: `[["email","Email"],["in_app","In-App"],["sms","SMS (placeholder)"],["webhook","Webhook / External (placeholder)"],["push","Push Notification (placeholder)"]]`
- `status`: `[["requested","Requested"],["queued","Queued"],["sent","Sent"],["delivered","Delivered"],["failed","Failed"],["bounced","Bounced"],["suppressed","Suppressed"],["delayed","Delayed"],["expired","Expired"],["cancelled","Cancelled"],["superseded","Superseded"],["retry_scheduled","Retry Scheduled"],["retry_exhausted","Retry Exhausted"],["review_required","Review Required"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_recipie_8261bc_idx","fields":["recipient_id","status"]}],["django.db.models.Index",[],{"name":"notificatio_notific_5971d0_idx","fields":["notification_request","attempt_number"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.InAppNotification

Table: `notification_in_app`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `recipient` / `recipient_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; CASCADE; reverse=in_app_notifications` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `notification_request` / `notification_request_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `notification.NotificationRequest; SET_NULL; reverse=in_app_notifications` |
| `event_type` / `event_type` | `CharField` | `indexed; NOT NULL; length=200; default="<not set>"` | `—` |
| `classification` / `classification` | `CharField` | `NOT NULL; length=50; default="INFORMATIONAL"` | `—` |
| `title` / `title` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `body` / `body` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `source_record_id` / `source_record_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `link` / `link` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `delivery_mode` / `delivery_mode` | `CharField` | `NOT NULL; length=50; default="IMMEDIATE"` | `—` |
| `delivery_attempt_reference` / `delivery_attempt_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `audit_reference` / `audit_reference` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |
| `is_read` / `is_read` | `BooleanField` | `indexed; NOT NULL; default=false` | `—` |
| `read_at` / `read_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `indexed; NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `classification`: `[["REQUIRED_OPERATIONAL","Required Operational"],["CONFIGURABLE_OPERATIONAL","Configurable Operational"],["INFORMATIONAL","Informational"],["ADMIN_SYSTEM_CRITICAL","Admin System Critical"],["DASHBOARD_ONLY","Dashboard Only"],["API_ONLY","API Only"],["OPERATIONAL_FILE_DELIVERY","Operational File Delivery"]]`
- `delivery_mode`: `[["IMMEDIATE","Immediate"],["DAILY_DIGEST","Daily Digest"],["DAILY_SUMMARY","Daily Summary"],["SCHEDULED_SUMMARY","Scheduled Summary"],["DASHBOARD","Dashboard"],["API","API"],["OPERATIONAL_FILE","Operational File"],["NONE","None"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_recipie_490d59_idx","fields":["recipient","is_read"]}],["django.db.models.Index",[],{"name":"notificatio_company_85f44c_idx","fields":["company_scope_reference","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## notification.NotificationPreference

Table: `notification_preference`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `level` / `level` | `CharField` | `NOT NULL; length=10; default="<not set>"` | `—` |
| `scope_id` / `scope_id` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `event_type` / `event_type` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; blank allowed; length=20; default="<not set>"` | `—` |
| `is_enabled` / `is_enabled` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `use_digest` / `use_digest` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `quiet_hours_start` / `quiet_hours_start` | `TimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `quiet_hours_end` / `quiet_hours_end` | `TimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `is_unsubscribed` / `is_unsubscribed` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `unsubscribed_at` / `unsubscribed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `level`: `[["user","User"],["entity","Entity"],["company","Company"]]`
- `channel`: `[["email","Email"],["in_app","In-App"],["sms","SMS (placeholder)"],["webhook","Webhook / External (placeholder)"],["push","Push Notification (placeholder)"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_scope_i_ce0e5e_idx","fields":["scope_id","event_type","channel"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.NotificationRequest

Table: `notification_request`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `event_type` / `event_type` | `CharField` | `indexed; NOT NULL; length=200; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `source_record_id` / `source_record_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `safe_payload_summary` / `safe_payload_summary` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `requested_recipient_ids` / `requested_recipient_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `template_code` / `template_code` | `CharField` | `NOT NULL; blank allowed; length=150; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; length=20; default="email"` | `—` |
| `classification` / `classification` | `CharField` | `NOT NULL; length=50; default="CONFIGURABLE_OPERATIONAL"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `preference_outcome` / `preference_outcome` | `CharField` | `NULL; blank allowed; length=20; default="<not set>"` | `—` |
| `preference_evaluation_detail` / `preference_evaluation_detail` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `attachments` / `attachments` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `channel`: `[["email","Email"],["in_app","In-App"],["sms","SMS (placeholder)"],["webhook","Webhook / External (placeholder)"],["push","Push Notification (placeholder)"]]`
- `classification`: `[["REQUIRED_OPERATIONAL","Required Operational"],["CONFIGURABLE_OPERATIONAL","Configurable Operational"],["INFORMATIONAL","Informational"],["ADMIN_SYSTEM_CRITICAL","Admin System Critical"],["DASHBOARD_ONLY","Dashboard Only"],["API_ONLY","API Only"],["OPERATIONAL_FILE_DELIVERY","Operational File Delivery"]]`
- `preference_outcome`: `[["send","Send"],["block","Block"],["delay","Delay"],["digest","Digest"],["review_required","Review Required"],["suppress","Suppress"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_event_t_17cf96_idx","fields":["event_type","company_scope_reference","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.NotificationTemplate

Table: `notification_template`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `template_code` / `template_code` | `CharField` | `indexed; NOT NULL; length=150; default="<not set>"` | `—` |
| `version` / `version` | `PositiveIntegerField` | `NOT NULL; default=1` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `event_type` / `event_type` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `subject_template` / `subject_template` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `body_template` / `body_template` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `dynamic_fields` / `dynamic_fields` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `redaction_rules` / `redaction_rules` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `locale` / `locale` | `CharField` | `NOT NULL; length=10; default="en"` | `—` |
| `company_scope` / `company_scope` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `effective_from` / `effective_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `effective_to` / `effective_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `channel`: `[["email","Email"],["in_app","In-App"],["sms","SMS (placeholder)"],["webhook","Webhook / External (placeholder)"],["push","Push Notification (placeholder)"]]`
- `status`: `[["draft","Draft"],["approved","Approved"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_event_t_d4c2a7_idx","fields":["event_type","channel","status"]}]]`.

Constraints: `[]`.

Unique together: `[["template_code","version","channel"]]`. Ordering: `[]`.

## notification.RecipientResolutionRequest

Table: `notification_recipient_resolution`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `notification_request` / `notification_request_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `notification.NotificationRequest; PROTECT; reverse=recipient_resolution` |
| `resolved_recipient_ids` / `resolved_recipient_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `excluded_recipient_ids` / `excluded_recipient_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `role_expansion_snapshot` / `role_expansion_snapshot` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `max_recipients_cap` / `max_recipients_cap` | `PositiveIntegerField` | `NOT NULL; default=500` | `—` |
| `cross_tenant_denied` / `cross_tenant_denied` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## notification.SLAReminderChain

Table: `notification_sla_reminder_chain`. Source: [backend/apps/notification/models.py](../../../../backend/apps/notification/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `sla_chain_id` / `sla_chain_id` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `source_condition_reference` / `source_condition_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `event_type` / `event_type` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `reminder_sequence` / `reminder_sequence` | `PositiveIntegerField` | `NOT NULL; default=1` | `—` |
| `previous_reminder_reference` / `previous_reminder_reference_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `notification.SLAReminderChain; SET_NULL; reverse=subsequent_reminders` |
| `first_threshold_at` / `first_threshold_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `last_reminder_at` / `last_reminder_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `next_reminder_due_at` / `next_reminder_due_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `chain_status` / `chain_status` | `CharField` | `indexed; NOT NULL; length=20; default="active"` | `—` |
| `resolved_at` / `resolved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `escalation_reference` / `escalation_reference` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `chain_status`: `[["active","Active"],["resolved","Resolved"],["superseded","Superseded"],["exhausted","Exhausted"]]`

Indexes: `[["django.db.models.Index",[],{"name":"notificatio_source__23bd09_idx","fields":["source_condition_reference","chain_status"]}],["django.db.models.Index",[],{"name":"notificatio_company_93326e_idx","fields":["company_scope_reference","chain_status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/notification/migrations/0001_initial.py](../../../../backend/apps/notification/migrations/0001_initial.py)
- [backend/apps/notification/migrations/0002_notificationrequest_attachments.py](../../../../backend/apps/notification/migrations/0002_notificationrequest_attachments.py)
- [backend/apps/notification/migrations/0003_inappnotification.py](../../../../backend/apps/notification/migrations/0003_inappnotification.py)
- [backend/apps/notification/migrations/0004_inappnotification_audit_reference_and_more.py](../../../../backend/apps/notification/migrations/0004_inappnotification_audit_reference_and_more.py)
- [backend/apps/notification/migrations/0005_alter_deliveryattempt_status_slareminderchain.py](../../../../backend/apps/notification/migrations/0005_alter_deliveryattempt_status_slareminderchain.py)
