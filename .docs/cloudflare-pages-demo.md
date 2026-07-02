# Cloudflare Tunnel + GitHub Pages Demo Setup

## What is already in place

- Frontend reads the backend base URL from `VITE_API_BASE_URL`.
- Backend allows CORS from local dev and the GitHub Pages origin.
- Cloudflared is available in `tools/cloudflared/cloudflared.exe`.
- The GitHub Pages workflow accepts a manual `api_base_url` input.

## Demo flow

1. Start the backend.

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

2. Start a free quick tunnel.

```powershell
.\tools\cloudflared\Invoke-Cloudflared.ps1 tunnel --url http://127.0.0.1:8000
```

3. Copy the `trycloudflare.com` URL from the output.

4. Manually run the GitHub Pages workflow.

- Open the `Deploy frontend to GitHub Pages` workflow.
- Choose `Run workflow`.
- Paste the quick tunnel URL into `api_base_url`.

5. Open the Pages site and test the backend connection card.

## Notes

- Quick tunnel URLs are temporary.
- When the tunnel URL changes, rerun the workflow with the new URL.
- For production use, switch to a named tunnel and a fixed hostname.
