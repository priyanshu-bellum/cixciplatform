"""Company Profile failures must be actionable and leave saved state intact."""
import pytest
from apps.tenant.models import Company
from apps.audit.models import AuditRecord
from django.db import IntegrityError

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def draft_profile(vendor_company):
    # Reach model-level validation rather than unrelated activation readiness.
    vendor_company.status = 'draft'
    vendor_company.save()


def test_invalid_parent_child_update_is_400_and_atomic(admin_client, vendor_company):
    parent = Company.objects.create(name='Profile Parent', slug='profile-parent', company_type='vendor', is_parent=True)
    vendor_company.parent_company = parent
    vendor_company.save()
    original_name = vendor_company.name
    admin_client.raise_request_exception = False
    response = admin_client.patch(f'/api/v1/tenant/companies/{vendor_company.id}/', {'name': 'Must roll back', 'is_parent': True}, format='json')
    assert response.status_code == 400
    vendor_company.refresh_from_db()
    assert vendor_company.name == original_name and vendor_company.is_parent is False


def test_generated_slug_collision_is_400_and_preserves_profile(admin_client, vendor_company):
    Company.objects.create(name='Slug Owner', display_name='Different Display Name', slug='same-display', company_type='vendor')
    original = vendor_company.display_name
    admin_client.raise_request_exception = False
    response = admin_client.patch(f'/api/v1/tenant/companies/{vendor_company.id}/', {'display_name': 'Same Display!'}, format='json')
    assert response.status_code == 400
    assert 'slug' in str(getattr(response, 'data', {})).lower()
    vendor_company.refresh_from_db()
    assert vendor_company.display_name == original


def test_invalid_company_creation_does_not_leave_company_or_hq(admin_client, vendor_company):
    admin_client.raise_request_exception = False
    before = Company.objects.count()
    response = admin_client.post('/api/v1/tenant/companies/', {'name': 'Invalid Profile', 'slug': 'invalid-profile', 'company_type': 'vendor', 'parent_company': str(vendor_company.id), 'is_parent': True}, format='json')
    assert response.status_code == 400
    assert Company.objects.count() == before


@pytest.mark.parametrize('pricing_mode', ['custom', 'no_commission'])
def test_unrelated_profile_patch_preserves_pricing_mode(admin_client, vendor_company, pricing_mode):
    vendor_company.buyer_pricing_mode = pricing_mode
    vendor_company.commission_percentage = 7 if pricing_mode == 'custom' else 0
    vendor_company.save()
    response = admin_client.patch(f'/api/v1/tenant/companies/{vendor_company.id}/', {'phone_number': '555-0100'}, format='json')
    assert response.status_code == 200, response.data
    vendor_company.refresh_from_db()
    assert vendor_company.buyer_pricing_mode == pricing_mode
    assert vendor_company.commission_percentage == (7 if pricing_mode == 'custom' else 0)
    assert AuditRecord.objects.filter(event_code='tenant.company.profile_updated', company_scope_reference=vendor_company.id).exists()


def test_slug_uniqueness_race_returns_actionable_400(admin_client, vendor_company, monkeypatch):
    def concurrent_conflict(*args, **kwargs):
        raise IntegrityError('UNIQUE constraint failed: tenant_company.slug')
    monkeypatch.setattr(Company, 'save', concurrent_conflict)
    admin_client.raise_request_exception = False
    response = admin_client.patch(f'/api/v1/tenant/companies/{vendor_company.id}/', {'phone_number': '555-0101'}, format='json')
    assert response.status_code == 400
    assert 'slug' in str(getattr(response, 'data', {})).lower()


@pytest.mark.parametrize('payload', [{'country_code': 'invalid'}, {'external_id': 'x' * 256}, {'commission_percentage': 'NaN'}, {'parent_company': 'not-a-uuid'}])
def test_invalid_profile_values_are_400_and_do_not_partially_update(admin_client, vendor_company, payload):
    previous_name = vendor_company.name
    admin_client.raise_request_exception = False
    response = admin_client.patch(f'/api/v1/tenant/companies/{vendor_company.id}/', {'name': 'Must not persist', **payload}, format='json')
    assert response.status_code == 400
    vendor_company.refresh_from_db()
    assert vendor_company.name == previous_name
