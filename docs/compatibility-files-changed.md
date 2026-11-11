# Compatibility feature working-tree file inventory

Follow-up to commit `53b655e`: single-product parity and the requested dropdown
management restoration modify `frontend/src/pages/DevicesPage.tsx`,
`frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx`,
`frontend/src/pages/catalog/dialogs/DropdownManagerDialog.tsx`,
`backend/tests/test_compatibility_api_contract.py` and
`scripts/verify-compatibility-ui.mjs`. New supporting files are
`frontend/src/pages/catalog/compatibilityEntry.ts`,
`scripts/verify-product-entry-ui.mjs`, `scripts/verify-device-dropdown-ui.mjs`
and `docs/single-product-compatibility-parity.md`. This inventory and the
verification checklist are also updated. The historical 89-file inventory below
describes the already pushed Phase 1 work.

Includes continued Claude changes and the subsequent repairs. Supplied source
documents under `bugs/` and `docs/` are preserved separately and are not claimed as authored
feature changes. Private environment files, database dumps and test artifacts
are excluded. This inventory does not stage, commit or push files.

Feature files listed: 89.

## Backend policy and API

- [backend/apps/catalog/api.py](../backend/apps/catalog/api.py) — modified
- [backend/apps/catalog/compatibility_commands.py](../backend/apps/catalog/compatibility_commands.py) — added
- [backend/apps/catalog/compatibility_configuration.py](../backend/apps/catalog/compatibility_configuration.py) — added
- [backend/apps/catalog/compatibility_contract.py](../backend/apps/catalog/compatibility_contract.py) — added
- [backend/apps/catalog/compatibility_engine.py](../backend/apps/catalog/compatibility_engine.py) — modified
- [backend/apps/catalog/compatibility_import.py](../backend/apps/catalog/compatibility_import.py) — added
- [backend/apps/catalog/compatibility_values.py](../backend/apps/catalog/compatibility_values.py) — added
- [backend/apps/catalog/management/commands/audit_compatibility.py](../backend/apps/catalog/management/commands/audit_compatibility.py) — added
- [backend/apps/catalog/management/commands/reconcile_compatibility.py](../backend/apps/catalog/management/commands/reconcile_compatibility.py) — added
- [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) — modified
- [backend/apps/catalog/services.py](../backend/apps/catalog/services.py) — modified
- [backend/apps/catalog/tasks.py](../backend/apps/catalog/tasks.py) — modified
- [backend/apps/devices/models.py](../backend/apps/devices/models.py) — modified
- [backend/apps/devices/serializers.py](../backend/apps/devices/serializers.py) — modified
- [backend/apps/devices/views.py](../backend/apps/devices/views.py) — modified
- [backend/apps/integration/authentication.py](../backend/apps/integration/authentication.py) — modified
- [backend/apps/pricing/api.py](../backend/apps/pricing/api.py) — modified
- [backend/apps/shared_api.py](../backend/apps/shared_api.py) — modified
- [backend/apps/tenant/country_codes.json](../backend/apps/tenant/country_codes.json) — added
- [backend/apps/tenant/country_regions.py](../backend/apps/tenant/country_regions.py) — added
- [backend/apps/tenant/models.py](../backend/apps/tenant/models.py) — modified
- [backend/apps/tenant/regional_api.py](../backend/apps/tenant/regional_api.py) — added
- [backend/apps/tenant/regional_visibility.py](../backend/apps/tenant/regional_visibility.py) — added
- [backend/apps/tenant/serializers.py](../backend/apps/tenant/serializers.py) — modified
- [backend/apps/tenant/services.py](../backend/apps/tenant/services.py) — modified
- [backend/apps/tenant/tasks.py](../backend/apps/tenant/tasks.py) — modified
- [backend/apps/tenant/urls/tenant.py](../backend/apps/tenant/urls/tenant.py) — modified
- [backend/apps/tenant/views.py](../backend/apps/tenant/views.py) — modified

## Schema and data migrations

- [backend/apps/catalog/migrations/0026_fix_compatibility_data.py](../backend/apps/catalog/migrations/0026_fix_compatibility_data.py) — added
- [backend/apps/catalog/migrations/0027_canonical_compatibility_evidence.py](../backend/apps/catalog/migrations/0027_canonical_compatibility_evidence.py) — added
- [backend/apps/catalog/migrations/0028_backfill_compatibility_references.py](../backend/apps/catalog/migrations/0028_backfill_compatibility_references.py) — added
- [backend/apps/catalog/migrations/0029_repair_invalid_universal_evidence.py](../backend/apps/catalog/migrations/0029_repair_invalid_universal_evidence.py) — added
- [backend/apps/catalog/migrations/0030_vendor_sku_lookup_index.py](../backend/apps/catalog/migrations/0030_vendor_sku_lookup_index.py) — added
- [backend/apps/catalog/migrations/0031_approved_automatic_mapping_configuration.py](../backend/apps/catalog/migrations/0031_approved_automatic_mapping_configuration.py) — added
- [backend/apps/catalog/migrations/0032_approved_speaker_universal_scope.py](../backend/apps/catalog/migrations/0032_approved_speaker_universal_scope.py) — added
- [backend/apps/tenant/migrations/0013_explicit_operating_regions.py](../backend/apps/tenant/migrations/0013_explicit_operating_regions.py) — added
- [backend/apps/tenant/migrations/0014_buyer_region_from_country.py](../backend/apps/tenant/migrations/0014_buyer_region_from_country.py) — added

## Backend settings and verification

- [backend/.env.example](../backend/.env.example) — modified
- [backend/config/cache_service.py](../backend/config/cache_service.py) — modified
- [backend/config/compatibility_test_settings.py](../backend/config/compatibility_test_settings.py) — added
- [backend/config/settings.py](../backend/config/settings.py) — modified
- [backend/tests/test_approved_speaker_scope.py](../backend/tests/test_approved_speaker_scope.py) — added
- [backend/tests/test_buyer_data_integration_spec.py](../backend/tests/test_buyer_data_integration_spec.py) — modified
- [backend/tests/test_buyer_export_history.py](../backend/tests/test_buyer_export_history.py) — modified
- [backend/tests/test_buyer_facing_pricing.py](../backend/tests/test_buyer_facing_pricing.py) — modified
- [backend/tests/test_buyer_projection_sync.py](../backend/tests/test_buyer_projection_sync.py) — modified
- [backend/tests/test_catalog.py](../backend/tests/test_catalog.py) — modified
- [backend/tests/test_catalog_pagination.py](../backend/tests/test_catalog_pagination.py) — modified
- [backend/tests/test_compatibility_api_contract.py](../backend/tests/test_compatibility_api_contract.py) — added
- [backend/tests/test_compatibility_automapping.py](../backend/tests/test_compatibility_automapping.py) — modified
- [backend/tests/test_compatibility_contract.py](../backend/tests/test_compatibility_contract.py) — added
- [backend/tests/test_compatibility_engine_fixes.py](../backend/tests/test_compatibility_engine_fixes.py) — added
- [backend/tests/test_compatibility_failure_paths.py](../backend/tests/test_compatibility_failure_paths.py) — added
- [backend/tests/test_compatibility_feature_matrix.py](../backend/tests/test_compatibility_feature_matrix.py) — added
- [backend/tests/test_compatibility_workflows.py](../backend/tests/test_compatibility_workflows.py) — added
- [backend/tests/test_device_lifecycle_task.py](../backend/tests/test_device_lifecycle_task.py) — modified
- [backend/tests/test_devices.py](../backend/tests/test_devices.py) — modified
- [backend/tests/test_intelligent_compatibility.py](../backend/tests/test_intelligent_compatibility.py) — modified
- [backend/tests/test_regional_visibility_contract.py](../backend/tests/test_regional_visibility_contract.py) — added
- [backend/tests/test_tenant.py](../backend/tests/test_tenant.py) — modified

## Frontend

- [frontend/src/components/CompatibilityFields.tsx](../frontend/src/components/CompatibilityFields.tsx) — added
- [frontend/src/components/CompatibilityValuesManager.tsx](../frontend/src/components/CompatibilityValuesManager.tsx) — added
- [frontend/src/hooks/useCompatibilityOptions.ts](../frontend/src/hooks/useCompatibilityOptions.ts) — added
- [frontend/src/hooks/useSupplierCompanies.ts](../frontend/src/hooks/useSupplierCompanies.ts) — added
- [frontend/src/pages/DashboardPage.tsx](../frontend/src/pages/DashboardPage.tsx) — modified
- [frontend/src/pages/DevicesPage.tsx](../frontend/src/pages/DevicesPage.tsx) — modified
- [frontend/src/pages/IntegrationPage.tsx](../frontend/src/pages/IntegrationPage.tsx) — modified
- [frontend/src/pages/RegionalPage.tsx](../frontend/src/pages/RegionalPage.tsx) — modified
- [frontend/src/pages/StubPages.tsx](../frontend/src/pages/StubPages.tsx) — modified
- [frontend/src/pages/catalog/CatalogPage.tsx](../frontend/src/pages/catalog/CatalogPage.tsx) — modified
- [frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx](../frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx) — modified
- [frontend/src/pages/catalog/dialogs/DropdownManagerDialog.tsx](../frontend/src/pages/catalog/dialogs/DropdownManagerDialog.tsx) — modified
- [frontend/src/pages/catalog/dialogs/ExcludeDeviceDialog.tsx](../frontend/src/pages/catalog/dialogs/ExcludeDeviceDialog.tsx) — modified
- [frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx](../frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx) — modified
- [frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx](../frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx) — modified
- [frontend/src/pages/catalog/hooks/useProductForm.ts](../frontend/src/pages/catalog/hooks/useProductForm.ts) — modified
- [frontend/src/pages/catalog/utils.ts](../frontend/src/pages/catalog/utils.ts) — modified
- [frontend/src/pages/regional/OperatingRegionSetup.tsx](../frontend/src/pages/regional/OperatingRegionSetup.tsx) — added
- [frontend/src/pages/regional/RegionUpdateDialog.tsx](../frontend/src/pages/regional/RegionUpdateDialog.tsx) — modified
- [frontend/src/pages/regional/ShippingFeeDialog.tsx](../frontend/src/pages/regional/ShippingFeeDialog.tsx) — modified
- [frontend/src/theme/components.ts](../frontend/src/theme/components.ts) — modified

## Documentation and scripts

- [docs/compatibility-api-and-region-flow.md](../docs/compatibility-api-and-region-flow.md) — added
- [docs/compatibility-files-changed.md](../docs/compatibility-files-changed.md) — added
- [docs/compatibility-remediation-analysis-plan.md](../docs/compatibility-remediation-analysis-plan.md) — added
- [docs/compatibility-verification-checklist.md](../docs/compatibility-verification-checklist.md) — added
- [docs/onboarding-and-vendor-integration-plan.md](../docs/onboarding-and-vendor-integration-plan.md) — added
- [docs/region-setup-admin-guide.md](../docs/region-setup-admin-guide.md) — added
- [scripts/verify-compatibility-backend.ps1](../scripts/verify-compatibility-backend.ps1) — added
- [scripts/verify-compatibility-ui.mjs](../scripts/verify-compatibility-ui.mjs) — added
