param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $toolDir 'cloudflared.exe'

if (-not (Test-Path $exe)) {
    throw "cloudflared.exe not found at $exe"
}

$resolvedConfig = (Resolve-Path $ConfigPath).Path
$proxyVars = 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'
$savedProxyValues = @{}

foreach ($name in $proxyVars) {
    $savedProxyValues[$name] = [Environment]::GetEnvironmentVariable($name)
    [Environment]::SetEnvironmentVariable($name, '', 'Process')
}

try {
    & $exe tunnel --config $resolvedConfig run
    exit $LASTEXITCODE
}
finally {
    foreach ($name in $proxyVars) {
        [Environment]::SetEnvironmentVariable($name, $savedProxyValues[$name], 'Process')
    }
}
