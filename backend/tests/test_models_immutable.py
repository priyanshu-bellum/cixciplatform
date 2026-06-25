"""
Model-level immutability constraint tests.

These tests verify that models with custom save() overrides correctly enforce
their immutability rules without requiring HTTP. Architecture rules tested:

- SLAEvaluationRecord: immutable after creation
- EffectivePriceSnapshot: immutable after creation (append-only via supersession)
- ReturnAdjustmentPricingEvidence: append-only
- SLAOverrideExcuseEvidence: immutable (reversal requires new record)
- ActivitySummaryAggregationRecord: immutable after creation
- DeliveryDateCorrectionEvidence: immutable
"""
import uuid
import pytest
from django.utils import timezone


# ── Pricing ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEffectivePriceSnapshotImmutable:
    def _make_profile(self):
        from apps.pricing.models import PricingProfile, PricingChannel
        return PricingProfile.objects.create(
            vendor_company_reference=uuid.uuid4(),
            channel=PricingChannel.ONLINE_DTC,
            currency="USD",
        )

    def test_snapshot_can_be_created(self):
        from apps.pricing.models import EffectivePriceSnapshot, SnapshotBindability
        profile = self._make_profile()
        snap = EffectivePriceSnapshot.objects.create(
            pricing_profile=profile,
            product_reference=uuid.uuid4(),
            channel="online_dtc",
            vendor_wholesale_price="10.0000",
            vendor_side_commission_amount="0.7000",
            buyer_side_commission_amount="0.7000",
            buyer_facing_price="12.0000",
            bindability_status=SnapshotBindability.ORDER_BINDABLE,
        )
        assert snap.pk is not None

    def test_snapshot_save_after_creation_raises(self):
        from apps.pricing.models import EffectivePriceSnapshot, SnapshotBindability
        profile = self._make_profile()
        snap = EffectivePriceSnapshot.objects.create(
            pricing_profile=profile,
            product_reference=uuid.uuid4(),
            channel="online_dtc",
            vendor_wholesale_price="10.0000",
            vendor_side_commission_amount="0.7000",
            buyer_side_commission_amount="0.7000",
            buyer_facing_price="12.0000",
            bindability_status=SnapshotBindability.ORDER_BINDABLE,
        )
        snap.buyer_facing_price = "99.0000"
        with pytest.raises(ValueError, match="immutable"):
            snap.save()


@pytest.mark.django_db
class TestReturnAdjustmentPricingEvidenceImmutable:
    def test_return_adjustment_can_be_created(self):
        from apps.pricing.models import (
            PricingProfile, EffectivePriceSnapshot, SnapshotBindability,
            ReturnAdjustmentPricingEvidence, PricingChannel,
        )
        profile = PricingProfile.objects.create(
            vendor_company_reference=uuid.uuid4(),
            channel=PricingChannel.ONLINE_DTC,
        )
        snap = EffectivePriceSnapshot.objects.create(
            pricing_profile=profile,
            product_reference=uuid.uuid4(),
            channel="online_dtc",
            vendor_wholesale_price="10.0000",
            vendor_side_commission_amount="0.5000",
            buyer_side_commission_amount="0.5000",
            buyer_facing_price="11.0000",
            bindability_status=SnapshotBindability.ORDER_BINDABLE,
        )
        evidence = ReturnAdjustmentPricingEvidence.objects.create(
            return_reference=uuid.uuid4(),
            original_snapshot=snap,
            adjustment_amount="-11.0000",
            adjustment_currency="USD",
            adjustment_reason="customer_return",
        )
        assert evidence.pk is not None

    def test_return_adjustment_update_raises(self):
        from apps.pricing.models import (
            PricingProfile, EffectivePriceSnapshot, SnapshotBindability,
            ReturnAdjustmentPricingEvidence, PricingChannel,
        )
        profile = PricingProfile.objects.create(
            vendor_company_reference=uuid.uuid4(),
            channel=PricingChannel.BULK_PO,
        )
        snap = EffectivePriceSnapshot.objects.create(
            pricing_profile=profile,
            product_reference=uuid.uuid4(),
            channel="bulk_po",
            vendor_wholesale_price="20.0000",
            vendor_side_commission_amount="1.0000",
            buyer_side_commission_amount="1.0000",
            buyer_facing_price="22.0000",
            bindability_status=SnapshotBindability.NOT_BINDABLE,
        )
        evidence = ReturnAdjustmentPricingEvidence.objects.create(
            return_reference=uuid.uuid4(),
            original_snapshot=snap,
            adjustment_amount="-22.0000",
            adjustment_currency="USD",
            adjustment_reason="full_return",
        )
        evidence.adjustment_reason = "changed_reason"
        with pytest.raises(ValueError, match="append-only"):
            evidence.save()


# ── Fulfillment ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSLAEvaluationRecordImmutable:
    def _make_handoff_and_policy(self):
        from apps.fulfillment.models import (
            FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy,
        )
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=uuid.uuid4(),
            company_scope_reference=uuid.uuid4(),
        )
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=handoff.vendor_company_reference,
            response_window_hours=48,
            status="active",
        )
        return handoff, policy

    def test_sla_evaluation_can_be_created(self):
        from apps.fulfillment.models import SLAEvaluationRecord, SLAOutcome
        handoff, policy = self._make_handoff_and_policy()
        record = SLAEvaluationRecord.objects.create(
            handoff=handoff,
            sla_policy=policy,
            delivery_evidence_reference=uuid.uuid4(),
            expected_response_by=timezone.now(),
            outcome=SLAOutcome.PENDING,
        )
        assert record.pk is not None

    def test_sla_evaluation_save_after_creation_raises(self):
        from apps.fulfillment.models import SLAEvaluationRecord, SLAOutcome
        handoff, policy = self._make_handoff_and_policy()
        record = SLAEvaluationRecord.objects.create(
            handoff=handoff,
            sla_policy=policy,
            delivery_evidence_reference=uuid.uuid4(),
            expected_response_by=timezone.now(),
            outcome=SLAOutcome.PENDING,
        )
        record.outcome = SLAOutcome.LATE
        with pytest.raises(ValueError, match="immutable"):
            record.save()


@pytest.mark.django_db
class TestSLAOverrideExcuseEvidenceImmutable:
    def test_override_evidence_can_be_created(self):
        from apps.fulfillment.models import (
            FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy,
            SLAEvaluationRecord, SLAOverrideExcuseEvidence, SLAOutcome,
        )
        vendor_ref = uuid.uuid4()
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=vendor_ref,
            company_scope_reference=uuid.uuid4(),
        )
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=vendor_ref,
            response_window_hours=24,
            status="active",
        )
        record = SLAEvaluationRecord.objects.create(
            handoff=handoff, sla_policy=policy,
            delivery_evidence_reference=uuid.uuid4(),
            expected_response_by=timezone.now(),
            outcome=SLAOutcome.LATE,
        )
        override = SLAOverrideExcuseEvidence.objects.create(
            sla_evaluation=record,
            exception_type="late",
            exception_reference=uuid.uuid4(),
            override_reason="Weather event",
            override_category="weather_event",
            actor_reference=uuid.uuid4(),
        )
        assert override.pk is not None

    def test_override_evidence_update_raises(self):
        from apps.fulfillment.models import (
            FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy,
            SLAEvaluationRecord, SLAOverrideExcuseEvidence, SLAOutcome,
        )
        vendor_ref = uuid.uuid4()
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=vendor_ref,
            company_scope_reference=uuid.uuid4(),
        )
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=vendor_ref,
            response_window_hours=24,
            status="active",
        )
        record = SLAEvaluationRecord.objects.create(
            handoff=handoff, sla_policy=policy,
            delivery_evidence_reference=uuid.uuid4(),
            expected_response_by=timezone.now(),
            outcome=SLAOutcome.MISSING,
        )
        override = SLAOverrideExcuseEvidence.objects.create(
            sla_evaluation=record,
            exception_type="missing",
            exception_reference=uuid.uuid4(),
            override_reason="System outage",
            override_category="system_outage",
            actor_reference=uuid.uuid4(),
        )
        override.override_reason = "Changed"
        with pytest.raises(ValueError, match="immutable"):
            override.save()


@pytest.mark.django_db
class TestDeliveryDateCorrectionImmutable:
    def test_correction_can_be_created(self):
        from apps.fulfillment.models import (
            FulfillmentHandoff, DeliveryDateEvidence, DeliveryDateCorrectionEvidence,
        )
        import datetime
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=uuid.uuid4(),
            company_scope_reference=uuid.uuid4(),
        )
        evidence = DeliveryDateEvidence.objects.create(
            handoff=handoff,
            shipment_line_reference=uuid.uuid4(),
            vendor_reported_delivery_date=datetime.date.today(),
        )
        correction = DeliveryDateCorrectionEvidence.objects.create(
            original_delivery_date_evidence=evidence,
            corrected_delivery_date=datetime.date.today(),
            correction_reason="Carrier updated scan",
            authority_reference=uuid.uuid4(),
        )
        assert correction.pk is not None

    def test_correction_update_raises(self):
        from apps.fulfillment.models import (
            FulfillmentHandoff, DeliveryDateEvidence, DeliveryDateCorrectionEvidence,
        )
        import datetime
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=uuid.uuid4(),
            company_scope_reference=uuid.uuid4(),
        )
        evidence = DeliveryDateEvidence.objects.create(
            handoff=handoff,
            shipment_line_reference=uuid.uuid4(),
            vendor_reported_delivery_date=datetime.date.today(),
        )
        correction = DeliveryDateCorrectionEvidence.objects.create(
            original_delivery_date_evidence=evidence,
            corrected_delivery_date=datetime.date.today(),
            correction_reason="Initial correction",
            authority_reference=uuid.uuid4(),
        )
        correction.correction_reason = "Changed"
        with pytest.raises(ValueError, match="immutable"):
            correction.save()


# ── Analytics ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestActivitySummaryAggregationImmutable:
    def _make_window(self):
        from apps.analytics.models import ActivitySummaryReportingWindow
        now = timezone.now()
        return ActivitySummaryReportingWindow.objects.create(
            window_start=now,
            window_end=now,
            effective_start=now,
            status="active",
        )

    def test_aggregation_can_be_created(self):
        from apps.analytics.models import ActivitySummaryAggregationRecord
        window = self._make_window()
        record = ActivitySummaryAggregationRecord.objects.create(
            window=window,
            orders_count=10,
            shipments_count=8,
            result_discriminator="has_activity",
        )
        assert record.pk is not None
        assert record.orders_count == 10

    def test_aggregation_save_after_creation_raises(self):
        from apps.analytics.models import ActivitySummaryAggregationRecord
        window = self._make_window()
        record = ActivitySummaryAggregationRecord.objects.create(
            window=window,
            orders_count=5,
            result_discriminator="has_activity",
        )
        record.orders_count = 999
        with pytest.raises(ValueError, match="immutable"):
            record.save()


# ── check_access service with real DB ─────────────────────────────────────────

@pytest.mark.django_db
class TestCheckAccessWithRealDB:
    def test_admin_granted(self, admin_user):
        from apps.tenant.services import check_access
        result = check_access(admin_user, "any.capability.at.all")
        assert result.granted is True
        assert result.reason == "cixci_admin"

    def test_user_with_capability_granted(self, buyer_user):
        from apps.tenant.services import check_access
        result = check_access(buyer_user, "devices.device.list")
        assert result.granted is True

    def test_user_without_capability_denied(self, buyer_user):
        from apps.tenant.services import check_access
        result = check_access(buyer_user, "pricing.admin.override")
        assert result.granted is False
        assert result.reason == "capability_missing"

    def test_inactive_user_denied(self, buyer_user):
        from apps.tenant.services import check_access
        buyer_user.is_active = False
        buyer_user.save()
        result = check_access(buyer_user, "devices.device.list")
        assert result.granted is False
        assert result.reason == "user_inactive"

    def test_wrong_company_denied(self, buyer_user):
        from apps.tenant.services import check_access
        result = check_access(buyer_user, "devices.device.list", company_id=uuid.uuid4())
        assert result.granted is False
        assert result.reason == "company_scope_mismatch"

    def test_correct_company_granted(self, buyer_user):
        from apps.tenant.services import check_access
        result = check_access(
            buyer_user, "devices.device.list",
            company_id=buyer_user.entity.company_id,
        )
        assert result.granted is True
