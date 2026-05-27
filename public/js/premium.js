/**
 * Premium UX — browser-only (no extra APIs, no AI).
 * Shared by local app + public website dashboards.
 */
(function (global) {
  const PREF_SOUND = "sh_premium_sound";
  const PREF_NOTIFY = "sh_premium_notify";
  const CACHE_KEY = "sh_payload_cache";

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  const Prefs = {
    soundEnabled() {
      return localStorage.getItem(PREF_SOUND) === "1";
    },
    notifyEnabled() {
      return localStorage.getItem(PREF_NOTIFY) === "1";
    },
    setSound(on) {
      localStorage.setItem(PREF_SOUND, on ? "1" : "0");
    },
    setNotify(on) {
      localStorage.setItem(PREF_NOTIFY, on ? "1" : "0");
    },
  };

  let _audioCtx = null;
  function playTone(kind) {
    if (!Prefs.soundEnabled()) return;
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      if (!_audioCtx) _audioCtx = new Ctx();
      const ctx = _audioCtx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      const freqs = {
        trade: 880,
        tp1: 1174,
        tp2: 1568,
        sl: 220,
      };
      o.frequency.value = freqs[kind] || 660;
      o.type = kind === "sl" ? "sawtooth" : "sine";
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t);
      o.stop(t + 0.26);
    } catch {
      /* ignore */
    }
  }

  async function maybeNotify(title, body) {
    if (!Prefs.notifyEnabled() || !global.Notification) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body, tag: "sniperhunterz" });
    }
  }

  function symKey(t) {
    return ((t.symbol_display || t.symbol || "") + "").replace(/-USDT-SWAP/gi, "").toUpperCase();
  }

  function fingerprint(p) {
    if (!p) return "";
    const trades = (p.trade_monitor_panel || p.open_trade_ideas || p.trades || [])
      .map((t) => `${symKey(t)}:${t.outcome}:${t.current_price}`)
      .join("|");
    const top = (p.top_coins || []).slice(0, 3).map((c) => `${c.symbol}:${c.score}`).join("|");
    return `${p.scan?.finished_at || ""}#${trades}#${top}`;
  }

  function detectEvents(prev, next) {
    if (!prev || !next) return;
    const prevTrades = new Map();
    (prev.trade_monitor_panel || prev.open_trade_ideas || []).forEach((t) => {
      prevTrades.set(symKey(t), (t.outcome || "").toLowerCase());
    });
    (next.trade_monitor_panel || next.open_trade_ideas || []).forEach((t) => {
      const k = symKey(t);
      const o = (t.outcome || "").toLowerCase();
      const po = prevTrades.get(k);
      if (!po && (o === "active" || o === "pending")) {
        playTone("trade");
        maybeNotify("New live trade", `${k} entered`);
      } else if (po !== o) {
        if (o === "tp1_hit") {
          playTone("tp1");
          maybeNotify("TP1 hit", k);
        } else if (o === "tp2_hit") {
          playTone("tp2");
          maybeNotify("TP2 hit", k);
        } else if (o === "sl_hit") {
          playTone("sl");
          maybeNotify("SL hit", k);
        }
      }
    });
  }

  function cacheLoad() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function cacheSave(p) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), p }));
    } catch {
      /* quota */
    }
  }

  function pctBar(label, pct, cls) {
    const v = Math.min(100, Math.max(0, Number(pct) || 0));
    return `<div class="viz-bar-row"><span class="viz-bar-lbl">${esc(label)}</span><div class="viz-bar-track"><div class="viz-bar-fill ${cls || ""}" style="width:${v}%"></div></div><span class="viz-bar-val">${v.toFixed(0)}%</span></div>`;
  }

  function regimeMeter(regime) {
    const r = (regime?.regime || "—").toUpperCase();
    const btc = Number(regime?.btc_change_24h);
    const oi = Number(regime?.btc_oi_change_4h);
    const squeeze = Number(regime?.market_squeeze_pct ?? regime?.squeeze);
    let level = 50;
    if (r.includes("BULL")) level = 78;
    else if (r.includes("CHOP")) level = 42;
    else if (r.includes("BEAR")) level = 22;
    if (regime?.no_trade) level = Math.min(level, 28);
    const btcVal = Number.isFinite(btc) ? `${btc >= 0 ? "+" : ""}${btc.toFixed(2)}%` : "—";
    const oiVal = Number.isFinite(oi) ? `${oi >= 0 ? "+" : ""}${oi.toFixed(1)}%` : "—";
    const btcCls = Number.isFinite(btc) && btc < 0 ? "down" : Number.isFinite(btc) && btc > 0 ? "up" : "";
    const oiCls = Number.isFinite(oi) && oi < 0 ? "down" : Number.isFinite(oi) && oi > 0 ? "up" : "";
    return `<div class="viz-card glass viz-card-regime">
      <label class="viz-title">Regime meter</label>
      <div class="regime-meter" role="presentation" aria-hidden="true"><div class="regime-meter-fill" style="width:${level}%"></div></div>
      <div class="regime-regime-row">
        <span class="chip ${regime?.no_trade ? "warn" : "ok"}">${esc(r)}</span>
      </div>
      <div class="regime-stats">
        <div class="regime-stat">
          <span class="regime-stat-lbl">BTC 24h</span>
          <span class="regime-stat-val ${btcCls}">${btcVal}</span>
        </div>
        <div class="regime-stat">
          <span class="regime-stat-lbl">OI 4h</span>
          <span class="regime-stat-val ${oiCls}">${oiVal}</span>
        </div>
      </div>
      ${Number.isFinite(squeeze) ? `<div class="regime-squeeze">${pctBar("Squeeze", Math.min(100, squeeze * 10), "squeeze")}</div>` : ""}
    </div>`;
  }

  function marketBreadth(coins) {
    const rows = coins || [];
    let up = 0;
    let down = 0;
    rows.forEach((c) => {
      const ch = Number(c.price_change_24h);
      if (!Number.isFinite(ch)) return;
      if (ch >= 0) up += 1;
      else down += 1;
    });
    const total = up + down || 1;
    const upPct = (100 * up) / total;
    return `<div class="viz-card glass">
      <label class="viz-title">Market breadth</label>
      ${pctBar("24h up", upPct, "up")}
      <p class="viz-foot muted">${up} up · ${down} down (top ${rows.length})</p>
    </div>`;
  }

  function fundingHeat(coins) {
    const vals = (coins || [])
      .map((c) => ({ sym: symKey(c), fr: Number(c.funding_rate) }))
      .filter((x) => Number.isFinite(x.fr));
    if (!vals.length) return `<div class="viz-card glass"><label class="viz-title">Funding heat</label><p class="muted">No funding in payload</p></div>`;
    const max = Math.max(...vals.map((v) => Math.abs(v.fr)), 0.00001);
    const bars = vals
      .slice(0, 8)
      .map((v) => {
        const w = (Math.abs(v.fr) / max) * 100;
        const cls = v.fr >= 0 ? "up" : "down";
        return `<div class="fund-row"><span>${esc(v.sym)}</span><div class="fund-track"><div class="fund-fill ${cls}" style="width:${w}%"></div></div></div>`;
      })
      .join("");
    return `<div class="viz-card glass"><label class="viz-title">Funding heat</label>${bars}</div>`;
  }

  function oiDominance(coins) {
    const rows = (coins || [])
      .map((c) => ({
        sym: symKey(c),
        oi: Number(c.aggregate_oi ?? c.open_interest) || 0,
      }))
      .filter((x) => x.oi > 0)
      .sort((a, b) => b.oi - a.oi)
      .slice(0, 6);
    const sum = rows.reduce((a, b) => a + b.oi, 0) || 1;
    const bars = rows
      .map((r) => pctBar(r.sym, (100 * r.oi) / sum, "oi"))
      .join("");
    return `<div class="viz-card glass"><label class="viz-title">OI share (top)</label>${bars || '<p class="muted">—</p>'}</div>`;
  }

  function winrateMini(stats, perf) {
    const wr = Number(stats?.winrate_pct ?? perf?.totals?.winrate_pct);
    const wins = stats?.wins ?? perf?.totals?.wins ?? 0;
    const losses = stats?.losses ?? perf?.totals?.losses ?? 0;
    const prot = stats?.protected ?? perf?.totals?.protected ?? 0;
    return `<div class="viz-card glass">
      <label class="viz-title">Win rate</label>
      ${pctBar("Decided", Number.isFinite(wr) ? wr : 0, "wr")}
      <p class="viz-foot muted">W ${wins} · L ${losses} · P ${prot}</p>
    </div>`;
  }

  function tpDistribution(stats, perf) {
    const s = stats || perf?.totals || {};
    const wins = Number(s.wins) || 0;
    const prot = Number(s.protected) || 0;
    const losses = Number(s.losses) || 0;
    const exp = Number(s.expired) || 0;
    const total = wins + prot + losses + exp || 1;
    return `<div class="viz-card glass">
      <label class="viz-title">Outcome mix</label>
      ${pctBar("TP2", (100 * wins) / total, "up")}
      ${pctBar("Protected", (100 * prot) / total, "prot")}
      ${pctBar("SL", (100 * losses) / total, "down")}
    </div>`;
  }

  function scannerHeatmap(coins) {
    const rows = (coins || []).slice(0, 10);
    if (!rows.length) return "";
    const metrics = [
      { key: "score", label: "Score", fn: (c) => Number(c.score) },
      { key: "oi4", label: "OI 4h", fn: (c) => Number(c.oi_change_4h) },
      { key: "p24", label: "24h", fn: (c) => Number(c.price_change_24h) },
      { key: "fr", label: "FR", fn: (c) => Number(c.funding_rate) * (Math.abs(Number(c.funding_rate)) < 0.05 ? 100 : 1) },
      { key: "elig", label: "Ready", fn: (c) => (c.eligible_for_trade ? 1 : 0) },
    ];
    const maxMin = {};
    metrics.forEach((m) => {
      const vals = rows.map(m.fn).filter(Number.isFinite);
      maxMin[m.key] = { max: Math.max(...vals, 0.01), min: Math.min(...vals, 0) };
    });
    function heatClass(v, min, max, invert) {
      const t = (v - min) / (max - min || 1);
      const x = invert ? 1 - t : t;
      if (x > 0.66) return "heat-high";
      if (x > 0.33) return "heat-mid";
      return "heat-low";
    }
    let html = `<div class="heatmap-wrap glass"><label class="viz-title">Scanner heatmap</label><table class="heatmap"><thead><tr><th>Coin</th>`;
    metrics.forEach((m) => {
      html += `<th>${esc(m.label)}</th>`;
    });
    html += `</tr></thead><tbody>`;
    rows.forEach((c) => {
      html += `<tr><td>${esc(symKey(c))}</td>`;
      metrics.forEach((m) => {
        const v = m.fn(c);
        const mm = maxMin[m.key];
        const cls = Number.isFinite(v)
          ? heatClass(v, mm.min, mm.max, m.key === "fr")
          : "heat-na";
        html += `<td class="heat-cell ${cls}" title="${esc(String(v))}">${Number.isFinite(v) ? (m.key === "elig" ? (v ? "✓" : "—") : v.toFixed(m.key === "score" ? 1 : 2)) : "—"}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  function vizDashboard(p) {
    const coins = p.top_coins || [];
    const stats = p.stats || p.analytics?.trade_stats || {};
    const perf = p.performance || p.analytics || {};
    return `<div class="viz-grid">${regimeMeter(p.regime)}${marketBreadth(coins)}${oiDominance(coins)}${fundingHeat(coins)}${winrateMini(stats, perf)}${tpDistribution(stats, perf)}</div>${scannerHeatmap(coins)}`;
  }

  function prefsBarHtml() {
    return `<div class="prefs-bar glass" id="premiumPrefs">
      <label class="pref-toggle"><input type="checkbox" id="prefSound" /> Sound alerts</label>
      <label class="pref-toggle"><input type="checkbox" id="prefNotify" /> Browser notifications</label>
    </div>`;
  }

  function bindPrefs(root) {
    const bar = (root || document).querySelector("#premiumPrefs");
    if (!bar) return;
    const snd = bar.querySelector("#prefSound");
    const ntf = bar.querySelector("#prefNotify");
    if (snd) {
      snd.checked = Prefs.soundEnabled();
      snd.onchange = () => Prefs.setSound(snd.checked);
    }
    if (ntf) {
      ntf.checked = Prefs.notifyEnabled();
      ntf.onchange = async () => {
        Prefs.setNotify(ntf.checked);
        if (ntf.checked && Notification?.permission === "default") {
          await Notification.requestPermission();
        }
      };
    }
  }

  function skeletonDashboard() {
    return `<div class="skeleton-grid">${Array(6)
      .fill('<div class="skeleton-block"></div>')
      .join("")}${Array(4)
      .fill('<div class="skeleton-row"></div>')
      .join("")}</div>`;
  }

  function tvSymbol(coin) {
    const key = symKey(coin);
    return `OKX:${key}USDT.P`;
  }

  /** Full chart on tradingview.com (new tab only — site blocks iframes). */
  function chartUrl(coin) {
    const sym = encodeURIComponent(tvSymbol(coin));
    return `https://www.tradingview.com/chart/?symbol=${sym}`;
  }

  /** Embeddable widget host (allowed in iframe). */
  function chartEmbedUrl(coin) {
    const sym = tvSymbol(coin);
    const q = new URLSearchParams({
      symbol: sym,
      interval: "60",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: "false",
      hide_top_toolbar: "0",
      hide_legend: "0",
      saveimage: "0",
      utm_source: typeof location !== "undefined" ? location.host || "sniperhunterz" : "sniperhunterz",
      utm_medium: "widget",
      utm_campaign: "chart",
    });
    return `https://s.tradingview.com/widgetembed/?${q.toString()}`;
  }

  function tvButton(coin) {
    const embed = chartEmbedUrl(coin);
    const external = chartUrl(coin);
    const label = symKey(coin);
    return `<button type="button" class="btn-tv" data-tv-embed="${esc(embed)}" data-tv-external="${esc(external)}" data-tv-label="${esc(label)}" title="TradingView chart">TV</button>`;
  }

  function ensureTvModal() {
    let m = document.getElementById("tvModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "tvModal";
    m.className = "tv-modal hidden";
    m.innerHTML = `<div class="tv-modal-backdrop"></div><div class="tv-modal-panel glass">
      <div class="tv-modal-head">
        <strong id="tvModalTitle">Chart</strong>
        <div class="tv-modal-actions">
          <a class="btn-tv-ext link-chart" id="tvModalOpenExt" href="#" target="_blank" rel="noopener noreferrer">Open on TradingView ↗</a>
          <button type="button" class="btn btn-ghost btn-sm" id="tvModalClose">Close</button>
        </div>
      </div>
      <iframe id="tvModalFrame" title="TradingView chart" loading="lazy" allow="fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <p class="tv-modal-fallback muted hidden" id="tvModalFallback">Chart preview unavailable — use <a id="tvModalFallbackLink" href="#" target="_blank" rel="noopener noreferrer">Open on TradingView ↗</a></p>
    </div>`;
    document.body.appendChild(m);
    m.querySelector(".tv-modal-backdrop")?.addEventListener("click", closeTvModal);
    m.querySelector("#tvModalClose")?.addEventListener("click", closeTvModal);
    global.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTvModal();
    });
    return m;
  }

  function openTvModal(embedUrl, externalUrl, label) {
    const m = ensureTvModal();
    const f = document.getElementById("tvModalFrame");
    const ext = document.getElementById("tvModalOpenExt");
    const fb = document.getElementById("tvModalFallback");
    const fbLink = document.getElementById("tvModalFallbackLink");
    const title = document.getElementById("tvModalTitle");
    if (title) title.textContent = label ? `${label} · TradingView` : "TradingView";
    if (ext) ext.href = externalUrl || "#";
    if (fbLink) fbLink.href = externalUrl || "#";
    if (fb) fb.classList.add("hidden");
    if (f) {
      f.classList.remove("hidden");
      f.src = "about:blank";
      requestAnimationFrame(() => {
        f.src = embedUrl || externalUrl;
      });
      f.onerror = () => {
        f.classList.add("hidden");
        fb?.classList.remove("hidden");
      };
    }
    m.classList.remove("hidden");
  }

  function closeTvModal() {
    const m = document.getElementById("tvModal");
    const f = document.getElementById("tvModalFrame");
    if (f) f.src = "about:blank";
    m?.classList.add("hidden");
  }

  function bindTvButtons(root) {
    (root || document).querySelectorAll(".btn-tv").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const embed = btn.getAttribute("data-tv-embed");
        const external = btn.getAttribute("data-tv-external");
        const legacy = btn.getAttribute("data-tv-url");
        const label = btn.getAttribute("data-tv-label") || "";
        if (embed) {
          openTvModal(embed, external || legacy, label);
        } else if (external || legacy) {
          global.open(external || legacy, "_blank", "noopener,noreferrer");
        }
      };
    });
  }

  function animateProgressBars(root) {
    (root || document).querySelectorAll(".price-track-fill").forEach((el) => {
      const w = el.style.width;
      el.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.width = w;
        });
      });
    });
  }

  function setupLogo() {
    const img = document.querySelector(".brand-logo");
    const fb = document.querySelector(".brand-logo-fallback");
    if (!img) return;
    img.addEventListener("load", () => {
      img.classList.remove("hidden");
      fb?.classList.add("hidden");
    });
    img.addEventListener("error", () => {
      img.classList.add("hidden");
      fb?.classList.remove("hidden");
    });
    if (img.complete && img.naturalWidth > 0) {
      img.classList.remove("hidden");
      fb?.classList.add("hidden");
    }
  }

  global.Premium = {
    Prefs,
    esc,
    playTone,
    detectEvents,
    cacheLoad,
    cacheSave,
    fingerprint,
    vizDashboard,
    prefsBarHtml,
    bindPrefs,
    skeletonDashboard,
    tvButton,
    bindTvButtons,
    openTvModal,
    closeTvModal,
    chartUrl,
    chartEmbedUrl,
    tvSymbol,
    animateProgressBars,
    setupLogo,
  };
})(typeof window !== "undefined" ? window : globalThis);
