/**
 * sniperhunterz.com — display sync API + public dashboard.
 * Scanner runs on PC only; this site stores and shows the latest payload.
 */

const path = require("path");
const express = require("express");
const { loadConfig, validateProductionConfig } = require("./lib/config");
const { requireApiSecret } = require("./lib/auth");
const { savePayload, loadState } = require("./lib/store");
const { getStorageInfo } = require("./lib/storage");
const {
  logStartup,
  logSyncReceived,
  logLastSync,
} = require("./lib/logger");
const { registerPublicRoutes, stripPayload } = require("./lib/publicRoutes");

const cfg = loadConfig();
validateProductionConfig(cfg);

const storage = getStorageInfo();
const app = express();
const PUBLIC_DIR = path.join(__dirname, "public");

const SPA_ROUTES = [
  "/",
  "/top-coins",
  "/ideas",
  "/progress",
  "/history",
  "/stats",
  "/debug-payload",
  "/trade/:id",
];

if (cfg.isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "2mb" }));

/** Optional CORS — only when SNIPER_CORS_ORIGIN is set (not needed for same-origin dashboard). */
if (cfg.corsOrigin) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", cfg.corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Sniper-Api-Key"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
}

function healthPayload() {
  const state = loadState();
  const payload = state?.payload || null;
  return {
    ok: true,
    service: "sniperhunterz-display-sync",
    updated_at: state?.updated_at ?? null,
    payload_version: payload?.version ?? null,
    has_payload: Boolean(payload),
    top_coins_count: (payload?.top_coins || []).length,
    storage: {
      writable: storage.writable,
      persistence: storage.persistence,
    },
  };
}

app.get("/health", (_req, res) => {
  res.json(healthPayload());
});

/** Legacy alias */
app.get("/api/health", (_req, res) => {
  res.json(healthPayload());
});

app.use(express.static(PUBLIC_DIR, { maxAge: cfg.isProduction ? "1h" : 0 }));

registerPublicRoutes(app);

/** Authenticated: receive display payload from local PC app */
app.post("/api/display-sync", requireApiSecret, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: "JSON object required" });
  }

  const safe = stripPayload(body);
  const state = savePayload(safe);
  const topCount = (safe.top_coins || []).length;

  logSyncReceived({
    updated_at: state.updated_at,
    regime: safe.regime?.regime ?? "—",
    top_coins_count: topCount,
    payload_version: safe.version ?? null,
  });
  logLastSync({
    updated_at: state.updated_at,
    top_coins_count: topCount,
  });

  res.json({ ok: true, updated_at: state.updated_at });
});

/** SPA fallback — public pages */
for (const route of SPA_ROUTES) {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(cfg.port, () => {
  logStartup(cfg, storage);
  console.log(`  Dashboard:  http://localhost:${cfg.port}/`);
  console.log(`  Health:     http://localhost:${cfg.port}/health`);
  console.log(`  Sync POST:  /api/display-sync (auth required)`);
});
