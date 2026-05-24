/**
 * Production-safe server logging (never logs secrets).
 */

function ts() {
  return new Date().toISOString();
}

function log(level, msg, meta) {
  const line = meta
    ? `[${ts()}] [${level}] ${msg} ${JSON.stringify(meta)}`
    : `[${ts()}] [${level}] ${msg}`;
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function logStartup(cfg, storage) {
  log("info", "SniperHunterz website starting", {
    node_env: cfg.nodeEnv,
    port: cfg.port,
    api_secret: cfg.hasApiSecret ? "configured" : "MISSING",
    data_dir: storage.dataDir,
    persistence: storage.persistence,
  });
  if (storage.persistenceWarning) {
    log("warn", storage.persistenceWarning);
  }
}

function logSyncReceived(meta) {
  log("info", "sync received", meta);
}

function logSyncRejected(meta) {
  log("warn", "sync rejected unauthorized", meta);
}

function logLastSync(meta) {
  log("info", "last sync", meta);
}

module.exports = {
  log,
  logStartup,
  logSyncReceived,
  logSyncRejected,
  logLastSync,
};
