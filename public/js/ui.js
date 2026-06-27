/** Terminal UI — aligned with local SniperHunterz app */

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function fmtPct(n, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function fmtMoney(n) {
  return fmtPrice(n);
}

function fmtOi(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
}

function fmtFunding(rate) {
  if (rate == null || rate === "" || Number.isNaN(Number(rate))) {
    return '<span class="na">Funding unavailable</span>';
  }
  let v = Number(rate);
  if (Math.abs(v) < 0.05) {
    v = v * 100;
  }
  return `${v.toFixed(4)}%`;
}

function tierLabel(c) {
  if (c.display_label) return c.display_label;
  if (c.eligible_for_trade === true || c.final_decision === "TRADE_CREATED" || c.final_decision === "WOULD_TRADE") {
    return "TRADE READY";
  }
  if (c.final_decision === "BLOCKED" || c.status === "blocked" || c.approved === false) {
    const score = Number(c.approved_score ?? c.score ?? 0);
    if (score >= 9.5) return "HIGH WATCHLIST";
  }
  const score = Number(c.approved_score ?? c.score ?? 0);
  if (score >= 9.5) return "TRADE READY";
  if (score >= 9.0) return "HIGH WATCHLIST";
  if (score >= 8.0) return "WATCHLIST";
  return "MONITOR ONLY";
}

function displayPill(label) {
  const s = (label || "").toLowerCase();
  let cls = "pill";
  if (s.includes("live trade")) cls += " pill-live";
  else if (s.includes("trade ready")) cls += " pill-trade-ready";
  else if (s.includes("trade")) cls += " pill-trade";
  else if (s.includes("high")) cls += " pill-watch-high";
  else if (s.includes("watchlist")) cls += " pill-watch";
  else if (s.includes("monitor")) cls += " pill-monitor";
  return `<span class="${cls}">${esc(label || "—")}</span>`;
}

function coinReasonLine(c) {
  return c.reason_line || c.note || c.rejection_reason || c.rejection_message || c.status || "—";
}

function cornixDeliveryUi(t) {
  const status = String(t?.cornix_delivery_status || "").toLowerCase();
  const label = t?.cornix_delivery_label || null;
  const open = ["active", "pending", "tp1_hit"].includes(
    String(t?.outcome || t?.status || "").toLowerCase()
  );
  const sent = t?.cornix_sent === true || status === "sent";
  const blocked = [
    "waiting_for_entry",
    "entry_missed",
    "entry_expired",
    "cornix_pending",
    "cornix_failed",
  ].includes(status);
  return {
    status,
    label,
    reason: t?.cornix_delivery_reason || "",
    sent,
    blocked: blocked && open && !sent,
    showLive: open && sent && !blocked,
  };
}

function tradeLifecycleStatus(t) {
  const delivery = cornixDeliveryUi(t);
  if (delivery.blocked && delivery.label) return delivery.label;
  const o = (t.outcome || t.status || "").toLowerCase();
  if (o === "tp2_hit") return "TP2 HIT";
  if (o === "tp1_hit") return "TP1 HIT";
  if (t.breakeven || t.protected || o === "tp1_then_sl") return "PROTECTED";
  if (o === "sl_hit") return "SL HIT";
  if (o === "active" || o === "pending") {
    return delivery.sent ? "ENTERED" : "Cornix Pending";
  }
  return (o || "MONITOR").toUpperCase();
}

function infoEducationPanel(edu) {
  const e = edu || {};
  return `<section class="info-edu glass">
    <p class="info-edu-lead"><strong>Score</strong> = setup quality. <strong>Trade Signal</strong> = score + execution gates passed. <strong>Watchlist</strong> = strong setup, waiting for confirmation.</p>
    <p class="info-edu-detail muted">${esc(e.long || "")}</p>
  </section>`;
}

function setupBadge(tag) {
  return `<span class="badge badge-setup">${esc(tag || "—")}</span>`;
}

function tradeStatusPill(t) {
  const row = typeof t === "object" && t !== null ? t : { outcome: t };
  const delivery = cornixDeliveryUi(row);
  if (delivery.blocked && delivery.label) {
    const cls =
      delivery.status === "entry_missed" || delivery.status === "entry_expired"
        ? "pill-bad"
        : "pill-wait";
    return `<span class="pill ${cls}">${esc(delivery.label)}</span>`;
  }
  const o = (row.outcome || row.status || "").toLowerCase();
  if (o === "tp1_hit") return '<span class="pill pill-tp1">TP1 HIT</span>';
  if (o === "active" || o === "pending") {
    if (delivery.sent) return '<span class="pill pill-entered">ENTERED</span>';
    return '<span class="pill pill-wait">Cornix Pending</span>';
  }
  return '<span class="pill pill-wait">MONITOR</span>';
}

function outcomePill(outcome, t) {
  const delivery = t ? cornixDeliveryUi(t) : null;
  if (delivery?.blocked && delivery.label) {
    const cls =
      delivery.status === "entry_missed" || delivery.status === "entry_expired"
        ? "pill-sl"
        : "pill-wait";
    return `<span class="pill ${cls}">${esc(delivery.label)}</span>`;
  }
  const o = outcome || "";
  if (o === "tp2_hit") return '<span class="pill pill-tp2">TP2</span>';
  if (o === "sl_hit") return '<span class="pill pill-sl">SL</span>';
  if (o === "tp1_then_sl") return '<span class="pill pill-prot">Protected</span>';
  if (o === "tp1_hit") return '<span class="pill pill-tp1">TP1</span>';
  return `<span class="pill">${esc(o || "—")}</span>`;
}

function coinAvatar(coin) {
  const key = Coins.symbolKey(coin);
  const initials = Coins.coinInitials(coin);
  const img = Coins.coinLogoImgTag(coin);
  return `<div class="coin-avatar" title="${esc(key)}">
    <span class="coin-initials">${esc(initials)}</span>
    ${img}
  </div>`;
}

function tradeLink(t) {
  const id = t.id || t.symbol;
  const label = t.symbol_display || t.symbol || id;
  return `<a class="sym-link" href="/trade/${encodeURIComponent(id)}">${esc(label)}</a>`;
}

function chartUrl(coin) {
  const key = Coins.symbolKey(coin);
  return `https://www.tradingview.com/chart/?symbol=OKX%3A${encodeURIComponent(key)}USDT.P`;
}

function coinReason(c) {
  return coinReasonLine(c);
}

function hasLevels(c) {
  return [c.entry, c.stop_loss, c.tp1, c.tp2].some((x) => x != null && x !== "");
}

function targetGrid(c) {
  const entry = Number(c.entry);
  const slPct =
    entry && c.stop_loss ? fmtPct(((Number(c.stop_loss) - entry) / entry) * 100) : "—";
  const tp1Pct = entry && c.tp1 ? fmtPct(((Number(c.tp1) - entry) / entry) * 100) : "—";
  const tp2Pct = entry && c.tp2 ? fmtPct(((Number(c.tp2) - entry) / entry) * 100) : "—";
  return `<div class="target-grid">
    <div class="target-cell entry"><label>ENTRY</label><div class="price">${fmtPrice(c.entry)}</div></div>
    <div class="target-cell sl"><label>SL</label><div class="price">${fmtPrice(c.stop_loss)}</div><div class="sub">${slPct}</div></div>
    <div class="target-cell tp1"><label>TP1</label><div class="price">${fmtPrice(c.tp1)}</div><div class="sub">${tp1Pct}</div></div>
    <div class="target-cell tp2"><label>TP2</label><div class="price">${fmtPrice(c.tp2)}</div><div class="sub">${tp2Pct}</div></div>
  </div>`;
}

function signalRow(c, idx) {
  const label = tierLabel(c);
  const blockHuman = c.trade_block_reason_human ? `<span class="block-hint">${esc(c.trade_block_reason_human)}</span>` : "";
  const chg = c.price_change_24h;
  const chgCls = chg != null && Number(chg) >= 0 ? "up" : "down";
  const spark = Terminal.sparkPointsFromCoin(c);
  const showSpark = spark && spark.length > 1;
  const improve = c.what_would_improve || "";
  const reason = coinReason(c);
  const expand = `<details class="signal-expand">
    <summary class="btn-details">Details</summary>
    <div class="signal-expand-body">
      ${spark ? `<canvas class="sparkline" data-idx="${idx}" width="320" height="40"></canvas>` : ""}
      ${hasLevels(c) ? targetGrid(c) : `<p class="muted">Trade levels not in sync for this candidate.</p>`}
      ${improve ? `<p class="improve-line"><label>Improve</label> ${esc(improve)}</p>` : ""}
      <a class="link-chart" href="${esc(chartUrl(c))}" target="_blank" rel="noopener">TradingView ↗</a>
    </div>
  </details>`;

  return `<article class="signal-row">
    <div class="signal-row-core">
      ${coinAvatar(c)}
      <span class="sig-rank">#${esc(c.rank ?? idx + 1)}</span>
      <div class="sig-symbol">${tradeLink(c)}${window.Premium ? Premium.tvButton(c) : ""}</div>
      <div class="sig-pills">${setupBadge(c.setup_tag)} ${displayPill(label)}</div>
      <div class="sig-metrics">
        <span class="${chgCls}">24h ${fmtPct(chg)}</span>
        <span title="${esc(c.oi_display_label || c.oi_scoring_source || "")}">OI ${fmtOi(c.aggregate_oi ?? c.open_interest)}</span>
        ${c.oi_display_label ? `<span class="oi-src muted">${esc(c.oi_display_label)}</span>` : ""}
        ${c.oi_confidence ? `<span class="oi-conf muted">${esc(c.oi_confidence)}</span>` : ""}
        ${c.oi_change_4h != null ? `<span>OI 4h ${fmtPct(c.oi_change_4h)}${c.oi_change_source === "aggregate" ? " agg" : ""}</span>` : ""}
        <span>FR ${fmtFunding(c.funding_rate)}</span>
      </div>
      <div class="sig-score"><span class="num">${esc(Number(c.score ?? 0).toFixed(1))}</span><span class="of">/10</span></div>
      ${showSpark ? `<canvas class="sparkline sparkline-mini" data-idx="${idx}" width="100" height="26"></canvas>` : ""}
      ${expand}
    </div>
    <div class="sig-reason" title="${esc(coinReasonLine(c))}">${esc(coinReasonLine(c))}${blockHuman}</div>
  </article>`;
}

function signalRowList(rows) {
  if (!rows.length) return '<p class="empty-state">No scanner candidates in latest sync.</p>';
  return `<div class="signal-list">${rows.map((c, i) => signalRow(c, i)).join("")}</div>`;
}

function topSignalCard(c, reg) {
  if (!c) return "";
  const label = tierLabel(c);
  const spark = Terminal.sparkPointsFromCoin(c);
  return `<section class="top-signal-card glass">
    <p class="eyebrow">Top scanner candidate</p>
    <div class="top-signal-head">
      ${coinAvatar(c)}
      <div>
        <h2>${tradeLink(c)}</h2>
        <div class="sig-pills">${displayPill(label)} ${setupBadge(c.setup_tag)} <span class="pill">${esc(c.regime || reg.regime || "—")}</span></div>
      </div>
      <div class="sig-score large"><span class="num">${esc(Number(c.approved_score ?? c.score ?? 0).toFixed(1))}</span><span class="of">/10</span></div>
    </div>
    ${spark ? `<canvas class="sparkline" data-idx="top" width="400" height="44"></canvas>` : ""}
    ${hasLevels(c) ? targetGrid(c) : ""}
    <p class="sig-reason-block">${esc(coinReason(c))}</p>
    ${c.what_would_improve ? `<p class="improve-line">${esc(c.what_would_improve)}</p>` : ""}
  </section>`;
}

function tradeCard(t) {
  const sym = (t.symbol_display || t.symbol || "").replace("-USDT-SWAP", "");
  const pct = Math.min(
    100,
    Math.max(0, Number(t.tp_progress_pct ?? t.progress_pct) || 0)
  );
  const entry = Number(t.entry);
  const price = Number(t.current_price);
  const pnlRaw = t.pnl_pct ?? t.raw_pnl_pct;
  const pnl =
    pnlRaw != null && Number.isFinite(Number(pnlRaw))
      ? Number(pnlRaw)
      : Number.isFinite(entry) && entry && Number.isFinite(price)
        ? ((price - entry) / entry) * 100
        : null;
  const lev = t.lev_pnl_pct ?? (pnl != null ? pnl * 20 : null);
  const pnlCls = pnl != null && pnl >= 0 ? "up" : "down";
  const progLabel = t.progress_label || (t.tp1_hit ? "TP1 → TP2" : "Entry → TP1");
  const o = (t.outcome || t.status || "").toLowerCase();
  const delivery = cornixDeliveryUi(t);
  const isLive = delivery.showLive;
  const isProt = t.breakeven || t.protected || o === "tp1_then_sl";
  const protectedTxt = isProt
    ? '<span class="pill pill-prot shield-badge">Protected / BE</span>'
    : "";
  const life = tradeLifecycleStatus(t);
  const cardCls = [
    "trade-card",
    "glass",
    "trade-card-premium",
    o === "tp1_hit" ? "tp1-hit" : "",
    isProt ? "protected-state" : "",
    o === "sl_hit" ? "sl-hit" : "",
    delivery.status === "waiting_for_entry" ? "entry-wait" : "",
    delivery.status === "entry_missed" ? "entry-missed" : "",
    delivery.status === "entry_expired" ? "entry-expired" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const tvBtn = window.Premium ? Premium.tvButton(t) : "";
  const liveDot = isLive ? '<span class="live-pulse-dot" aria-hidden="true"></span>' : "";

  return `<article class="${cardCls}">
    <div class="trade-head">
      ${coinAvatar(t)}
      <div>
        <strong>${liveDot}${tradeLink(t)}${tvBtn}</strong>
        <div class="trade-pills"><span class="pill pill-life">${esc(life)}</span> ${tradeStatusPill(t)} ${outcomePill(t.outcome, t)} ${protectedTxt}</div>
      </div>
      <div class="trade-pnl-stack ${pnlCls}">
        <div class="trade-pnl pnl-live">${pnl != null ? fmtPct(pnl) : "—"} <small>raw</small></div>
        ${lev != null ? `<div class="trade-pnl-lev pnl-live">${fmtPct(lev)} <small>20×</small></div>` : ""}
      </div>
    </div>
    ${targetGrid(t)}
    <div class="price-track-wrap">
      <div class="price-track-labels"><span>SL</span><span>${esc(progLabel)}</span><span>TP2</span></div>
      <div class="price-track-now">Now ${fmtPrice(t.current_price)} · ${pct.toFixed(0)}% toward TP2</div>
      <div class="price-track"><div class="price-track-fill" style="width:${pct}%"></div><div class="price-marker" style="left:${pct}%"></div></div>
    </div>
    <p class="trade-foot muted">${esc(delivery.reason || t.sl_status || "")}${t.last_updated_at || t.last_monitored_at ? ` · Updated ${fmtTime(t.last_updated_at || t.last_monitored_at)}` : ""}</p>
  </article>`;
}

function historyRow(c) {
  const raw = c.raw_pnl_pct;
  const lev = c.lev_pnl_pct;
  const rawCls = (raw || 0) >= 0 ? "up" : "down";
  const levCls = (lev || 0) >= 0 ? "up" : "down";
  return `<article class="history-row">
    ${coinAvatar(c)}
    <div class="history-body">
      <div class="history-top">
        <strong>${tradeLink(c)}</strong>
        ${setupBadge(c.setup_tag)}
        ${outcomePill(c.outcome)}
      </div>
      <span class="history-date muted">${fmtTime(c.outcome_recorded_at || c.created_at)}</span>
    </div>
    <div class="history-pnl">
      <span class="${rawCls}">${fmtPct(raw)} <small>raw</small></span>
      <span class="${levCls}">${fmtPct(lev)} <small>20×</small></span>
    </div>
  </article>`;
}

function perfStrip(perf, stats) {
  const p = perf || {};
  const s = stats || {};
  const r7 = p.rolling_7d || {};
  return `<div class="perf-strip glass">
    <div class="perf-cell"><label>Win rate</label><span>${s.winrate_pct != null ? s.winrate_pct + "%" : "—"}</span></div>
    <div class="perf-cell"><label>W / L</label><span>${s.wins ?? 0} / ${s.losses ?? 0}</span></div>
    <div class="perf-cell"><label>TP1 rate</label><span>${p.tp1_hit_rate_pct != null ? p.tp1_hit_rate_pct + "%" : "—"}</span></div>
    <div class="perf-cell"><label>TP2 rate</label><span>${p.tp2_hit_rate_pct != null ? p.tp2_hit_rate_pct + "%" : "—"}</span></div>
    <div class="perf-cell"><label>7d WR</label><span>${r7.winrate_pct != null ? r7.winrate_pct + "%" : "—"}</span></div>
    <a class="perf-more" href="/stats">Full stats →</a>
  </div>`;
}

function statGrid(items) {
  return `<div class="stat-grid">${items
    .map(
      (c) => `<div class="stat-cell-box"><label>${esc(c.label)}</label><div class="v ${c.cls || ""}">${c.val}</div>${c.sub ? `<div class="sub">${c.sub}</div>` : ""}</div>`
    )
    .join("")}</div>`;
}

function heroStrip(reg, scan) {
  return `<section class="hero-strip hero-strip-compact">
    <div class="hero-strip-inner">
      <div class="hero-strip-text">
        <h2>Live trades &amp; scanner</h2>
        <p class="muted">Trade-ready = 9.5+ score with all execution gates passed</p>
      </div>
      <div class="hero-strip-chips">
        <span class="chip ${reg.no_trade ? "warn" : "ok"}">${esc(reg.regime || "—")}</span>
        <span class="chip muted">${scan.approved_count ?? 0} approved · ${fmtTime(scan.finished_at)}</span>
      </div>
    </div>
  </section>`;
}

function noTradePanel() {
  return `<div class="panel-warn">
    <strong>No active trade signal yet</strong>
    <span>Watchlist = scanner monitoring only, not a trade alert.</span>
  </div>`;
}

window.UI = {
  esc,
  fmtTime,
  fmtPrice,
  fmtPct,
  fmtMoney,
  fmtFunding,
  tierLabel,
  displayPill,
  tradeLink,
  signalRow,
  signalRowList,
  topSignalCard,
  tradeCard,
  historyRow,
  perfStrip,
  statGrid,
  heroStrip,
  noTradePanel,
  infoEducationPanel,
  tradeLifecycleStatus,
  coinReasonLine,
  setupBadge,
  targetGrid,
};
