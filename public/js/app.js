/** Public dashboard — terminal UI matching local app */

const EMPTY_AFTER_MS = 3000;
let _emptyTimer = null;

function isDebug() {
  const q = new URLSearchParams(window.location.search);
  return q.get("debug") === "1" || window.location.pathname.replace(/\/+$/, "") === "/debug-payload";
}

function U() {
  return window.UI;
}

function esc(s) {
  return U() ? U().esc(s) : String(s ?? "");
}
function fmtTime(iso) {
  return U() ? U().fmtTime(iso) : iso || "—";
}

function topCoins(p) {
  const payload = p || {};
  return payload.top_coins || payload.top_10_coins || payload.ranked_candidates || [];
}

function enrichCoins(coins, p) {
  const bySym = {};
  (p.approved_signals || []).forEach((a) => {
    bySym[a.symbol] = a;
  });
  const topSig = p.top_signal;
  if (topSig?.symbol) bySym[topSig.symbol] = { ...bySym[topSig.symbol], ...topSig };

  return coins.map((c, i) => {
    const a = bySym[c.symbol];
    const merged = a
      ? {
          ...c,
          entry: c.entry ?? a.entry,
          stop_loss: c.stop_loss ?? a.stop_loss,
          tp1: c.tp1 ?? a.tp1,
          tp2: c.tp2 ?? a.tp2,
          price: c.price ?? a.price ?? a.entry,
          current_price: c.current_price ?? c.price ?? a.entry,
          funding_rate:
            c.funding_rate != null && c.funding_rate !== ""
              ? c.funding_rate
              : a.funding_rate,
          sparkline: c.sparkline?.length > 1 ? c.sparkline : a.sparkline,
          approved_score: c.approved_score ?? a.approved_score,
        }
      : { ...c };
    merged.rank = merged.rank ?? i + 1;
    return merged;
  });
}

const CLOSED_OUTCOMES = new Set(["sl_hit", "tp2_hit", "tp1_then_sl", "expired"]);

function tradeSymbolKey(t) {
  const sym = (t.symbol || "").trim();
  if (sym) return sym.toUpperCase();
  return (t.symbol_display || "").trim().toUpperCase();
}

function tradeIdNum(t) {
  const id = t.id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}

/** Real open trades only — one per symbol; matches app Active Trades. */
function openTrades(p) {
  if (!p) return [];
  const list =
    (p.open_trade_ideas && p.open_trade_ideas.length && p.open_trade_ideas) ||
    (p.active_trades && p.active_trades.length && p.active_trades) ||
    p.trades ||
    [];
  const bySym = new Map();
  for (const t of list) {
    if (t.source === "watchlist_shadow") continue;
    const outcome = (t.status || t.outcome || "").toLowerCase();
    if (outcome && CLOSED_OUTCOMES.has(outcome)) continue;
    if (t.outcome_recorded_at) continue;
    const key = tradeSymbolKey(t);
    if (!key) continue;
    const prev = bySym.get(key);
    if (!prev || tradeIdNum(t) >= tradeIdNum(prev)) bySym.set(key, t);
  }
  return [...bySym.values()].sort((a, b) => tradeIdNum(b) - tradeIdNum(a));
}

function buildSparkMap(coins, topSignal) {
  const map = { top: topSignal };
  coins.forEach((c, i) => {
    map[String(i)] = c;
  });
  return map;
}

function postRender(root, sparkMap) {
  window.__sparkCoinMap = sparkMap;
  if (window.Terminal) Terminal.initSparklines(root, sparkMap);
}

function routePath() {
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/trade/")) return { name: "trade", id: decodeURIComponent(p.slice(7)) };
  if (p === "/debug-payload") return { name: "debug-payload", id: null };
  return { name: p === "/" ? "home" : p.slice(1), id: null };
}

function setNavActive() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll("#mainNav a").forEach((a) => {
    const r = a.getAttribute("data-route");
    a.classList.toggle("active", r === path || (path.startsWith("/trade") && r === "/"));
  });
}

function applyDebugVisibility() {
  const debug = isDebug();
  document.body.classList.toggle("debug-mode", debug);
  const apiBox = document.getElementById("apiStatusBox");
  const debugPanel = document.getElementById("debugPanel");
  if (apiBox) apiBox.classList.toggle("hidden", !debug);
  if (debugPanel) debugPanel.classList.toggle("hidden", !debug);
}

function syncSecondsAgo(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function formatSyncAge(iso) {
  const sec = syncSecondsAgo(iso);
  if (sec == null) return "—";
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 120) return `Updated ${min}m ago`;
  return `Updated ${fmtTime(iso)}`;
}

function updateHeader(p, updatedAt) {
  const reg = (p && p.regime) || {};
  const scan = (p && p.latest_scan) || {};
  const ss = (p && p.scanner_status) || {};
  const chip = document.getElementById("regimeChip");
  const scannerChip = document.getElementById("scannerChip");
  const approvedChip = document.getElementById("approvedChip");
  const sync = document.getElementById("syncChip");
  if (chip) {
    chip.textContent = "Regime: " + (reg.regime || "—");
    chip.className = "chip " + (reg.no_trade ? "warn" : "ok");
  }
  if (scannerChip) {
    const state = ss.scheduler_state || "idle";
    scannerChip.textContent = "Scanner: " + state;
    scannerChip.className =
      "chip " + (state === "running" ? "warn" : state === "error" ? "bad" : "ok");
  }
  if (approvedChip) {
    const n = scan.approved_count ?? (p?.approved_signals || []).length ?? 0;
    approvedChip.textContent = `${n} approved`;
    approvedChip.className = "chip " + (n > 0 ? "ok" : "muted");
  }
  if (sync) {
    const at = updatedAt || p?.synced_at;
    sync.textContent = formatSyncAge(at);
    sync.dataset.syncAt = at || "";
    sync.className = Api.isStale() ? "chip warn" : "chip ok";
  }
  const banner = document.getElementById("staleBanner");
  if (!banner) return;
  if (Api.isStale()) {
    const mins = Api.staleMinutes();
    banner.textContent = `Delayed · ${mins != null ? mins + " min" : "?"} ago`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function updateApiStatusBox(phase, extra) {
  if (!isDebug()) return;
  const box = document.getElementById("apiStatusBox");
  if (!box) return;
  box.textContent = `${phase}${extra ? " · " + extra : ""}`;
}

function updateDebugPanel(p, data) {
  if (!isDebug()) return;
  const el = document.getElementById("debugPanel");
  if (!el) return;
  const coins = topCoins(p || {});
  el.textContent = `coins=${coins.length} approved=${(p?.approved_signals || []).length} sync=${fmtTime(p?.synced_at || data?.updated_at)}`;
}

function scheduleEmptyFallback(root) {
  if (_emptyTimer) clearTimeout(_emptyTimer);
  _emptyTimer = setTimeout(() => {
    if (root && /loading/i.test(root.textContent || "")) {
      root.innerHTML = '<p class="empty-state">No data available yet.</p>';
    }
  }, EMPTY_AFTER_MS);
}
function clearEmptyFallback() {
  if (_emptyTimer) {
    clearTimeout(_emptyTimer);
    _emptyTimer = null;
  }
}

function statusStripHtml(p, reg, scan) {
  const ss = p.scanner_status || {};
  const state = ss.scheduler_state || "idle";
  const scanCls = state === "running" ? "warn" : state === "error" ? "bad" : "ok";
  const approved = scan.approved_count ?? (p.approved_signals || []).length ?? 0;
  const btc = reg.btc_change_24h;
  const btcTxt = Number.isFinite(Number(btc)) ? `${Number(btc).toFixed(2)}%` : "—";
  return `<div class="status-chips-row glass" role="status">
    <span class="chip ${reg.no_trade ? "warn" : "ok"}">Regime: ${esc(reg.regime || "—")}</span>
    <span class="chip ${scanCls}">Scanner: ${esc(state)}</span>
    <span class="chip ${approved > 0 ? "ok" : "muted"}">${approved} approved</span>
    <span class="chip muted">BTC 24h ${btcTxt}</span>
    <span class="chip muted">Scan ${fmtTime(scan.finished_at)}</span>
  </div>`;
}

function pageHome(p) {
  const ui = U();
  const reg = p.regime || {};
  const scan = p.latest_scan || {};
  const perf = p.performance || {};
  const stats = p.stats || {};
  const coins = enrichCoins(topCoins(p), p);
  const open = openTrades(p);
  const closed = p.recent_closed_trades || [];
  const hasApproved = (p.approved_signals || []).length > 0;
  const topSig = p.top_signal ? enrichCoins([p.top_signal], p)[0] : coins[0];

  const viz = window.Premium ? Premium.vizDashboard(p) : "";
  const prefs = window.Premium ? Premium.prefsBarHtml() : "";
  const statusRow = statusStripHtml(p, reg, scan);
  return `
    ${prefs}
    ${statusRow}
    <div id="dashViz" class="dash-viz-block">${viz}</div>
    ${ui.infoEducationPanel(p.education)}
    <section class="block block-priority">
      <div class="block-head">
        <h2><span class="live-pulse-dot" aria-hidden="true"></span> Live trades</h2>
        <p class="block-sub muted">Active Cornix signals · entry, SL, and TP tracking</p>
      </div>
      ${open.length ? open.map((t) => ui.tradeCard(t)).join("") : '<p class="empty-state">No open trades.</p>'}
    </section>
    <section class="block">
      <div class="block-head">
        <h2>Top scanner candidates</h2>
        <p class="block-sub muted">Ranked by score · eligibility shown per row</p>
        <a href="/top-coins" class="link-more">View all</a>
      </div>
      ${ui.signalRowList(coins.slice(0, 10))}
    </section>
    ${hasApproved ? "" : ui.noTradePanel()}
    ${ui.perfStrip(perf, stats)}
    <section class="block">
      <div class="block-head"><h2>Recent closed</h2><a href="/history" class="link-more">History</a></div>
      ${closed.length ? closed.slice(0, 8).map((c) => ui.historyRow(c)).join("") : '<p class="empty-state">No closed trades yet.</p>'}
    </section>`;
}

function pageTopCoins(p) {
  const ui = U();
  const coins = enrichCoins(topCoins(p), p);
  return `
    <header class="page-head"><h1>Top 10 scanner candidates</h1>
    <p class="lead">Ranked by score · Trade signal only at 9.5+</p></header>
    ${ui.signalRowList(coins)}`;
}

function pageIdeas(p) {
  const ui = U();
  const rows = p.approved_signals || [];
  return `
    <header class="page-head"><h1>Trade ideas</h1><p class="lead">Approved 9.5+ signals only</p></header>
    ${rows.length ? rows.map((t) => ui.tradeCard(t)).join("") : '<p class="empty-state">No approved ideas this scan.</p>'}`;
}

function pageProgress(p) {
  const ui = U();
  const open = openTrades(p);
  const coins = enrichCoins(topCoins(p), p);
  if (open.length) {
    return `<header class="page-head"><h1>Trade progress</h1></header>${open.map((t) => ui.tradeCard(t)).join("")}`;
  }
  return `
    <header class="page-head"><h1>Watchlist</h1><p class="lead">No active trades</p></header>
    ${ui.noTradePanel()}
    ${ui.signalRowList(coins)}`;
}

function pageHistory(p) {
  const ui = U();
  const closed = p.recent_closed_trades || [];
  return `
    <header class="page-head"><h1>Trade history</h1></header>
    ${closed.length ? closed.map((c) => ui.historyRow(c)).join("") : '<p class="empty-state">No closed trades.</p>'}`;
}

function pageStats(p) {
  const ui = U();
  const stats = p.stats || {};
  const perf = p.performance || {};
  const r7 = perf.rolling_7d || {};
  return `
    <header class="page-head"><h1>Performance</h1></header>
    ${ui.perfStrip(perf, stats)}
    ${ui.statGrid([
      { label: "Total", val: String(stats.total_trades ?? 0) },
      { label: "Wins", val: String(stats.wins ?? 0), cls: "ok" },
      { label: "Losses", val: String(stats.losses ?? 0), cls: "bad" },
      { label: "Protected", val: String(stats.protected ?? 0), cls: "warn" },
      { label: "7d decided", val: String(r7.decided ?? 0), sub: r7.winrate_pct != null ? r7.winrate_pct + "% WR" : "" },
    ])}`;
}

function pageTrade(p, id) {
  const ui = U();
  const open = openTrades(p);
  const closed = p.recent_closed_trades || [];
  const approved = p.approved_signals || [];
  let trade =
    open.find((t) => String(t.id) === String(id)) ||
    closed.find((t) => String(t.id) === String(id)) ||
    null;
  if (!trade) {
    const u = id.toUpperCase();
    trade =
      open.find((t) => (t.symbol_display || "").toUpperCase() === u) ||
      closed.find((t) => (t.symbol_display || "").toUpperCase() === u) ||
      null;
  }
  const signal = approved.find((s) => String(s.id) === String(id) || (s.symbol_display || "").toUpperCase() === id.toUpperCase());
  if (!trade && !signal) return '<p class="empty-state">Not found in latest sync.</p>';
  const live = trade.status || trade.outcome;
  if (trade && ["pending", "active", "tp1_hit"].includes(live)) return ui.tradeCard(trade);
  if (trade) return ui.historyRow(trade);
  return ui.signalRowList(enrichCoins([signal], p));
}

function pageDebugPayload(p, data) {
  const coins = topCoins(p || {});
  const withFunding = coins.filter(
    (c) => c.funding_rate != null && c.funding_rate !== "" && !Number.isNaN(Number(c.funding_rate))
  ).length;
  const withSpark = coins.filter((c) => Array.isArray(c.sparkline) && c.sparkline.length > 1).length;
  const open = openTrades(p || {});
  return `<header class="page-head"><h1>Debug payload</h1></header>
    <div class="debug-counts glass">
      <p><strong>open_trade_ideas:</strong> ${(p?.open_trade_ideas || []).length}</p>
      <p><strong>active_trades:</strong> ${(p?.active_trades || []).length}</p>
      <p><strong>merged open (UI):</strong> ${open.length}</p>
      <p><strong>top_coins with funding:</strong> ${withFunding} / ${coins.length}</p>
      <p><strong>top_coins with sparkline:</strong> ${withSpark} / ${coins.length}</p>
      <p><strong>synced_at:</strong> ${esc(fmtTime(p?.synced_at || data?.updated_at))}</p>
    </div>
    <pre class="debug-json">${esc(JSON.stringify(p, null, 2))}</pre>`;
}

async function render() {
  const root = document.getElementById("app");
  if (!root) return;
  applyDebugVisibility();

  if (!window.Api || !window.UI || !window.Coins || !window.Terminal) {
    root.innerHTML = '<p class="bad">Scripts failed to load — hard refresh (Ctrl+Shift+R).</p>';
    return;
  }

  setNavActive();
  if (isDebug()) updateApiStatusBox("fetching…");
  if (window.Premium && /loading/i.test(root.textContent || "")) {
    root.innerHTML = Premium.skeletonDashboard();
  } else {
    scheduleEmptyFallback(root);
  }

  try {
    const data = await Api.load();
    clearEmptyFallback();
    const p = data.payload || (data.ok ? Api.normalizePayload(data.raw || data) : null);

    const syncAt = data.updated_at || p?.synced_at;
    if (syncAt) _lastRenderedSyncAt = syncAt;
    if (data.updated_at) updateHeader(p, data.updated_at);
    else if (p) updateHeader(p, p.synced_at);
    if (isDebug()) {
      updateApiStatusBox("ok", p ? `coins ${topCoins(p).length}` : "empty");
      updateDebugPanel(p, data);
    }

    if (!p && routePath().name !== "debug-payload") {
      root.innerHTML = '<p class="empty-state">No display data synced yet.</p>';
      return;
    }

    const route = routePath();
    const coins = enrichCoins(topCoins(p || {}), p || {});
    const openList = openTrades(p || {});
    const topSig = p?.top_signal ? enrichCoins([p.top_signal], p)[0] : coins[0];
    let html;

    switch (route.name) {
      case "home":
        html = pageHome(p);
        break;
      case "top-coins":
        html = pageTopCoins(p);
        break;
      case "ideas":
        html = pageIdeas(p);
        break;
      case "progress":
        html = pageProgress(p);
        break;
      case "history":
        html = pageHistory(p);
        break;
      case "stats":
        html = pageStats(p);
        break;
      case "trade":
        html = `<header class="page-head"><h1>Trade</h1></header>${pageTrade(p, route.id)}`;
        break;
      case "debug-payload":
        html = pageDebugPayload(p, data);
        break;
      default:
        html = pageHome(p);
    }

    const prevPayload = window.Premium ? Premium.cacheLoad()?.p : null;
    root.innerHTML = html;
    const sparkMap = buildSparkMap(coins, topSig);
    openList.forEach((t, i) => {
      sparkMap[`trade-${i}`] = t;
    });
    postRender(root, sparkMap);
    if (window.Premium && p) {
      Premium.detectEvents(prevPayload, p);
      Premium.cacheSave(p);
      Premium.bindPrefs(root);
      Premium.bindTvButtons(root);
      Premium.animateProgressBars(root);
    }
  } catch (e) {
    clearEmptyFallback();
    const msg = e?.message || String(e);
    if (isDebug()) updateApiStatusBox("failed", msg);
    root.innerHTML = `<div class="panel-warn bad"><strong>Load failed</strong><p>${esc(msg)}</p></div>`;
  }
}

window.addEventListener("popstate", render);
document.querySelectorAll("#mainNav a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState({}, "", a.getAttribute("href"));
    render();
  });
});

function boot() {
  render().catch((e) => {
    const root = document.getElementById("app");
    if (root) root.innerHTML = `<p class="bad">${esc(e.message || e)}</p>`;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.Premium) Premium.setupLogo();
    boot();
  });
} else {
  if (window.Premium) Premium.setupLogo();
  boot();
}

let _lastRenderedSyncAt = null;

function tickSyncAge() {
  const sync = document.getElementById("syncChip");
  if (!sync?.dataset.syncAt) return;
  sync.textContent = formatSyncAge(sync.dataset.syncAt);
}

setInterval(tickSyncAge, 1000);

setInterval(async () => {
  try {
    const data = await Api.load(true);
    const at = data.updated_at || data.payload?.synced_at;
    if (!at) return;
    if (at !== _lastRenderedSyncAt) {
      _lastRenderedSyncAt = at;
      await render();
      return;
    }
    const p = data.payload || Api.payload();
    if (p) updateHeader(p, at);
  } catch {
    /* retry next interval */
  }
}, 30000);
