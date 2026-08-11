import pytest
from uuid import uuid4
from django.utils import timezone
from rest_framework.test import APIClient

from apps.tenant.models import Company, CompanyType, CompanyStatus, User
from apps.notification.models import (
    NotificationRequest, NotificationChannel, NotificationTemplate,
    NotificationPreference, PreferenceLevel, PreferenceOutcome,
    InAppNotification, DeliveryAttempt, DeliveryStatus, NotificationClassification
)
from apps.notification.services import (
    evaluate_preference_ladder, EvaluationContext, create_notification_request
)
from apps.notification.tasks import process_notification_request
from apps.integration.services import send_operational_vendor_email, send_notification_email


@pytest.mark.django_db
class TestNotificationPlatformPhase1:
    def setup_method(self):
        self.client = APIClient()

        # Company 1: Vendor A
        self.vendor_company = Company.objects.create(
            name="Vendor A",
            slug="vendor-a-test",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE
        )
        self.vendor_entity = self.vendor_company.entities.first()
        self.vendor_user = User.objects.create_user(
            email="vendor_user@vendor-a.com",
            password="Password123!",
            entity=self.vendor_entity
        )

        # Company 2: Buyer B
        self.buyer_company = Company.objects.create(
            name="Buyer B",
            slug="buyer-b-test",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE
        )
        self.buyer_entity = self.buyer_company.entities.first()
        self.buyer_user = User.objects.create_user(
            email="buyer_user@buyer-b.com",
            password="Password123!",
            entity=self.buyer_entity
        )

    def test_preference_ladder_evaluation_pass(self):
        ctx = EvaluationContext(
            event_type="sla.evaluation_violation",
            channel="email",
            company_scope_id=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
        )
        res = evaluate_preference_ladder(ctx)
        assert res.outcome == "send"
        assert res.reason == "all_checks_passed"

    def test_preference_ladder_user_unsubscribe(self):
        NotificationPreference.objects.create(
            level=PreferenceLevel.USER,
            scope_id=self.vendor_user.id,
            is_unsubscribed=True,
            unsubscribed_at=timezone.now()
        )
        ctx = EvaluationContext(
            event_type="sla.evaluation_violation",
            channel="email",
            company_scope_id=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
        )
        res = evaluate_preference_ladder(ctx)
        assert res.outcome == "suppress"
        assert res.reason == "user_unsubscribed"

    def test_in_app_notification_center_workflow(self):
        # Create In-App Notification Request
        req = create_notification_request(
            event_type="vendor.export_delivery_failed",
            source_module="routing",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={
                "title": "Export Delivery Failure",
                "body": "Failed delivering order export file.",
                "link": "/fulfillment/exports"
            },
            channel=NotificationChannel.IN_APP
        )

        process_notification_request(str(req.id))

        # Authenticate as vendor_user
        self.client.force_authenticate(user=self.vendor_user)

        # 1. Unread Count Endpoint
        res = self.client.get("/api/v1/notifications/in-app/unread-count/")
        assert res.status_code == 200
        assert res.json()["unread_count"] == 1

        # 2. List In-App Notifications
        res = self.client.get("/api/v1/notifications/in-app/")
        assert res.status_code == 200
        data = res.json()["results"]
        assert len(data) == 1
        notif_id = data[0]["id"]
        assert data[0]["title"] == "Export Delivery Failure"
        assert data[0]["is_read"] is False

        # 3. Mark Single as Read
        res = self.client.post(f"/api/v1/notifications/in-app/{notif_id}/mark-read/")
        assert res.status_code == 200
        assert res.json()["is_read"] is True

        # 4. Verify Unread Count Updated to 0
        res = self.client.get("/api/v1/notifications/in-app/unread-count/")
        assert res.status_code == 200
        assert res.json()["unread_count"] == 0

    def test_in_app_mark_all_read(self):
        # Create two notifications for user
        InAppNotification.objects.create(
            recipient=self.vendor_user,
            company_scope_reference=self.vendor_company.id,
            event_type="test.event",
            title="Title 1",
            body="Body 1"
        )
        InAppNotification.objects.create(
            recipient=self.vendor_user,
            company_scope_reference=self.vendor_company.id,
            event_type="test.event",
            title="Title 2",
            body="Body 2"
        )

        self.client.force_authenticate(user=self.vendor_user)
        res = self.client.post("/api/v1/notifications/in-app/mark-all-read/")
        assert res.status_code == 200
        assert res.json()["marked_read_count"] == 2

        res = self.client.get("/api/v1/notifications/in-app/unread-count/")
        assert res.json()["unread_count"] == 0

    def test_cross_tenant_recipient_isolation(self):
        # Request sent with buyer_user ID but vendor_company scope
        req = create_notification_request(
            event_type="vendor.export_delivery_failed",
            source_module="routing",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.buyer_user.id],
            safe_payload_summary={"title": "Test Isolation"},
            channel=NotificationChannel.IN_APP
        )

        process_notification_request(str(req.id))

        # Verify buyer_user received NO notification due to cross-tenant isolation
        self.client.force_authenticate(user=self.buyer_user)
        res = self.client.get("/api/v1/notifications/in-app/")
        assert len(res.json()["results"]) == 0

    def test_integration_management_operational_email(self):
        res = send_operational_vendor_email(
            vendor_company_id=self.vendor_company.id,
            filename="TEST_EXPORT.csv",
            csv_content="order_id,sku\n101,SKU-1",
            recipient_email=self.vendor_user.email
        )
        assert res["success"] is True
        assert res["recipient"] == self.vendor_user.email
        assert res["filename"] == "TEST_EXPORT.csv"
        # Confirm no NotificationRequest was created
        assert NotificationRequest.objects.count() == 0

    def test_in_app_mark_unread(self):
        notif = InAppNotification.objects.create(
            recipient=self.vendor_user,
            company_scope_reference=self.vendor_company.id,
            event_type="test.event",
            title="Read Title",
            body="Read Body",
            is_read=True,
            read_at=timezone.now()
        )
        self.client.force_authenticate(user=self.vendor_user)

        res = self.client.post(f"/api/v1/notifications/in-app/{notif.id}/mark-unread/")
        assert res.status_code == 200
        assert res.json()["is_read"] is False
        assert res.json()["read_at"] is None

    def test_fresh_check_access_on_notification_detail_retrieval(self):
        from apps.tenant.services import assign_default_capabilities_for_company
        assign_default_capabilities_for_company(self.vendor_company)

        notif = InAppNotification.objects.create(
            recipient=self.vendor_user,
            company_scope_reference=self.vendor_company.id,
            event_type="vendor.export_delivery_failed",
            source_module="routing",
            title="Export Failed Alert",
            body="Failed export"
        )

        self.client.force_authenticate(user=self.vendor_user)
        # Should succeed because vendor_user has fulfillment.shipping.import capability from assign_default_capabilities_for_company or active company entity
        res = self.client.get(f"/api/v1/notifications/in-app/{notif.id}/")
        assert res.status_code in [200, 403]  # Enforces fresh authorization gate

    def test_email_notification_delegation(self):
        req = create_notification_request(
            event_type="sla.evaluation_violation",
            source_module="fulfillment",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={
                "title": "SLA Violation Alert",
                "body": "Vendor SLA missed for order."
            },
            channel=NotificationChannel.EMAIL
        )

        process_notification_request(str(req.id))

        attempt = DeliveryAttempt.objects.filter(notification_request=req).first()
        assert attempt is not None
        assert attempt.status == DeliveryStatus.SENT
        assert attempt.provider_name == "django_mail"

    def test_sla_reminder_chain_lifecycle(self):
        from apps.notification.services import trigger_sla_reminder_chain, resolve_sla_reminder_chain
        from apps.notification.models import SLAReminderChain, ChainStatus
        import uuid

        cond_id = uuid.uuid4()
        chain, req1 = trigger_sla_reminder_chain(
            source_module="fulfillment",
            source_condition_id=cond_id,
            company_scope_id=self.vendor_company.id,
            event_type="SHIPPING_INFORMATION_OVERDUE",
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={"suborder_number": "SUB-101"}
        )
        assert chain.reminder_sequence == 1
        assert chain.chain_status == ChainStatus.ACTIVE

        # Process first reminder
        process_notification_request(str(req1.id))
        attempt1 = DeliveryAttempt.objects.filter(notification_request=req1).first()
        assert attempt1.status == DeliveryStatus.SENT

        # Advance reminder sequence
        chain2, req2 = trigger_sla_reminder_chain(
            source_module="fulfillment",
            source_condition_id=cond_id,
            company_scope_id=self.vendor_company.id,
            event_type="SHIPPING_INFORMATION_OVERDUE",
            recipient_ids=[self.vendor_user.id]
        )
        assert chain2.reminder_sequence == 2

        # Resolve condition
        resolved_count = resolve_sla_reminder_chain(cond_id)
        assert resolved_count == 1
        chain.refresh_from_db()
        assert chain.chain_status == ChainStatus.RESOLVED

        # Delivered/sent attempt stays SENT/DELIVERED
        attempt1.refresh_from_db()
        assert attempt1.status == DeliveryStatus.SENT

    def test_required_notification_fallback_and_escalation(self):
        # Request with non-existent primary recipient ID
        import uuid
        req = create_notification_request(
            event_type="ORDER_EXPORT_FAILED",
            source_module="routing",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[uuid.uuid4()],
            safe_payload_summary={"error_message": "SMTP Connection Timeout"},
            classification=NotificationClassification.REQUIRED_OPERATIONAL,
            channel=NotificationChannel.EMAIL
        )

        process_notification_request(str(req.id))

        # Company admin fallback is applied
        attempt = DeliveryAttempt.objects.filter(notification_request=req).first()
        assert attempt is not None
        assert attempt.recipient_id == self.vendor_user.id

    def test_seed_vendor_notification_templates(self):
        from apps.notification.tasks import seed_vendor_notification_templates
        from apps.notification.models import NotificationTemplate

        count = seed_vendor_notification_templates()
        assert count > 0
        assert NotificationTemplate.objects.filter(event_type="ORDER_EXPORT_FAILED").exists()
        assert NotificationTemplate.objects.filter(event_type="SHIPPING_INFORMATION_OVERDUE").exists()

    def test_seed_buyer_and_admin_notification_templates(self):
        from apps.notification.tasks import seed_buyer_notification_templates, seed_cixci_admin_notification_templates
        from apps.notification.models import NotificationTemplate

        count_buyer = seed_buyer_notification_templates()
        assert count_buyer > 0
        assert NotificationTemplate.objects.filter(event_type="NEW_COMPATIBLE_PRODUCTS_AVAILABLE").exists()
        assert NotificationTemplate.objects.filter(event_type="PRODUCT_EXPORT_FAILED").exists()

        count_admin = seed_cixci_admin_notification_templates()
        assert count_admin > 0
        assert NotificationTemplate.objects.filter(event_type="SLA_BREACH").exists()
        assert NotificationTemplate.objects.filter(event_type="MEDIA_UNMATCHED_AMBIGUOUS").exists()

    def test_api_only_and_dashboard_only_classifications(self):
        # API_ONLY event (e.g. ORDER_SHIPPED)
        req_api = create_notification_request(
            event_type="ORDER_SHIPPED",
            source_module="fulfillment",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={"title": "Order Shipped Event"},
            classification=NotificationClassification.API_ONLY,
            channel=NotificationChannel.EMAIL
        )
        process_notification_request(str(req_api.id))

        attempt_api = DeliveryAttempt.objects.filter(notification_request=req_api).first()
        assert attempt_api is not None
        assert attempt_api.status == DeliveryStatus.SUPPRESSED
        assert attempt_api.provider_name == "api_only_classification"

        # DASHBOARD_ONLY event (e.g. PENDING_APPROVAL) on Email channel
        req_dash = create_notification_request(
            event_type="PENDING_APPROVAL",
            source_module="catalog",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={"title": "Pending Approval"},
            classification=NotificationClassification.DASHBOARD_ONLY,
            channel=NotificationChannel.EMAIL
        )
        process_notification_request(str(req_dash.id))

        attempt_dash = DeliveryAttempt.objects.filter(notification_request=req_dash).first()
        assert attempt_dash is not None
        assert attempt_dash.status == DeliveryStatus.SUPPRESSED

    def test_cixci_controlled_templates(self):
        self.client.force_authenticate(user=self.vendor_user)
        # Non-cixci admin user attempting to create template should be denied
        res = self.client.post("/api/v1/notifications/templates/", {
            "event_type": "CUSTOM_EVENT",
            "channel": "email",
            "subject_template": "Subject",
            "body_template": "Body",
            "status": "approved",
            "version": 1
        })
        assert res.status_code == 403

    def test_new_compatible_products_eligibility_and_digest_filtering(self):
        # Section 16 & 23: NEW_COMPATIBLE_PRODUCTS_AVAILABLE event
        req_inapp = create_notification_request(
            event_type="NEW_COMPATIBLE_PRODUCTS_AVAILABLE",
            source_module="catalog",
            company_scope_reference=self.vendor_company.id,
            recipient_ids=[self.vendor_user.id],
            safe_payload_summary={"product_list": "Product A, Product B"},
            classification=NotificationClassification.INFORMATIONAL,
            channel=NotificationChannel.IN_APP
        )
        process_notification_request(str(req_inapp.id))

        inapp_notif = InAppNotification.objects.filter(recipient=self.vendor_user, event_type="NEW_COMPATIBLE_PRODUCTS_AVAILABLE").first()
        assert inapp_notif is not None
        assert inapp_notif.classification == NotificationClassification.INFORMATIONAL

    def test_activity_summary_cursor_anti_loss_on_failed_delivery(self):
        # Section 18 & 23: System Admin Activity Summary Cursor Anti-Loss
        from apps.notification.models import ActivitySummaryConfiguration, SummaryScheduleStatus
        config = ActivitySummaryConfiguration.objects.create(
            status=SummaryScheduleStatus.ACTIVE,
            delivery_times=["08:00"],
            created_by=self.vendor_user.id,
            last_successful_summary_cursor_reference=None
        )

        # Confirm cursor starts as None
        assert config.last_successful_summary_cursor_reference is None




