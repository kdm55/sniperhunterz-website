/** Sparklines + post-render hooks (matches local app). */

function drawSparkline(canvas, points) {
  if (!canvas || !points?.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const nums = points.map(Number).filter(Number.isFinite);
  if (nums.length < 2) return;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const pad = 4;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(34, 211, 238, 0.12)");
  grad.addColorStop(1, "rgba(52, 211, 153, 0.3)");
  ctx.beginPath();
  nums.forEach((v, i) => {
    const x = pad + (i / Math.max(1, nums.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(w - pad, h);
  ctx.lineTo(pad, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  nums.forEach((v, i) => {
    const x = pad + (i / Math.max(1, nums.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function sparkPointsFromCoin(c) {
  if (Array.isArray(c.sparkline) && c.sparkline.length > 1) {
    const pts = c.sparkline.map(Number).filter(Number.isFinite);
    if (pts.length > 1) return pts;
  }
  const sl = Number(c.stop_loss);
  const entry = Number(c.entry ?? c.price ?? c.current_price);
  const tp1 = Number(c.tp1);
  const tp2 = Number(c.tp2);
  if ([sl, entry, tp1, tp2].every(Number.isFinite)) return [sl, entry, tp1, tp2];
  const chg = Number(c.price_change_24h);
  if (Number.isFinite(entry) && Number.isFinite(chg)) {
    const end = entry * (1 + chg / 100);
    return [entry * 0.99, entry, (entry + end) / 2, end];
  }
  return null;
}

function initSparklines(root, coinMap) {
  const scope = root || document;
  const map = coinMap || window.__sparkCoinMap || {};
  scope.querySelectorAll("canvas.sparkline[data-idx]").forEach((canvas) => {
    const key = canvas.getAttribute("data-idx");
    const c = map[key];
    if (!c) return;
    const pts = sparkPointsFromCoin(c);
    if (pts?.length) drawSparkline(canvas, pts);
  });
}

window.Terminal = { drawSparkline, sparkPointsFromCoin, initSparklines };
