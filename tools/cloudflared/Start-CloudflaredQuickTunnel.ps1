param(
    [string]$Url = 'http://127.0.0.1:8000'
)

$ErrorActionPreference = 'Stop'

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

try {
    & $exe tunnel --url $Url
    exit $LASTEXITCODE
}
finally {
    foreach ($name in $proxyVars) {
        [Environment]::SetEnvironmentVariable($name, $savedProxyValues[$name], 'Process')
    }
}
