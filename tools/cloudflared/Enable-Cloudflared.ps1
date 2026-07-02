param()

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $toolDir 'cloudflared.exe'

if (-not (Test-Path $exe)) {
    throw "cloudflared.exe not found at $exe"
}

$pathParts = @($env:PATH -split ';') | Where-Object { $_ -and $_.Trim() }
if (-not ($pathParts | Where-Object { $_.TrimEnd('\') -ieq $toolDir.TrimEnd('\') })) {
    $env:PATH = "$toolDir;$env:PATH"
}

Write-Host "Added to session PATH: $toolDir"
& $exe --version
