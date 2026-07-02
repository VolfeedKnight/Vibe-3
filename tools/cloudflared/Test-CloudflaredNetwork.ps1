param()

$ErrorActionPreference = 'Continue'

$targets = @(
    'region1.v2.argotunnel.com',
    'region2.v2.argotunnel.com',
    'api.cloudflare.com'
)

Write-Host 'Proxy environment variables:'
foreach ($name in @('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY')) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) {
        Write-Host "  ${name}=${value}"
    }
    else {
        Write-Host "  ${name}=<empty>"
    }
}

Write-Host ''
Write-Host 'DNS checks:'
foreach ($target in $targets) {
    try {
        $records = Resolve-DnsName $target -Type A -ErrorAction Stop | Select-Object -First 3
        foreach ($record in $records) {
            Write-Host "  ${target} -> $($record.IPAddress)"
        }
    }
    catch {
        Write-Host "  ${target} -> FAILED: $($_.Exception.Message)"
    }
}

Write-Host ''
Write-Host 'TCP checks:'
foreach ($target in $targets) {
    $result = Test-NetConnection $target -Port 443 -InformationLevel Quiet
    Write-Host "  ${target}:443 -> $result"
}
