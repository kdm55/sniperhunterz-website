const fs = require("fs");
const path = require("path");

/** Load website/.env when vars are not already set (no extra dependency). */
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function loadConfig() {
  loadDotEnv();

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const port = Number(process.env.PORT) || 3000;
  const apiSecret = (process.env.SNIPER_WEBSITE_API_SECRET || "").trim();
  const corsOrigin = (process.env.SNIPER_CORS_ORIGIN || "").trim();

  return {
    nodeEnv,
    isProduction,
    port,
    apiSecret,
    corsOrigin,
    hasApiSecret: apiSecret.length > 0,
  };
}

function validateProductionConfig(cfg) {
  if (!cfg.isProduction) return;
  if (!cfg.hasApiSecret) {
    console.error(
      "[fatal] NODE_ENV=production requires SNIPER_WEBSITE_API_SECRET to be set."
    );
    process.exit(1);
  }
}

module.exports = { loadConfig, validateProductionConfig, loadDotEnv };
