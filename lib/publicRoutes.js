/**
 * Public read-only API — serves slices of the last display-sync payload.
 */

const { loadState } = require("./store");

const STRIP_ON_POST = new Set([
  "recent_rejections",
  "rejection_reasons",
  "rejection_log",
  "scoring_analytics",
  "diagnostics_sample",
  "filter_suggestions",
  "rejection_summary",
  "gate_trace",
  "scoring_diagnostics",
]);

function stripPayload(body) {
  const out = { ...body };
  for (const key of STRIP_ON_POST) {
    delete out[key];
  }
  return out;
}

function getPayload(res) {
  const state = loadState();
  if (!state || !state.payload) {
    res.status(200).json({
      ok: false,
      updated_at: null,
      message: "No display data synced yet",
      payload: null,
    });
    return null;
  }
  return { state, payload: state.payload };
}

function registerPublicRoutes(app) {
  app.get("/api/display-sync", (req, res) => {
    const data = getPayload(res);
    if (!data) return;
    res.json({
      ok: true,
      updated_at: data.state.updated_at,
      payload: data.payload,
    });
  });

  app.get("/api/top-coins", (req, res) => {
    const data = getPayload(res);
    if (!data) return;
    res.json({
      ok: true,
      updated_at: data.state.updated_at,
      top_coins: data.payload.top_coins || [],
      top_signal: data.payload.top_signal || null,
      regime: data.payload.regime || {},
    });
  });

  app.get("/api/performance", (req, res) => {
    const data = getPayload(res);
    if (!data) return;
    res.json({
      ok: true,
      updated_at: data.state.updated_at,
      stats: data.payload.stats || {},
      performance: data.payload.performance || {},
    });
  });

  app.get("/api/trades", (req, res) => {
    const data = getPayload(res);
    if (!data) return;
    const p = data.payload;
    res.json({
      ok: true,
      updated_at: data.state.updated_at,
      open_trade_ideas: p.open_trade_ideas || [],
      approved_signals: p.approved_signals || [],
      recent_closed_trades: p.recent_closed_trades || [],
      recent_trade_events: p.recent_trade_events || [],
    });
  });

  app.get("/api/trades/:id", (req, res) => {
    const data = getPayload(res);
    if (!data) return;
    const key = String(req.params.id || "").trim();
    const p = data.payload;
    const allOpen = p.open_trade_ideas || [];
    const allClosed = p.recent_closed_trades || [];
    const approved = p.approved_signals || [];

    let trade = null;
    if (/^\d+$/.test(key)) {
      const id = Number(key);
      trade =
        allOpen.find((t) => t.id === id) ||
        allClosed.find((t) => t.id === id) ||
        null;
    }
    if (!trade) {
      const upper = key.toUpperCase();
      trade =
        allOpen.find(
          (t) =>
            (t.symbol_display || "").toUpperCase() === upper ||
            (t.symbol || "").includes(upper)
        ) ||
        allClosed.find(
          (t) =>
            (t.symbol_display || "").toUpperCase() === upper ||
            (t.symbol || "").includes(upper)
        ) ||
        null;
    }

    const signal =
      approved.find(
        (s) =>
          (s.symbol_display || "").toUpperCase() === key.toUpperCase() ||
          String(s.id) === key
      ) || null;

    if (!trade && !signal) {
      return res.status(404).json({
        ok: false,
        error: "Trade or signal not found in latest sync",
      });
    }

    res.json({
      ok: true,
      updated_at: data.state.updated_at,
      trade,
      signal,
      regime: p.regime || {},
    });
  });
}

module.exports = { registerPublicRoutes, stripPayload, STRIP_ON_POST };
