param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $toolDir 'cloudflared.exe'

if (-not (Test-Path $exe)) {
    throw "cloudflared.exe not found at $exe"
}

$proxyVars = 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'
$savedProxyValues = @{}

foreach ($name in $proxyVars) {
    $savedProxyValues[$name] = [Environment]::GetEnvironmentVariable($name)
    [Environment]::SetEnvironmentVariable($name, '', 'Process')
}

if ($Arguments.Count -eq 0) {
    try {
        & $exe --help
        exit $LASTEXITCODE
    }
    finally {
        foreach ($name in $proxyVars) {
            [Environment]::SetEnvironmentVariable($name, $savedProxyValues[$name], 'Process')
        }
    }
}

try {
    & $exe @Arguments
    exit $LASTEXITCODE
}
finally {
    foreach ($name in $proxyVars) {
        [Environment]::SetEnvironmentVariable($name, $savedProxyValues[$name], 'Process')
    }
}
