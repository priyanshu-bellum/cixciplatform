import pytest
from uuid import uuid4
from django.utils import timezone
from datetime import timedelta

from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, EntityStatus
from apps.notification.models import (
    NotificationRequest, DeliveryAttempt, DeliveryStatus,
    PreferenceOutcome, NotificationTemplate, NotificationChannel, TemplateStatus
)
from apps.notification.tasks import process_notification_request
from apps.fulfillment.models import (
    FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy, SLAEvaluationRecord,
    SLAOutcome, ExceptionStatus, LateFulfillmentImportException,
    MissingFulfillmentImportException, PartialFulfillmentResponseException
)
from apps.fulfillment.tasks import evaluate_vendor_slas
from apps.routing.models import Order, RoutingStatus
from apps.analytics.models import (
    ActivitySummaryReportingWindow, ActivitySummaryAggregationRecord, WindowStatus
)
from apps.analytics.tasks import aggregate_reporting_window_metrics


@pytest.mark.django_db
class TestCeleryTasks:

    def test_process_notification_request_success(self, buyer_company, buyer_entity, buyer_user):
        """Test processing of notification request successfully sends an email attempt."""
        # 1. Create a notification template
        template = NotificationTemplate.objects.create(
            template_code="welcome_template",
            version=1,
            channel=NotificationChannel.EMAIL,
            event_type="user.welcome",
            subject_template="Welcome {user_name} to CIXCI",
            body_template="Hello {user_name}, we are glad to have you.",
            status=TemplateStatus.APPROVED
        )

        # 2. Create notification request (which triggers task via transaction.on_commit or direct call)
        req = NotificationRequest.objects.create(
            event_type="user.welcome",
            source_module="tenant",
            source_record_id=buyer_user.id,
            safe_payload_summary={"user_name": "Alexander"},
            requested_recipient_ids=[str(buyer_user.id)],
            company_scope_reference=buyer_company.id,
            template_code="welcome_template",
            channel=NotificationChannel.EMAIL,
            idempotency_key=str(uuid4())
        )

        # Call the task synchronously
        process_notification_request(str(req.id))

        # Check outcome on the request
        req.refresh_from_db()
        assert req.preference_outcome == PreferenceOutcome.SEND

        # Check delivery attempt
        attempts = DeliveryAttempt.objects.filter(notification_request=req)
        assert attempts.count() == 1
        attempt = attempts.first()
        assert attempt.recipient_id == buyer_user.id
        assert attempt.channel == NotificationChannel.EMAIL
        assert attempt.status == DeliveryStatus.SENT
        assert attempt.provider_name == "django_mail"

    def test_evaluate_vendor_slas_on_time_and_missing(self, vendor_company, buyer_company):
        """Test SLA evaluation task correctly marks on_time and missing records."""
        # Create an SLA policy
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=vendor_company.id,
            response_window_hours=2,
            effective_from=timezone.now()
        )

        # Create Handoff and evaluation record for on-time import
        handoff_ontime = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid4(),
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_company.id,
            status="received"
        )
        eval_ontime = SLAEvaluationRecord.objects.create(
            handoff=handoff_ontime,
            sla_policy=policy,
            delivery_evidence_reference=uuid4(),
            expected_response_by=timezone.now() + timedelta(hours=1),
            fulfillment_import_received_timestamp=timezone.now() - timedelta(minutes=10),
            outcome=SLAOutcome.PENDING
        )

        # Create Handoff and evaluation record for missing (expired window)
        handoff_missing = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid4(),
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_company.id,
            status="received"
        )
        eval_missing = SLAEvaluationRecord.objects.create(
            handoff=handoff_missing,
            sla_policy=policy,
            delivery_evidence_reference=uuid4(),
            expected_response_by=timezone.now() - timedelta(hours=1),
            outcome=SLAOutcome.PENDING
        )

        # Run task
        evaluate_vendor_slas()

        # Verify on-time
        eval_ontime.refresh_from_db()
        assert eval_ontime.outcome == SLAOutcome.ON_TIME
        assert eval_ontime.evaluated_at is not None

        # Verify missing
        eval_missing.refresh_from_db()
        assert eval_missing.outcome == SLAOutcome.MISSING
        assert eval_missing.evaluated_at is not None

        # Verify MissingFulfillmentImportException was created
        exceptions = MissingFulfillmentImportException.objects.filter(sla_evaluation=eval_missing)
        assert exceptions.count() == 1
        assert exceptions.first().status == ExceptionStatus.OPEN

    def test_aggregate_reporting_window_metrics(self, buyer_company, buyer_entity, buyer_user, vendor_company):
        """Test reporting window aggregation runs metrics counts correctly."""
        # 1. Create a reporting window
        now = timezone.now()
        window = ActivitySummaryReportingWindow.objects.create(
            window_start=now - timedelta(days=1),
            window_end=now + timedelta(hours=1),
            effective_start=now - timedelta(days=1),
            status=WindowStatus.ACTIVE
        )

        # 2. Populate some orders inside the window
        Order.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_entity.id,
            status=RoutingStatus.ROUTED,
            placed_at=now - timedelta(hours=2)
        )

        # 3. Populate some SLA exceptions inside the window
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=vendor_company.id,
            response_window_hours=2,
            effective_from=timezone.now()
        )
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid4(),
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_company.id,
            status="received"
        )
        eval_rec = SLAEvaluationRecord.objects.create(
            handoff=handoff,
            sla_policy=policy,
            delivery_evidence_reference=uuid4(),
            expected_response_by=now - timedelta(hours=5),
            fulfillment_import_received_timestamp=now - timedelta(hours=2),
            outcome=SLAOutcome.LATE
        )
        LateFulfillmentImportException.objects.create(
            sla_evaluation=eval_rec,
            status=ExceptionStatus.OPEN,
            actual_import_received_at=now - timedelta(hours=2),
            delay_hours=3.0,
            created_at=now - timedelta(hours=2)  # Inside the window
        )

        # Run aggregation
        aggregate_reporting_window_metrics(str(window.id))

        # Check aggregation record
        aggregation = ActivitySummaryAggregationRecord.objects.get(window=window)
        assert aggregation.is_current is True
        assert aggregation.orders_count == 1
        assert aggregation.late_imports_count == 1
        assert aggregation.sla_exceptions_count == 1
        assert aggregation.result_discriminator == "has_activity"
        assert len(aggregation.source_fact_references) == 2  # Order + Late Exception
