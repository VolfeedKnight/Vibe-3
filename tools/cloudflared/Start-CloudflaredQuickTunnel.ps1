param(
    [string]$Url = 'http://127.0.0.1:8000',
    [ValidateSet('4', '6', 'auto')]
    [string]$EdgeIpVersion = '4',
    [string[]]$DnsResolverAddrs = @('1.1.1.1:53', '8.8.8.8:53'),
    [switch]$RunPrechecks
)

$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $toolDir 'cloudflared.exe'

if (-not (Test-Path $exe)) {
    throw "cloudflared.exe not found at $exe"
}

$proxyVars = 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'
$savedProxyValues = @{}
$savedDnsResolverAddrs = [Environment]::GetEnvironmentVariable('TUNNEL_DNS_RESOLVER_ADDRS')

foreach ($name in $proxyVars) {
    $savedProxyValues[$name] = [Environment]::GetEnvironmentVariable($name)
    [Environment]::SetEnvironmentVariable($name, '', 'Process')
}

try {
    if ($DnsResolverAddrs.Count -gt 0) {
        [Environment]::SetEnvironmentVariable('TUNNEL_DNS_RESOLVER_ADDRS', ($DnsResolverAddrs -join ','), 'Process')
    }

    $args = @('tunnel', '--edge-ip-version', $EdgeIpVersion)
    if (-not $RunPrechecks) {
        $args += '--no-prechecks'
    }

    $args += @('--url', $Url)

    & $exe @args
    exit $LASTEXITCODE
}
finally {
    foreach ($name in $proxyVars) {
        [Environment]::SetEnvironmentVariable($name, $savedProxyValues[$name], 'Process')
    }
    [Environment]::SetEnvironmentVariable('TUNNEL_DNS_RESOLVER_ADDRS', $savedDnsResolverAddrs, 'Process')
}
