# Tenant, authentication and regional governance

Purpose: company/entity hierarchy, identity, capability authority, company user
management and operating-region eligibility. Features: AUTH-001/002, TEN-001, REG-001.
Verified from source 2026-11-19; runtime coverage is listed in ../VERIFICATION.md.

## Entry points and files

- [models](../../../backend/apps/tenant/models.py), [services](../../../backend/apps/tenant/services.py),
  [mixins](../../../backend/apps/tenant/mixins.py), [middleware](../../../backend/apps/tenant/middleware.py).
- [auth routes](../../../backend/apps/tenant/urls/auth.py), [tenant routes](../../../backend/apps/tenant/urls/tenant.py),
  [views](../../../backend/apps/tenant/views.py), [serializers](../../../backend/apps/tenant/serializers.py).
- [regional API](../../../backend/apps/tenant/regional_api.py), [regional eligibility](../../../backend/apps/tenant/regional_visibility.py),
  [country mapping](../../../backend/apps/tenant/country_regions.py), [email tasks](../../../backend/apps/tenant/tasks.py).
- Frontend: CompanyUsersPage, ConfirmEmailPage, ResetPasswordPage, RegionalPage,
  SettingsPage in StubPages; exact consumers in [API reference](../reference/api/tenant.md).

## Workflow, API and data

Company.save validates hierarchy/MAP restrictions, creates HQ for new companies and
assigns defaults. User links to entity; memberships carry company administration,
assigned/delegated capabilities and evidence. Invitations/provisioning and signed
onboarding/password flows use services and email dispatch. Login issues JWT;
users/me bootstraps SPA identity. check_access evaluates admin, status, defaults and
capabilities, with early buyer/vendor fallback branches that need review.

Active APIs: `/api/v1/auth/` and `/api/v1/tenant/`; [auth contracts](../reference/api/auth.md),
[tenant contracts](../reference/api/tenant.md). [All entities/fields](../reference/schema/tenant.md)
include Company/CompanyEntity/User, capabilities/memberships/invitations,
relationships/onboarding, OperatingRegion, DistributionCenter and RegionChangeEvent.

Dependencies: audit spine, email providers, cache service; company/API-key identity
is consumed by every domain. Regional reads require valid active buyer/entity/
country-backed operating region, active supplier approvals/relationships and one
effective regional shipping fee. Ambiguous fees fail eligibility rather than guess.

## Rules, security, tests and precautions

Rules: BR-TEN-001/002, BR-AUTH-001, BR-REG-001, BR-AUD-001. Preserve both company
and entity scope. The middleware only adds a lazy scope; it does not replace DRF,
queryset and service checks. Never authorize solely from a UI role label.

Tests: [tenant](../../../backend/tests/test_tenant.py), [company users](../../../backend/tests/test_company_user_management.py),
[regional contract](../../../backend/tests/test_regional_visibility_contract.py),
[invitations/email](../../../backend/tests/test_user_invitation_and_email.py),
[service tests](../../../backend/apps/tenant/test_services.py).
Known issues: ISSUE-005/008; downstream notification identity gaps ISSUE-006.
Changing Company.save has creation/cache/capability side effects; bulk writes bypass
some hooks. Clarify fallback/membership semantics before changing authority.
