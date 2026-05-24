const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STATE_FILE = path.join(DATA_DIR, "display-state.json");
const PROBE_FILE = path.join(DATA_DIR, ".persistence-probe");

/**
 * Detect likely ephemeral disk (Render free, Railway without volume).
 * JSON file storage is fine on VPS or hosts with persistent disk / mounted volume.
 */
function detectPersistenceHint() {
  if (process.env.SNIPER_DISK_EPHEMERAL === "1") {
    return "ephemeral";
  }
  if (process.env.RENDER === "true" || process.env.RENDER_SERVICE_ID) {
    return "ephemeral_render";
  }
  if (process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return "ephemeral_railway";
  }
  return "persistent_assumed";
}

function getStorageInfo() {
  const persistence = detectPersistenceHint();
  let writable = true;
  let probeSurvived = null;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const marker = `${Date.now()}`;
    fs.writeFileSync(PROBE_FILE, marker, "utf8");
    const readBack = fs.readFileSync(PROBE_FILE, "utf8");
    probeSurvived = readBack === marker;
    writable = true;
  } catch (err) {
    writable = false;
    probeSurvived = false;
  }

  let persistenceWarning = null;
  if (!writable) {
    persistenceWarning =
      "Cannot write to website/data/ — display sync will not persist across requests.";
  } else if (persistence.startsWith("ephemeral")) {
    persistenceWarning =
      "Host disk may be EPHEMERAL: website/data/display-state.json can be lost on redeploy or restart. " +
      "Use a mounted volume (Railway volume, Render disk, or VPS path) for production, or accept re-sync from PC after deploy.";
  }

  return {
    dataDir: DATA_DIR,
    stateFile: STATE_FILE,
    writable,
    probeSurvived,
    persistence,
    persistenceWarning,
  };
}

module.exports = { DATA_DIR, STATE_FILE, getStorageInfo };
