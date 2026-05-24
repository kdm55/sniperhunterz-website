const fs = require("fs");
const { DATA_DIR, STATE_FILE } = require("./storage");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {object} payload Display payload from local PC app
 * @returns {{ ok: true, updated_at: string, payload: object }}
 */
function savePayload(payload) {
  ensureDataDir();
  const updated_at = new Date().toISOString();
  const state = {
    ok: true,
    updated_at,
    payload,
  };
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, STATE_FILE);
  return state;
}

module.exports = { loadState, savePayload, STATE_FILE };
