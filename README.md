# sniperhunterz.com — display sync website

Receives display data from your local SniperHunterz PC app. **Does not run the scanner.**

## Setup

```bash
cd website
npm install
cp .env.example .env
# Edit .env — set SNIPER_WEBSITE_API_SECRET (same value as PC app)
npm start
```

Open http://localhost:3000/

## API

### `POST /api/display-sync` (authenticated)

Headers (either):

- `Authorization: Bearer <SNIPER_WEBSITE_API_SECRET>`
- `X-Sniper-Api-Key: <SNIPER_WEBSITE_API_SECRET>`

Body: JSON display payload from PC app.

Response:

```json
{ "ok": true, "updated_at": "2026-05-23T12:00:00.000Z" }
```

### Public pages

| Path | Content |
|------|---------|
| `/` | Dashboard — regime, top coins, active trades, TP2 hits |
| `/top-coins` | Top 10 ranked symbols |
| `/ideas` | Approved trade ideas + Cornix status |
| `/progress` | Active trades + TP progress |
| `/history` | Closed trades |
| `/stats` | Win rates, 7d/30d, best setups/symbols |
| `/trade/:id` | Alert landing (trade id or symbol, e.g. `/trade/SOL`) |

Stale sync warning appears if data is older than **10 minutes**.

### `GET /api/display-sync` (public)

Returns latest stored payload:

```json
{
  "ok": true,
  "updated_at": "...",
  "payload": { ... }
}
```

Optional read-only slices (same stored payload):

- `GET /api/top-coins`
- `GET /api/trades`
- `GET /api/trades/:id`
- `GET /api/performance`

## PC app configuration

```powershell
$env:SNIPER_WEBSITE_SYNC_ENABLED = "1"
$env:SNIPER_WEBSITE_SYNC_URL = "http://localhost:3000/api/display-sync"
$env:SNIPER_WEBSITE_API_SECRET = "same-secret-as-website-.env"
```

Production: `https://www.sniperhunterz.com/` · sync API: `https://www.sniperhunterz.com/api/display-sync`

### Refresh local website data without HTTP

If the site shows stale trades (e.g. SPACE in the app but not on the site), the PC may be syncing to production while you view `localhost`:

```powershell
python scripts/run_website_sync_once.py --local
```

Or set sync URL to localhost (mirror runs automatically on each successful push):

```powershell
$env:SNIPER_WEBSITE_SYNC_URL = "http://localhost:3000/api/display-sync"
```

Optional: always mirror to disk even when pushing to production:

```powershell
$env:SNIPER_WEBSITE_LOCAL_MIRROR_PATH = "website/data/display-state.json"
```

## Production deploy

See **[README_DEPLOY.md](./README_DEPLOY.md)** for Render, Railway, IONOS VPS, DNS, and PC `.env` after go-live.

Quick checks:

```bash
npm start          # terminal 1
npm run smoke      # terminal 2
curl http://localhost:3000/health
```
