# Cloudflared Local Setup

This repository keeps a local copy of `cloudflared` at:

`tools/cloudflared/cloudflared.exe`

## Enable for the current PowerShell session

```powershell
.\tools\cloudflared\Enable-Cloudflared.ps1
```

After that, you can run:

```powershell
cloudflared --version
cloudflared tunnel login
cloudflared tunnel run <tunnel-name-or-id>
```

## Run without changing PATH

```powershell
.\tools\cloudflared\Invoke-Cloudflared.ps1 --version
.\tools\cloudflared\Invoke-Cloudflared.ps1 tunnel login
```

## Expose the backend with a free quick tunnel

```powershell
.\tools\cloudflared\Start-CloudflaredQuickTunnel.ps1 -Url http://127.0.0.1:8000
```

The Pages app can then point at the generated `trycloudflare.com` URL using the
backend connection card in the dashboard. The value is stored in the browser for
that session.

The quick tunnel launcher defaults to IPv4, skips cloudflared startup
prechecks, clears broken local proxy variables, and passes explicit DNS
resolvers through `TUNNEL_DNS_RESOLVER_ADDRS`. This reduces local DNS resolver
timeouts such as:

```text
Failed to initialize DNS local resolver error="lookup region1.v2.argotunnel.com: i/o timeout"
```

To run cloudflared's prechecks anyway:

```powershell
.\tools\cloudflared\Start-CloudflaredQuickTunnel.ps1 -Url http://127.0.0.1:8000 -RunPrechecks
```

To inspect DNS and proxy state:

```powershell
.\tools\cloudflared\Test-CloudflaredNetwork.ps1
```

If Cloudflare returns `429 Too Many Requests`, stop retrying for a few minutes.
Quick Tunnels are rate-limited because they are account-less temporary tunnels.

## Start a tunnel from a config file

```powershell
.\tools\cloudflared\Start-CloudflaredTunnel.ps1 -ConfigPath .\backend\cloudflared.local.yml
```

## Existing config template

Use `backend/cloudflared.example.yml` as the starting point for a tunnel config file.
