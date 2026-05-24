const { logSyncRejected } = require("./logger");

/** @param {import('express').Request} req */
function extractApiSecret(req) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const key = req.headers["x-sniper-api-key"];
  if (typeof key === "string") return key.trim();
  return "";
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireApiSecret(req, res, next) {
  const expected = process.env.SNIPER_WEBSITE_API_SECRET || "";
  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: "Server missing SNIPER_WEBSITE_API_SECRET",
    });
  }
  const provided = extractApiSecret(req);
  if (!provided || provided !== expected) {
    logSyncRejected({
      reason: provided ? "invalid_secret" : "missing_secret",
      ip: req.ip || req.socket?.remoteAddress || "unknown",
      path: req.path,
    });
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

module.exports = { extractApiSecret, requireApiSecret };
