param([ValidateSet('sqlite', 'postgres', 'both')][string]$Database='both', [string]$ComposeFile='E:\cixci\docker-compose.local-copy.yml')
$ErrorActionPreference='Stop'
$backendPath=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../backend')).Path.Replace('\','/')
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'verify-compatibility-backend.ps1') -Raw
$testFiles=@([regex]::Matches($manifest,"tests/[A-Za-z0-9_]+\.py") | ForEach-Object {$_.Value}) + @('tests/test_vendor_catalog_sync.py', 'tests/test_supplier_brand_entry.py')
$targets=if($Database -eq 'both'){@('sqlite','postgres')}else{@($Database)}
foreach($target in $targets){
    $settings=if($target -eq 'postgres'){'config.compatibility_test_settings'}else{'config.test_settings'}
    Write-Output "Unified Vendor feature verification on isolated $target test database"
    $ErrorActionPreference='Continue' # Docker progress uses stderr even on success.
    & docker compose -f $ComposeFile run --rm --no-deps -T -v "${backendPath}:/app" -e "DJANGO_SETTINGS_MODULE=$settings" backend pytest @testFiles "--ds=$settings" -q
    $testExit=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    if($testExit -ne 0){exit $testExit}
}
