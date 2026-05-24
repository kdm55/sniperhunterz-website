# Deploy SniperHunterz website → www.sniperhunterz.com

The `website/` package is a small **Node.js + Express** app. It does **not** run the scanner. Your PC app POSTs display data to `/api/display-sync`; visitors read the public dashboard.

## Prerequisites

- Node.js **18+**
- Domain **sniperhunterz.com** (DNS access)
- Same `SNIPER_WEBSITE_API_SECRET` on the server and on your PC (never commit the real value)

## Local verify before deploy

```bash
cd website
npm install
cp .env.example .env
# Edit .env — set SNIPER_WEBSITE_API_SECRET
npm start
```

In another terminal:

```bash
cd website
npm run smoke
```

Smoke checks: `GET /health`, `GET /api/display-sync`, homepage `/`, SPA `/top-coins`.

---

## Environment variables (production)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes* | Set by host (Render/Railway inject `PORT`) |
| `SNIPER_WEBSITE_API_SECRET` | Yes | Auth for `POST /api/display-sync` |

\* If unset, defaults to `3000` (fine locally; use host `PORT` in cloud).

Optional:

| Variable | When |
|----------|------|
| `SNIPER_CORS_ORIGIN` | Only if a **different** browser origin must call the API (default: not needed) |
| `SNIPER_DISK_EPHEMERAL=1` | Force ephemeral-disk warning in logs |

**Never** log or expose `SNIPER_WEBSITE_API_SECRET` in client code, README examples, or git.

---

## Data persistence (`website/data/display-state.json`)

Sync data is stored as a single JSON file:

`website/data/display-state.json`

| Host type | Persistence |
|-----------|-------------|
| **IONOS VPS** | Persistent if `website/data/` is on the server disk (recommended) |
| **Railway** with **volume** mounted at `website/data` | Persistent |
| **Render** free / without disk | **Ephemeral** — file lost on redeploy/restart; PC must re-sync after deploy |
| **Render** with persistent disk | Persistent |

On startup the server logs a **warning** when the host looks ephemeral (Render/Railway without volume). After deploy, confirm `GET https://www.sniperhunterz.com/health` shows `has_payload: true` after your PC syncs.

---

## Render

1. Push this repo to GitHub (or connect Render to your repo).
2. **New → Web Service**
3. **Root directory:** `website` (or set **Build command** / **Start command** to run from `website/`)
4. **Runtime:** Node
5. **Build command:** `npm install`
6. **Start command:** `npm start`
7. **Environment:**
   - `NODE_ENV` = `production`
   - `SNIPER_WEBSITE_API_SECRET` = (generate a long random string)
8. **Disk (optional but recommended):** Add a persistent disk and mount at `/opt/render/project/src/website/data` (path must match where `data/` lives relative to `server.js`).
9. Deploy → note the `*.onrender.com` URL.
10. **Custom domain:** Settings → Custom Domains → `www.sniperhunterz.com` and `sniperhunterz.com` → follow DNS instructions below.

Health check URL for Render: `https://www.sniperhunterz.com/health`

---

## Railway

1. **New Project → Deploy from GitHub**
2. Set **Root directory** to `website` if the repo root is the monorepo.
3. **Variables:**
   - `NODE_ENV` = `production`
   - `SNIPER_WEBSITE_API_SECRET` = (same as PC)
4. **Volume (recommended):** Create a volume, mount at `/app/data` or `website/data` depending on root — map to the folder containing `display-state.json` (parent of `data/` is `website/`, mount `website/data`).
5. Deploy; Railway sets `PORT` automatically.
6. **Settings → Networking → Custom domain** → `www.sniperhunterz.com`

Health check: `/health`

---

## IONOS VPS (Ubuntu-style)

1. SSH to the VPS; install Node 18+ (`nodejs`, `npm`).
2. Clone the repo (or rsync `website/` only):

   ```bash
   cd /var/www
   git clone <your-repo> sniperhunterz
   cd sniperhunterz/website
   npm install --omit=dev
   ```

3. Create `.env` (not in git):

   ```bash
   cp .env.example .env
   nano .env
   ```

   Set `NODE_ENV=production`, `PORT=3000`, `SNIPER_WEBSITE_API_SECRET=...`

4. Ensure data directory persists:

   ```bash
   mkdir -p data
   chmod 700 data
   ```

5. Run with **systemd** (example `/etc/systemd/system/sniper-website.service`):

   ```ini
   [Unit]
   Description=SniperHunterz public website
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/sniperhunterz/website
   EnvironmentFile=/var/www/sniperhunterz/website/.env
   ExecStart=/usr/bin/node server.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now sniper-website
   ```

6. **Nginx** reverse proxy (example):

   ```nginx
   server {
     listen 80;
     server_name sniperhunterz.com www.sniperhunterz.com;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

7. **TLS:** `sudo certbot --nginx -d sniperhunterz.com -d www.sniperhunterz.com`

---

## DNS (sniperhunterz.com)

Point traffic to your host:

| Record | Name | Value |
|--------|------|--------|
| **CNAME** | `www` | Render/Railway hostname (e.g. `your-app.onrender.com`) |
| **A** or **ALIAS** | `@` | Provider docs for apex → same service |

For IONOS VPS, use **A** record `@` and `www` → your server **public IP**.

Wait for DNS propagation (minutes to hours). Test:

```bash
curl -s https://www.sniperhunterz.com/health | jq
```

---

## PC app `.env` after deployment

On your scanner PC (project root `.env`):

```env
SNIPER_WEBSITE_SYNC_ENABLED=1
SNIPER_WEBSITE_SYNC_URL=https://www.sniperhunterz.com/api/display-sync
SNIPER_WEBSITE_API_SECRET=<same secret as production server>
```

Restart the Python app after changing `.env`. Run a scan or wait for auto-sync; verify:

- `https://www.sniperhunterz.com/` shows fresh top coins / trades
- Server logs: `sync received` with `top_coins_count` > 0
- `GET /health` → `updated_at` recent, `has_payload: true`

**Local dev** can still use:

```env
SNIPER_WEBSITE_SYNC_URL=http://127.0.0.1:3000/api/display-sync
```

Use a **different** secret locally if you prefer; production secret must only live on the server env and PC production config.

---

## Operations

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Load balancers / uptime — `ok`, `updated_at`, `payload_version`, `top_coins_count` |
| `GET /api/display-sync` | Public read of last payload |
| `POST /api/display-sync` | PC push (Bearer or `X-Sniper-Api-Key`) |

Logs (production):

- `sync received` — successful push
- `sync rejected unauthorized` — bad/missing secret (never logs the secret)
- `last sync` — timestamp and top coin count
- Ephemeral disk warning on startup when applicable

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 503 on POST sync | `SNIPER_WEBSITE_API_SECRET` not set on server |
| 401 on POST sync | Secret mismatch between PC and server |
| Site empty after deploy | Ephemeral disk — run scan/sync from PC again; add persistent volume |
| Stale data | Check PC `SNIPER_WEBSITE_SYNC_URL` points to production, not localhost |
| Smoke fails | Server not running; wrong `SMOKE_BASE_URL` / `PORT` |

```bash
SMOKE_BASE_URL=https://www.sniperhunterz.com npm run smoke
```
