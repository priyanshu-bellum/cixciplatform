# Notification platform

Purpose: preferences, durable requests/attempts, in-app notifications, email delivery
and SLA reminder chains. Feature NTF-001 is partial; full producer/event wiring and
scope behavior need review.

## Entry points and workflow

[services.py](../../../backend/apps/notification/services.py) evaluates preferences,
creates requests and reminder chains; [tasks.py](../../../backend/apps/notification/tasks.py)
processes requests/templates/recipients/delivery; [api.py](../../../backend/apps/notification/api.py)
exposes preferences, templates, requests, in-app and reminder-related actions.
Frontend [NotificationsPage](../../../frontend/src/pages/NotificationsPage.tsx).

Ladder: legal unsubscribe → hard suppression → required/system override → source
policy and optional entity/company/user/event/channel preferences → quiet hours/
digest → delivery outcome. This is observed execution order; the advertised full
ladder and entity/tenant semantics are not uniformly enforced. Delivery attempts and
in-app records retain evidence; declared email providers need private configuration.

## API, entities and dependencies

[API reference](../reference/api/notifications.md), under `/api/v1/notifications/`;
[schema](../reference/schema/notification.md): templates/preferences/requests,
RecipientResolutionRequest, DeliveryAttempt, activity-summary configuration/attempts,
InAppNotification, SLAReminderChain. Dependencies: tenant identity/capabilities,
audit, source-module events and external email delivery. Tenant account emails also
have their own dispatch path; do not silently unify their semantics.

## Rules, security, tests and precautions

BR-NTF-001, BR-TEN-001, BR-AUD-001. Required notifications still respect legal/hard
suppression; clarify source-policy precedence. ISSUE-006: entity uses company ID,
event/channel preferences lack tenant/recipient constraints; ISSUE-007: some catalog
intents only log. Do not claim every source event reaches a recipient.

Tests: [phase1](../../../backend/tests/test_notification_platform_phase1.py),
[Celery](../../../backend/tests/test_celery_tasks.py),
[user email](../../../backend/tests/test_user_invitation_and_email.py).
Add multi-company/multi-recipient regressions for TASK-005 before changing scope,
quiet-hours timezone or suppression policy. Keep template payloads free of secrets.
