param([string]$OutputRoot = '.local-copy/compatibility-analysis/client-release')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $env:CIXCI_QA_NODE -or -not $env:CIXCI_QA_CHROME -or -not $env:CIXCI_QA_EMAIL -or -not $env:CIXCI_QA_PASSWORD) {
    throw 'Set CIXCI_QA_NODE, CIXCI_QA_CHROME, CIXCI_QA_EMAIL and CIXCI_QA_PASSWORD at runtime.'
}
[IO.Directory]::CreateDirectory((Join-Path (Get-Location) $OutputRoot)) | Out-Null
foreach ($suite in @('company-profile', 'vendor-client', 'wireless-matrix', 'full')) {
    $env:CIXCI_QA_SUITE = if ($suite -eq 'full') { '' } else { $suite }
    $env:CIXCI_QA_OUTPUT = Join-Path $OutputRoot $suite
    $log = Join-Path $OutputRoot ($suite + '.log')
    & $env:CIXCI_QA_NODE scripts/verify-compatibility-ui.mjs > $log 2>&1
    if ($LASTEXITCODE -ne 0) { Get-Content -LiteralPath $log -Tail 25; exit $LASTEXITCODE }
    $report = Get-Content -LiteralPath (Join-Path $env:CIXCI_QA_OUTPUT 'ui-check-report.json') -Raw | ConvertFrom-Json
    $failed = @($report.checks | Where-Object { -not $_.pass }).Count
    Write-Output "$suite : $($report.checks.Count) checks, $failed failures"
    if ($failed -or $report.error) { throw "Failed browser suite: $suite" }
}
& $env:CIXCI_QA_NODE --experimental-strip-types --test scripts/csv-preview.test.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
