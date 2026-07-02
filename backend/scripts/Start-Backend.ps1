param(
    [string]$ListenHost = '127.0.0.1',
    [int]$Port = 8000,
    [switch]$Reload
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backendDir = Join-Path $repoRoot 'backend'

Push-Location $backendDir
try {
    $env:PYTHONUTF8 = '1'
    $env:UV_CACHE_DIR = Join-Path $repoRoot '.uv-cache'
    $args = @('run', 'uvicorn', 'app.main:app', '--host', $ListenHost, '--port', $Port)
    if ($Reload) {
        $args = @('run', 'uvicorn', 'app.main:app', '--reload', '--host', $ListenHost, '--port', $Port)
    }
    & uv @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
