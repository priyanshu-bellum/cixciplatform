# Tenant Company OpenAPI Contracts

This document provides proposal-level OpenAPI endpoint inventory for Tenant Company authority evidence. It is not a finalized schema. Detailed field requirements are defined in `scope-authority-configuration-evidence.md`, `company-subtype-taxonomy-management.md`, `capability-flag-registry.md`, and summarized in `api-contracts.md`.

## Common Schema Requirements

Tenant Company responses should preserve Common Authority Evidence Controls, including evidence id, source module, source record reference, source record version/hash, source timestamp, freshness/expiration timestamps, effective/end dates, source disposition, inherited-vs-overridden state, applied-vs-ignored state, supersession reference, review-required state, access/redaction decision references where applicable, approval/override references where applicable, and audit reference.

Subtype taxonomy, subtype configuration evidence, subtype assignment, downstream impact preview, activation evidence, capability assignment evidence, and child onboarding request responses should also include activation/readiness/status references, blocked/review reasons where applicable, and historical supersession references.

APIs should return Tenant evidence only. They must not calculate pricing, grant product visibility, create invoices, approve POs, route orders, execute fulfillment, deliver notifications, transport integrations, produce analytics metrics, own audit evidence, or perform AI actions.

## Projection Generation Rules

Tenant Scope Evidence / Access Projection is generated, recalculated, or superseded from underlying Tenant-owned source records. Normal mutation endpoints should update source authority/configuration records and produce a new projection version. Downstream modules should never author Tenant evidence projections or subtype configuration evidence.

Direct repair/recompute endpoints are restricted placeholders for authorized System Admin or platform maintenance flows. They must create new projection versions or supersession records and preserve historical evidence used by invoices, orders, exports, reports, analytics, notifications, integrations, AI action decisions, pricing snapshots, catalog visibility, and procurement approvals.

## Proposed Read Endpoints

- `GET /tenant/scope-evidence`
- `GET /tenant/access-projections/{projectionId}`
- `GET /tenant/users/{userId}/role-scope-projections`
- `GET /tenant/relationships/buyer-vendor`
- `GET /tenant/channel-eligibility`
- `GET /tenant/product-type-enablement`
- `GET /tenant/capability-flags`
- `GET /tenant/companies/{companyId}/activation-evidence`
- `GET /tenant/child-onboarding-requests/{requestId}`
- `GET /tenant/company-subtypes/{subtypeId}/configuration-evidence`
- `GET /tenant/companies/{companyId}/subtype-assignments`
- `GET /tenant/company-subtypes/{subtypeId}/activation-readiness`
- `GET /tenant/company-subtypes/impact-previews/{impactPreviewId}`
- `GET /tenant/import-export-authority`
- `GET /tenant/pricing-mode-configuration`
- `GET /tenant/commission-configuration-inputs`
- `GET /tenant/po-functionality`
- `GET /tenant/report-invoice-access-scope`
- `GET /tenant/notification-recipient-scope`
- `GET /tenant/api-integration-user-authority`
- `GET /tenant/ai-action-authority`

## Proposed Source Record Mutation Endpoints

- `POST /tenant/parent-child-links`
- `POST /tenant/child-overrides`
- `PATCH /tenant/child-overrides/{overrideId}`
- `POST /tenant/child-onboarding-requests`
- `POST /tenant/child-onboarding-requests/{requestId}/approve`
- `POST /tenant/child-onboarding-requests/{requestId}/reject`
- `POST /tenant/child-onboarding-requests/{requestId}/withdraw`
- `POST /tenant/child-onboarding-requests/{requestId}/expire`
- `POST /tenant/companies/{companyId}/activation-evidence`
- `POST /tenant/relationships/buyer-vendor`
- `PATCH /tenant/relationships/buyer-vendor/{relationshipEvidenceId}`
- `POST /tenant/company-subtypes`
- `PATCH /tenant/company-subtypes/{subtypeId}`
- `POST /tenant/company-subtypes/{subtypeId}/configuration-evidence`
- `POST /tenant/company-subtypes/{subtypeId}/validate-activation-readiness`
- `POST /tenant/company-subtypes/{subtypeId}/activate`
- `POST /tenant/company-subtypes/{subtypeId}/retire`
- `POST /tenant/company-subtypes/{subtypeId}/supersede`
- `POST /tenant/companies/{companyId}/subtype-assignments`
- `POST /tenant/companies/{companyId}/subtype-reassignments`
- `POST /tenant/companies/{companyId}/subtype-impact-preview`
- `POST /tenant/import-export-authority`
- `PATCH /tenant/import-export-authority/{authorityId}`
- `POST /tenant/pricing-mode-configuration`
- `PATCH /tenant/pricing-mode-configuration/{configurationId}`
- `POST /tenant/commission-configuration-inputs`
- `PATCH /tenant/commission-configuration-inputs/{configurationInputId}`
- `POST /tenant/channel-eligibility`
- `PATCH /tenant/channel-eligibility/{channelEligibilityId}`
- `POST /tenant/product-type-enablement`
- `PATCH /tenant/product-type-enablement/{productTypeEnablementId}`
- `POST /tenant/po-functionality`
- `PATCH /tenant/po-functionality/{poFunctionalityScopeId}`
- `POST /tenant/report-invoice-access-scope`
- `PATCH /tenant/report-invoice-access-scope/{accessScopeId}`
- `POST /tenant/notification-recipient-scope`
- `PATCH /tenant/notification-recipient-scope/{recipientScopeId}`
- `POST /tenant/api-integration-user-authority`
- `PATCH /tenant/api-integration-user-authority/{authorityId}`
- `POST /tenant/ai-action-authority`
- `PATCH /tenant/ai-action-authority/{authorityId}`

Source record mutation endpoints should emit normalized Tenant events and produce or supersede affected projection versions. They should not directly overwrite an already-consumed Tenant Scope Evidence version, historical subtype configuration evidence, or historical activation evidence.

## Restricted Projection Repair / Recompute Endpoints

- `POST /tenant/scope-evidence/{evidenceId}/recompute`
- `POST /tenant/scope-evidence/recompute-by-source-record`
- `POST /tenant/scope-evidence/{evidenceId}/supersede`

These endpoints are placeholders for authorized System Admin or platform maintenance flows only. They must be versioned, audited, and explicit about source records, recompute reason, supersession behavior, and historical evidence preservation.

## Proposed Validation Endpoints

- `POST /tenant/authority/validate-import-export-action`
- `POST /tenant/authority/validate-report-invoice-access`
- `POST /tenant/authority/validate-notification-recipient-scope`
- `POST /tenant/authority/validate-api-integration-action`
- `POST /tenant/authority/validate-ai-action`
- `POST /tenant/authority/validate-po-action`
- `POST /tenant/authority/validate-channel-eligibility`
- `POST /tenant/authority/validate-product-type-enablement`
- `POST /tenant/company-subtypes/{subtypeId}/validate-activation-readiness`
- `POST /tenant/companies/{companyId}/validate-subtype-assignment`

Validation endpoints should return evidence references and disposition, not execute the downstream action. External APIs should not expose direct `check_access`; public command endpoints should call internal authority resolution and return controlled dispositions.

## Error / Review Responses

OpenAPI schemas should support review responses for missing/stale Tenant scope evidence, activation evidence missing/stale, Pending Setup restrictions, parent Suspended lifecycle denial, child onboarding request not authorized, child onboarding request approval failure, insufficient `parent_management.request_child_onboarding`, expired channel eligibility, superseded pricing mode configuration, ignored commission input, conflicting parent/child override evidence, suspended buyer/vendor relationship, destructive action not authorized, subtype activation readiness failed, subtype configuration evidence missing or superseded, retired subtype assignment blocked, PO functionality disabled, stale PO authority, report/invoice access denied, redaction required, notification recipient scope expired, API/integration authority superseded, AI action authority expired, and projection recompute unauthorized.

## Event Naming

OpenAPI event references should use the Tenant Company event inventory defined in `events.md` and `event-contracts.md`, including `company.capability_changed` and the five v1 `child_onboarding_request.*` events.

## Cross-Module Consumer Notes

- Product Catalog consumes buyer/vendor/channel/Product Type/permission/subtype/capability evidence for catalog visibility and accessory discovery rules, but owns product records and visibility projections.
- Pricing consumes buyer pricing mode, commission configuration input, and subtype pricing/channel input evidence, but owns calculation and snapshots.
- Procurement consumes subtype PO defaults and approval authority evidence, but owns PO lifecycle.
- Invoice Management and Analytics consume report/invoice access and redaction evidence.
- Notification Platform Service consumes notification recipient scope evidence.
- Integration Management consumes API/integration user authority evidence.
- AI Agent Services consumes AI action authority evidence and does not define eligibility.
