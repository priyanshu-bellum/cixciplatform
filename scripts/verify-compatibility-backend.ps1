param(
    [ValidateSet('sqlite', 'postgres', 'both')]
    [string]$Database = 'both'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$testFiles = @(
    'tests/test_compatibility_contract.py',
    'tests/test_compatibility_workflows.py',
    'tests/test_compatibility_feature_matrix.py',
    'tests/test_compatibility_failure_paths.py',
    'tests/test_compatibility_api_contract.py',
    'tests/test_product_universal_declaration.py',
    'tests/test_wireless_matrix_client_contract.py',
    'tests/test_company_profile_client_regressions.py',
    'tests/test_vendor_manual_import_regressions.py',
    'tests/test_bulk_image_scope_regressions.py',
    'tests/test_media_attach_flow.py',
    'tests/test_approved_speaker_scope.py',
    'tests/test_compatibility_engine_fixes.py',
    'tests/test_compatibility_automapping.py',
    'tests/test_intelligent_compatibility.py',
    'tests/test_buyer_export_history.py',
    'tests/test_buyer_projection_sync.py',
    'tests/test_device_lifecycle_task.py',
    'tests/test_device_launch_date_visibility.py',
    'tests/test_catalog_pagination.py',
    'tests/test_catalog.py',
    'tests/test_devices.py',
    'tests/test_regional_visibility_contract.py',
    'tests/test_tenant.py',
    'tests/test_buyer_data_integration_spec.py',
    'tests/test_buyer_facing_pricing.py'
)

$targets = if ($Database -eq 'both') { @('sqlite', 'postgres') } else { @($Database) }
foreach ($target in $targets) {
    $settings = if ($target -eq 'postgres') { 'config.compatibility_test_settings' } else { 'config.test_settings' }
    Write-Output "Verifying compatibility on isolated $target test database..."
    & docker compose -f docker-compose.local-copy.yml exec -T -e "DJANGO_SETTINGS_MODULE=$settings" backend pytest @testFiles "--ds=$settings" -q
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
